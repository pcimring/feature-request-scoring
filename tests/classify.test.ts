import { describe, expect, it } from "vitest";
import { classifyIssue } from "../pipeline/classify.ts";
import { CostMeter } from "../pipeline/cost.ts";
import type { RawIssue } from "../shared/types.ts";
import { stubClient, userText } from "./stubClient.ts";

const issue: RawIssue = {
  id: 1, number: 1, repo: "cloudinary_npm", title: "Support Deno", body: "Please add Deno support.",
  url: "https://github.com/cloudinary/cloudinary_npm/issues/1", createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z", reactions: 3, comments: 1, labels: [],
};

describe("classifyIssue", () => {
  it("returns the label from Haiku 5.5 and sends the issue text", async () => {
    const { client, calls } = stubClient({ parsed_output: { label: "feature_request", reason: "asks for Deno" } });
    const meter = new CostMeter(1.5);
    const result = await classifyIssue(client, issue, meter);
    expect(result.label).toBe("feature_request");
    expect(calls[0].model).toBe("claude-haiku-5-5");
    expect(userText(calls[0])).toContain("Support Deno");
    expect(userText(calls[0])).toContain("Please add Deno support.");
    expect(meter.totalUsd).toBeGreaterThan(0);
  });

  it("throws on a refusal", async () => {
    const { client } = stubClient({ stop_reason: "refusal", parsed_output: null });
    await expect(classifyIssue(client, issue, new CostMeter(1.5))).rejects.toThrow();
  });

  it("throws when the output did not parse", async () => {
    const { client } = stubClient({ parsed_output: null });
    await expect(classifyIssue(client, issue, new CostMeter(1.5))).rejects.toThrow();
  });
});
