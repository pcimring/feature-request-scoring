import type { Dataset } from "../../shared/types.ts";
import { makeRequest } from "../helpers.ts";

export function fixtureDataset(): Dataset {
  const reachy = makeRequest(
    { reach: 5, impact: 1, urgency: 1, fit: 1, feasibility: 1 },
    { problem: "Reachy problem", reactions: 10, repo: "cloudinary_npm", number: 11, url: "https://github.com/cloudinary/cloudinary_npm/issues/11" },
  );
  const impacty = makeRequest(
    { reach: 1, impact: 5, urgency: 1, fit: 1, feasibility: 1 },
    { problem: "Impacty problem", reactions: 2, repo: "cloudinary_java", number: 22, url: "https://github.com/cloudinary/cloudinary_java/issues/22" },
  );
  const vague = makeRequest(
    { reach: 1, impact: 1, urgency: 1, fit: 1, feasibility: 1 },
    { problem: "Vague problem", confidence: { level: "low", reason: "too thin to judge" }, number: 33 },
  );
  return {
    generatedAt: "2026-11-19T08:00:00Z",
    org: "cloudinary",
    counts: { openIssues: 215, featureRequests: 62, needsReview: 16, flagged: 0, failed: 0 },
    requests: [vague, impacty, reachy],
  };
}
