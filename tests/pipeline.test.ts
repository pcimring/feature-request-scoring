import { describe, expect, it } from "vitest";
import { BudgetExceededError } from "../pipeline/cost.ts";
import { runPipeline, type ClassificationRecord } from "../pipeline/pipeline.ts";
import type { Classification, Dataset, RawIssue, Score } from "../shared/types.ts";

function raw(id: number, extra: Partial<RawIssue> = {}): RawIssue {
  return {
    id, number: id, repo: "cloudinary_npm", title: `T${id}`, body: "b", url: `https://x/${id}`,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z", reactions: 1, comments: 0, labels: [],
    ...extra,
  };
}

const d = { score: 3, reason: "r" };
function score(level: "low" | "medium" | "high" = "medium"): Score {
  return {
    problem: "p",
    scores: { reach: d, impact: d, urgency: d, fit: d, feasibility: d },
    confidence: { level, reason: "c" },
  };
}

const feature: Classification = { label: "feature_request", reason: "asks for it" };
const bug: Classification = { label: "bug", reason: "broken" };
const now = () => "2026-11-19T08:00:00Z";

function recorder<T>(fn: (i: RawIssue) => T) {
  const seen: number[] = [];
  return { seen, call: async (i: RawIssue) => { seen.push(i.id); return fn(i); } };
}

describe("runPipeline", () => {
  it("runs the comparative pass over all rows when something new was scored", async () => {
    const seen: number[][] = [];
    const { dataset } = await runPipeline({
      org: "cloudinary", issues: [raw(1), raw(2)], classify: async () => feature, score: async () => score(), now,
      calibrate: async (rs) => { seen.push(rs.map((r) => r.id).sort()); return rs.map((r) => ({ ...r, problem: "calibrated" })); },
    });
    expect(seen).toEqual([[1, 2]]);
    expect(dataset.requests.every((r) => r.problem === "calibrated")).toBe(true);
  });

  it("skips the comparative pass when nothing new was scored", async () => {
    let called = false;
    await runPipeline({
      org: "cloudinary", issues: [raw(1)], classify: async () => bug, score: async () => score(), now,
      calibrate: async (rs) => { called = true; return rs; },
    });
    expect(called).toBe(false);
  });

  it("keeps the uncalibrated scores when the comparative pass fails", async () => {
    const { dataset } = await runPipeline({
      org: "cloudinary", issues: [raw(1)], classify: async () => feature, score: async () => score(), now,
      calibrate: async () => { throw new Error("boom"); },
    });
    expect(dataset.requests[0].problem).toBe("p");
    expect(dataset.counts.failed).toBe(0);
  });

  it("enriches feature requests before scoring and keeps the enriched fields", async () => {
    let seenPeople: number | undefined;
    const { dataset } = await runPipeline({
      org: "cloudinary", issues: [raw(1)], classify: async () => feature, now,
      enrich: async (i) => ({ ...i, people: 21 }),
      score: async (i) => { seenPeople = i.people; return score(); },
    });
    expect(seenPeople).toBe(21);
    expect(dataset.requests[0].people).toBe(21);
  });

  it("keeps a request unenriched when enrichment fails", async () => {
    const { dataset } = await runPipeline({
      org: "cloudinary", issues: [raw(1)], classify: async () => feature, score: async () => score(), now,
      enrich: async () => { throw new Error("403"); },
    });
    expect(dataset.requests).toHaveLength(1);
    expect(dataset.requests[0].people).toBeUndefined();
  });

  it("passes the full set of feature requests to the scorer", async () => {
    const sets: number[][] = [];
    await runPipeline({
      org: "cloudinary", issues: [raw(1), raw(2), raw(3)], classify: async (i) => (i.id === 2 ? bug : feature),
      score: async (_i, all) => { sets.push(all.map((a) => a.id)); return score(); }, now,
    });
    expect(sets[0]).toEqual([1, 3]);
  });

  it("scores only feature requests and counts issues and feature requests", async () => {
    const classify = recorder((i) => (i.id === 2 ? bug : feature));
    const scorer = recorder(() => score());
    const { dataset } = await runPipeline({ org: "cloudinary", issues: [raw(1), raw(2), raw(3)], classify: classify.call, score: scorer.call, now });
    expect(scorer.seen.sort()).toEqual([1, 3]);
    expect(dataset.counts).toEqual({ openIssues: 3, featureRequests: 2, needsReview: 0, failed: 0 });
    expect(dataset.requests.map((r) => r.id).sort()).toEqual([1, 3]);
    expect(dataset.generatedAt).toBe("2026-11-19T08:00:00Z");
    expect(dataset.org).toBe("cloudinary");
    expect(dataset.requests[0]).not.toHaveProperty("body");
  });

  it("counts low-confidence requests as needing review", async () => {
    const { dataset } = await runPipeline({
      org: "cloudinary", issues: [raw(1), raw(2)], classify: async () => feature,
      score: async (i) => score(i.id === 1 ? "low" : "high"), now,
    });
    expect(dataset.counts.needsReview).toBe(1);
  });

  it("skips a request whose scoring fails and counts it", async () => {
    const { dataset } = await runPipeline({
      org: "cloudinary", issues: [raw(1), raw(2), raw(3)], classify: async () => feature,
      score: async (i) => { if (i.id === 2) throw new Error("refused"); return score(); }, now,
    });
    expect(dataset.requests.map((r) => r.id).sort()).toEqual([1, 3]);
    expect(dataset.counts.failed).toBe(1);
  });

  it("reuses classifications and scores for unchanged issues and redoes changed ones", async () => {
    const prevClass: Record<number, ClassificationRecord> = {
      1: { updatedAt: "2026-02-01T00:00:00Z", ...feature },
      2: { updatedAt: "2025-01-01T00:00:00Z", ...feature },
    };
    const prevData: Dataset = {
      generatedAt: "x", org: "cloudinary", counts: { openIssues: 2, featureRequests: 2, needsReview: 0, failed: 0 },
      requests: [1, 2].map((id) => {
        const { body: _b, labels: _l, ...meta } = raw(id, { updatedAt: id === 1 ? "2026-02-01T00:00:00Z" : "2025-01-01T00:00:00Z" });
        return { ...meta, ...score("high"), problem: `old ${id}` };
      }),
    };
    const classify = recorder(() => feature);
    const scorer = recorder(() => score());
    const { dataset } = await runPipeline({
      org: "cloudinary", issues: [raw(1, { reactions: 9 }), raw(2)], classify: classify.call, score: scorer.call,
      previous: { classifications: prevClass, dataset: prevData }, now,
    });
    expect(classify.seen).toEqual([2]);
    expect(scorer.seen).toEqual([2]);
    const one = dataset.requests.find((r) => r.id === 1)!;
    expect(one.problem).toBe("old 1");
    expect(one.reactions).toBe(9);
  });

  it("drops issues that are no longer open", async () => {
    const prevClass: Record<number, ClassificationRecord> = { 5: { updatedAt: "2026-02-01T00:00:00Z", ...feature } };
    const { dataset, classifications } = await runPipeline({
      org: "cloudinary", issues: [raw(1)], classify: async () => feature, score: async () => score(),
      previous: { classifications: prevClass }, now,
    });
    expect(dataset.requests.map((r) => r.id)).toEqual([1]);
    expect(Object.keys(classifications)).toEqual(["1"]);
  });

  it("stops scoring when the budget is passed and keeps what was scored", async () => {
    let n = 0;
    const result = await runPipeline({
      org: "cloudinary", issues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => raw(i)), classify: async () => feature,
      score: async () => { n++; if (n === 3) throw new BudgetExceededError(2, 1.5); return score(); }, now,
    });
    expect(result.stoppedForBudget).toBe(true);
    expect(n).toBeLessThan(10);
    expect(result.dataset.requests.length).toBe(n - 1);
  });

  it("scores at most `limit` new requests", async () => {
    const scorer = recorder(() => score());
    const { dataset } = await runPipeline({
      org: "cloudinary", issues: [1, 2, 3, 4, 5, 6].map((i) => raw(i)), classify: async () => feature, score: scorer.call, limit: 2, now,
    });
    expect(scorer.seen).toHaveLength(2);
    expect(dataset.counts.featureRequests).toBe(6);
  });

  it("counts a failed classification and skips the issue", async () => {
    const { dataset } = await runPipeline({
      org: "cloudinary", issues: [raw(1), raw(2)], classify: async (i) => { if (i.id === 1) throw new Error("x"); return feature; },
      score: async () => score(), now,
    });
    expect(dataset.counts.failed).toBe(1);
    expect(dataset.requests.map((r) => r.id)).toEqual([2]);
  });
});
