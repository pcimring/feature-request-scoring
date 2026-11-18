import type { Classification, Dataset, RawIssue, Score, ScoredRequest } from "../shared/types.ts";
import { BudgetExceededError } from "./cost.ts";

export type ClassificationRecord = { updatedAt: string } & Classification;

export interface PipelineDeps {
  org: string;
  issues: RawIssue[];
  classify: (i: RawIssue) => Promise<Classification>;
  /** `all` is every feature request in this run, so the scorer can judge each one relative to the set. */
  score: (i: RawIssue, all: RawIssue[]) => Promise<Score>;
  /** Optional comparative pass over every row, run when something new was scored. */
  calibrate?: (rs: ScoredRequest[]) => Promise<ScoredRequest[]>;
  previous?: { classifications: Record<number, ClassificationRecord>; dataset?: Dataset };
  /** Score at most this many new requests (reused scores don't count). */
  limit?: number;
  now: () => string;
  log?: (msg: string) => void;
}

export interface PipelineResult {
  dataset: Dataset;
  classifications: Record<number, ClassificationRecord>;
  stoppedForBudget: boolean;
}

const CONCURRENCY = 4;

/** Runs `work` over `items` with at most CONCURRENCY in flight; stops taking new items once `stop()` is true. */
async function pool<T>(items: T[], stop: () => boolean, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !stop()) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
}

function meta(i: RawIssue): Omit<RawIssue, "body" | "labels"> {
  const { body: _body, labels: _labels, ...rest } = i;
  return rest;
}

export async function runPipeline(deps: PipelineDeps): Promise<PipelineResult> {
  const log = deps.log ?? (() => {});
  const prevClass = deps.previous?.classifications ?? {};
  const prevScores = new Map((deps.previous?.dataset?.requests ?? []).map((r) => [r.id, r]));
  const classifications: Record<number, ClassificationRecord> = {};
  let failed = 0;
  let stoppedForBudget = false;
  const stop = () => stoppedForBudget;

  const onError = (what: string, i: RawIssue, e: unknown) => {
    if (e instanceof BudgetExceededError) {
      stoppedForBudget = true;
      log(e.message);
    } else {
      failed++;
      log(`${what} failed for ${i.repo}#${i.number}: ${(e as Error).message}`);
    }
  };

  await pool(deps.issues, stop, async (i) => {
    const prev = prevClass[i.id];
    if (prev && prev.updatedAt === i.updatedAt) {
      classifications[i.id] = prev;
      return;
    }
    try {
      classifications[i.id] = { updatedAt: i.updatedAt, ...(await deps.classify(i)) };
    } catch (e) {
      onError("Classification", i, e);
    }
  });

  const features = deps.issues.filter((i) => classifications[i.id]?.label === "feature_request");
  let requests: ScoredRequest[] = [];
  let scoredNew = 0;
  const toScore: RawIssue[] = [];
  for (const i of features) {
    const prev = prevScores.get(i.id);
    if (prev && prev.updatedAt === i.updatedAt) requests.push({ ...prev, ...meta(i) });
    else toScore.push(i);
  }

  await pool(toScore.slice(0, deps.limit ?? toScore.length), stop, async (i) => {
    try {
      requests.push({ ...meta(i), ...(await deps.score(i, features)) });
      scoredNew++;
    } catch (e) {
      onError("Scoring", i, e);
    }
  });

  if (deps.calibrate && scoredNew > 0 && !stoppedForBudget) {
    try {
      requests = await deps.calibrate(requests);
    } catch (e) {
      if (e instanceof BudgetExceededError) stoppedForBudget = true;
      log(`Comparative pass failed, keeping the per-request scores: ${(e as Error).message}`);
    }
  }

  return {
    dataset: {
      generatedAt: deps.now(),
      org: deps.org,
      counts: {
        openIssues: deps.issues.length,
        featureRequests: features.length,
        needsReview: requests.filter((r) => r.confidence.level === "low").length,
        failed,
      },
      requests,
    },
    classifications,
    stoppedForBudget,
  };
}
