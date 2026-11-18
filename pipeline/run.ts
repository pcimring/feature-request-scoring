import Anthropic from "@anthropic-ai/sdk";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Dataset } from "../shared/types.ts";
import { classifyIssue } from "./classify.ts";
import { CostMeter } from "./cost.ts";
import { fetchOpenIssues, fetchRepoStats } from "./github.ts";
import { runPipeline, type ClassificationRecord } from "./pipeline.ts";
import { scoreRequest } from "./score.ts";
import { setSummary } from "./setSummary.ts";

const ORG = "cloudinary";
const BUDGET_USD = 1.5;
const SCORES_FILE = "public/data/scores.json";
const CLASS_FILE = "data/classifications.json";

function readJson<T>(path: string): T | undefined {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
}

function writeJson(path: string, value: unknown) {
  mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : undefined;

const client = new Anthropic();
const meter = new CostMeter(BUDGET_USD);
const strategy = readFileSync("pipeline/strategy.md", "utf8").split("\nSources:")[0].trim();

const fetched = await fetchOpenIssues(ORG, { token: process.env.GITHUB_TOKEN });
const repoStats = await fetchRepoStats(ORG, [...new Set(fetched.map((i) => i.repo))], { token: process.env.GITHUB_TOKEN });
const issues = fetched.map((i) => ({ ...i, repoStars: repoStats[i.repo].stars, repoForks: repoStats[i.repo].forks }));
let summary: string | undefined;
console.log(`Fetched ${issues.length} open issues from ${ORG}.`);

const result = await runPipeline({
  org: ORG,
  issues,
  classify: (i) => classifyIssue(client, i, meter),
  score: (i, all) => scoreRequest(client, i, strategy, meter, (summary ??= setSummary(all))),
  previous: {
    classifications: readJson<Record<number, ClassificationRecord>>(CLASS_FILE) ?? {},
    dataset: readJson<Dataset>(SCORES_FILE),
  },
  limit,
  now: () => new Date().toISOString(),
  log: (m) => console.log(m),
});

writeJson(SCORES_FILE, result.dataset);
writeJson(CLASS_FILE, result.classifications);

const labels: Record<string, number> = {};
for (const c of Object.values(result.classifications)) labels[c.label] = (labels[c.label] ?? 0) + 1;
console.log("Labels:", labels);
console.log("Counts:", result.dataset.counts, `Scored rows: ${result.dataset.requests.length}`);
console.log(`Spend this run: $${meter.totalUsd.toFixed(3)}`);

if (result.stoppedForBudget) {
  console.error(`Stopped: the $${BUDGET_USD} budget was reached. Partial results were saved.`);
  process.exit(1);
}
