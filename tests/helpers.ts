import type { Dimension, ScoredRequest } from "../shared/types.ts";

let nextId = 1;

export function makeRequest(
  scores: Partial<Record<Dimension, number>> = {},
  extra: Partial<ScoredRequest> = {},
): ScoredRequest {
  const id = nextId++;
  const s = (d: Dimension) => ({ score: (scores[d] ?? 3) as 1 | 2 | 3 | 4 | 5, reason: `${d} reason` });
  return {
    id,
    number: id,
    repo: "cloudinary_npm",
    title: `Request ${id}`,
    url: `https://github.com/cloudinary/cloudinary_npm/issues/${id}`,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    reactions: 0,
    comments: 0,
    problem: `Problem ${id}`,
    scores: { reach: s("reach"), impact: s("impact"), urgency: s("urgency"), fit: s("fit"), feasibility: s("feasibility") },
    confidence: { level: "medium", reason: "enough detail" },
    ...extra,
  };
}
