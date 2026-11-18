import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS } from "../shared/types.ts";
import { rankRequests, sortRequests, weightedTotal } from "../src/lib/rank.ts";
import { makeRequest } from "./helpers.ts";

describe("weightedTotal", () => {
  it("averages the five scores with equal weights", () => {
    const r = makeRequest({ reach: 5, impact: 4, urgency: 3, fit: 2, feasibility: 1 });
    expect(weightedTotal(r, DEFAULT_WEIGHTS)).toBe(3);
  });

  it("falls back to equal weights when every weight is 0", () => {
    const r = makeRequest({ reach: 5, impact: 4, urgency: 4, fit: 2, feasibility: 1 });
    const zero = { reach: 0, impact: 0, urgency: 0, fit: 0, feasibility: 0 };
    expect(weightedTotal(r, zero)).toBe(weightedTotal(r, DEFAULT_WEIGHTS));
    expect(Number.isNaN(weightedTotal(r, zero))).toBe(false);
  });

  it("rounds to one decimal", () => {
    const r = makeRequest({ reach: 5, impact: 5, urgency: 4, fit: 4, feasibility: 4 });
    expect(weightedTotal(r, { ...DEFAULT_WEIGHTS, reach: 10 })).toBe(4.5);
  });
});

describe("rankRequests", () => {
  it("puts a high-impact request first when impact is weighted up", () => {
    const highReach = makeRequest({ reach: 5, impact: 1 });
    const highImpact = makeRequest({ reach: 1, impact: 5 });
    const ranked = rankRequests([highReach, highImpact], { ...DEFAULT_WEIGHTS, impact: 10 });
    expect(ranked[0].id).toBe(highImpact.id);
  });

  it("breaks ties by reactions, then by older createdAt", () => {
    const older = makeRequest({}, { reactions: 2, createdAt: "2025-01-01T00:00:00Z" });
    const newer = makeRequest({}, { reactions: 2, createdAt: "2026-06-01T00:00:00Z" });
    const popular = makeRequest({}, { reactions: 9 });
    const ranked = rankRequests([newer, older, popular], DEFAULT_WEIGHTS);
    expect(ranked.map((r) => r.id)).toEqual([popular.id, older.id, newer.id]);
  });

  it("numbers ranks from 1 consecutively and carries the total", () => {
    const ranked = rankRequests([makeRequest(), makeRequest(), makeRequest()], DEFAULT_WEIGHTS);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(ranked[0].total).toBe(3);
  });
});

describe("sortRequests", () => {
  it("orders by one dimension and breaks ties by weighted total", () => {
    const a = makeRequest({ reach: 4, impact: 1 });
    const b = makeRequest({ reach: 4, impact: 5 });
    const c = makeRequest({ reach: 5, impact: 1 });
    const out = sortRequests(rankRequests([a, b, c], DEFAULT_WEIGHTS), "reach");
    expect(out.map((r) => r.id)).toEqual([c.id, b.id, a.id]);
    expect(out.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("orders by confidence from low to high", () => {
    const hi = makeRequest({}, { confidence: { level: "high", reason: "" } });
    const lo = makeRequest({}, { confidence: { level: "low", reason: "" } });
    const out = sortRequests(rankRequests([hi, lo], DEFAULT_WEIGHTS), "confidence");
    expect(out.map((r) => r.id)).toEqual([lo.id, hi.id]);
  });

  it("keeps the weighted order for 'weighted'", () => {
    const ranked = rankRequests([makeRequest({ reach: 1 }), makeRequest({ reach: 5 })], DEFAULT_WEIGHTS);
    expect(sortRequests(ranked, "weighted")).toEqual(ranked);
  });
});
