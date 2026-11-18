// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { calibrateScores } from "../pipeline/calibrate.ts";
import { CostMeter } from "../pipeline/cost.ts";
import { runPipeline } from "../pipeline/pipeline.ts";
import { scoreRequest } from "../pipeline/score.ts";
import { TARGET } from "../pipeline/target.ts";
import App from "../src/App.tsx";
import { fixtureDataset } from "./fixtures/dataset.ts";
import { makeRequest } from "./helpers.ts";
import { stubClient } from "./stubClient.ts";

afterEach(cleanup);

const d = { score: 3, reason: "r" };
const score = {
  problem: "p",
  scores: { reach: d, impact: d, urgency: d, fit: d, feasibility: d },
  confidence: { level: "medium" as const, reason: "r" },
  flags: [],
};
const systemText = (call: { system?: unknown }) => JSON.stringify(call.system);

describe("one target setting", () => {
  it("names the org, the company and the strategy file in one place", () => {
    expect(TARGET).toEqual({ org: "cloudinary", company: "Cloudinary", strategyFile: "pipeline/strategy.md" });
  });

  it("keeps the company name out of the scoring and calibration prompts", async () => {
    const issue = { id: 1, number: 1, repo: "r", title: "t", body: "b", url: "u", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z", reactions: 0, comments: 0, labels: [] };
    const s = stubClient({ parsed_output: { ...score, checks: undefined } });
    await scoreRequest(s.client, issue, "strategy", new CostMeter(1.5)).catch(() => {});
    const c = stubClient({ parsed_output: { items: [] } });
    await calibrateScores(c.client, [makeRequest()], new CostMeter(1.5), "claude-haiku-5-5");
    expect(systemText(s.calls[0])).not.toMatch(/cloudinary/i);
    expect(systemText(c.calls[0])).not.toMatch(/cloudinary/i);
  });

  it("writes the company name into the dataset", async () => {
    const { dataset } = await runPipeline({
      org: "acme", company: "Acme", issues: [], classify: async () => ({ label: "bug", reason: "r" }), score: async () => score, now: () => "2026-11-19T08:00:00Z",
    });
    expect(dataset).toMatchObject({ org: "acme", company: "Acme" });
  });

  it("builds the page text from the dataset's org and company", () => {
    const data = { ...fixtureDataset(), org: "acme", company: "Acme" };
    render(<App dataset={data} />);
    // Everything but the request rows (whose repo names are data) is page copy.
    const copy = [".header", ".sliders", ".about", ".footer"].map((s) => document.querySelector(s)?.textContent).join(" ");
    expect(copy).toMatch(/Acme/);
    expect(copy).not.toMatch(/cloudinary/i);
    expect(screen.getByRole("link", { name: /github\.com\/acme$/ })).toHaveAttribute("href", "https://github.com/acme");
  });
});
