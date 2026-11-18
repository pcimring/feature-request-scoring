import { z } from "zod";

export const DIMENSIONS = ["reach", "impact", "urgency", "fit", "feasibility"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  reach: "Reach",
  impact: "Business Impact",
  urgency: "Urgency",
  fit: "Strategic Fit",
  feasibility: "Feasibility",
};

export interface RawIssue {
  id: number;
  number: number;
  repo: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  reactions: number;
  comments: number;
  labels: string[];
  /** Stars and forks of the issue's repository: a proxy for the size of that SDK's audience. */
  repoStars?: number;
  repoForks?: number;
}

export const ClassificationSchema = z.object({
  label: z.enum(["feature_request", "bug", "question", "other"]),
  reason: z.string(),
});
export type Classification = z.infer<typeof ClassificationSchema>;
export type Label = Classification["label"];

const DimensionScore = z.object({
  score: z.number().int().min(1).max(5),
  reason: z.string(),
});

export const ScoreSchema = z.object({
  problem: z.string(),
  scores: z.object({
    reach: DimensionScore,
    impact: DimensionScore,
    urgency: DimensionScore,
    fit: DimensionScore,
    feasibility: DimensionScore,
  }),
  confidence: z.object({
    level: z.enum(["low", "medium", "high"]),
    reason: z.string(),
  }),
});
export type Score = z.infer<typeof ScoreSchema>;

export type ScoredRequest = Omit<RawIssue, "body" | "labels"> & Score;

export interface Dataset {
  generatedAt: string;
  org: string;
  counts: { openIssues: number; featureRequests: number; needsReview: number; failed: number };
  requests: ScoredRequest[];
}

export type Weights = Record<Dimension, number>;

export const DEFAULT_WEIGHTS: Weights = { reach: 5, impact: 5, urgency: 5, fit: 5, feasibility: 5 };
