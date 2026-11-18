import { describe, expect, it } from "vitest";
import { CostMeter } from "../pipeline/cost.ts";
import { scoreRequest } from "../pipeline/score.ts";
import type { RawIssue, Score } from "../shared/types.ts";
import { stubClient, userText } from "./stubClient.ts";

const issue: RawIssue = {
  id: 7, number: 7, repo: "cloudinary_dart", title: "Add a Dart server SDK", body: "We need uploads from Dart backends.",
  url: "https://github.com/cloudinary/cloudinary_dart/issues/7", createdAt: "2025-06-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z", reactions: 42, comments: 5, labels: ["enhancement"],
};

const d = (score: number, reason: string) => ({ score, reason });
const output: Score = {
  problem: "Dart backends \u2014 no server SDK",
  scores: {
    reach: d(4, "42 reactions \u2014 strong demand"),
    impact: d(3, "may help retention"),
    urgency: d(2, "no blocker language"),
    fit: d(4, "fits SDK push"),
    feasibility: d(2, "new SDK is large"),
  },
  confidence: { level: "medium", reason: "clear request" },
};

describe("scoreRequest", () => {
  it("uses Opus 5.5 at low effort with default fallbacks", async () => {
    const { client, calls } = stubClient({ parsed_output: output });
    await scoreRequest(client, issue, "Strategy text", new CostMeter(1.5));
    expect(calls[0].model).toBe("claude-opus-5-5");
    expect((calls[0].output_config as { effort: string }).effort).toBe("low");
    expect(calls[0].fallbacks).toBe("default");
    expect(calls[0].betas).toEqual(["server-side-fallback-2026-07-01"]);
  });

  it("sends the strategy summary and the issue's reaction count", async () => {
    const { client, calls } = stubClient({ parsed_output: output });
    await scoreRequest(client, issue, "STRATEGY-MARKER", new CostMeter(1.5));
    expect(userText(calls[0])).toContain("STRATEGY-MARKER");
    expect(userText(calls[0])).toContain("Reactions: 42");
  });

  it("removes em dashes from the problem and every reason", async () => {
    const { client } = stubClient({ parsed_output: output });
    const score = await scoreRequest(client, issue, "s", new CostMeter(1.5));
    expect(score.problem).toBe("Dart backends, no server SDK");
    expect(score.scores.reach.reason).toBe("42 reactions, strong demand");
    expect(JSON.stringify(score)).not.toContain("\u2014");
  });

  it("throws when the output did not parse", async () => {
    const { client } = stubClient({ parsed_output: null });
    await expect(scoreRequest(client, issue, "s", new CostMeter(1.5))).rejects.toThrow();
  });

  it("throws on a refusal", async () => {
    const { client } = stubClient({ stop_reason: "refusal", parsed_output: null });
    await expect(scoreRequest(client, issue, "s", new CostMeter(1.5))).rejects.toThrow(/refused/);
  });
});
