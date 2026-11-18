import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS } from "../shared/types.ts";
import { rankRequests, weightedTotal } from "../src/lib/rank.ts";
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
