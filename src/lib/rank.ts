import { DEFAULT_WEIGHTS, DIMENSIONS, type Dimension, type ScoredRequest, type Weights } from "../../shared/types.ts";

export type RankedRequest = ScoredRequest & { total: number; rank: number };

export function weightedTotal(r: ScoredRequest, w: Weights): number {
  const weights = DIMENSIONS.some((d) => w[d] > 0) ? w : DEFAULT_WEIGHTS;
  let sum = 0;
  let weightSum = 0;
  for (const d of DIMENSIONS) {
    sum += weights[d] * r.scores[d].score;
    weightSum += weights[d];
  }
  return Math.round((sum / weightSum) * 10) / 10;
}

export function rankRequests(rs: ScoredRequest[], w: Weights): RankedRequest[] {
  return rs
    .map((r) => ({ ...r, total: weightedTotal(r, w) }))
    .sort(
      (a, b) =>
        b.total - a.total || b.reactions - a.reactions || a.createdAt.localeCompare(b.createdAt),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export type SortKey = "weighted" | Dimension | "confidence";

const CONFIDENCE_ORDER = { low: 0, medium: 1, high: 2 } as const;

/** Re-orders weighted-ranked requests by one key; ties keep the weighted order. Ranks follow the new order. */
export function sortRequests(ranked: RankedRequest[], key: SortKey): RankedRequest[] {
  if (key === "weighted") return ranked;
  const value = (r: RankedRequest) =>
    key === "confidence" ? -CONFIDENCE_ORDER[r.confidence.level] : r.scores[key].score;
  return [...ranked]
    .sort((a, b) => value(b) - value(a) || a.rank - b.rank)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
