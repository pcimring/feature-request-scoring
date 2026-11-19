import { describe, expect, it } from "vitest";
import { calibrateScores } from "../pipeline/calibrate.ts";
import { CostMeter } from "../pipeline/cost.ts";
import { makeRequest } from "./helpers.ts";
import { stubClient, userText } from "./stubClient.ts";

const s = (score: number, reason: string) => ({ score, reason });

describe("calibrateScores", () => {
  it("sends every request in one call and applies the new Reach, Impact and Urgency", async () => {
    const a = makeRequest({ reach: 2, impact: 2, urgency: 1, fit: 4 }, { problem: "Problem A" });
    const b = makeRequest({ reach: 2 }, { problem: "Problem B" });
    const { client, calls } = stubClient({
      parsed_output: {
        items: [{ id: a.id, reach: s(5, "most reactions in set \u2014 by far"), impact: s(3, "i"), urgency: s(4, "u") }],
      },
    });
    const out = await calibrateScores(client, [a, b], new CostMeter(1.5), "claude-haiku-5-5");
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe("claude-haiku-5-5");
    expect(userText(calls[0])).toContain("Problem A");
    expect(userText(calls[0])).toContain("Problem B");
    const newA = out.find((r) => r.id === a.id)!;
    expect(newA.scores.reach).toEqual({ score: 5, reason: "most reactions in set, by far" });
    expect(newA.scores.urgency.score).toBe(4);
    expect(newA.scores.fit.score).toBe(4);
    expect(out.find((r) => r.id === b.id)).toEqual(b);
  });

  it("ignores ids that are not in the set", async () => {
    const a = makeRequest();
    const { client } = stubClient({
      parsed_output: { items: [{ id: 999999, reach: s(5, "r"), impact: s(5, "i"), urgency: s(5, "u") }] },
    });
    expect(await calibrateScores(client, [a], new CostMeter(1.5), "claude-haiku-5-5")).toEqual([a]);
  });

  it("throws when the output did not parse", async () => {
    const { client } = stubClient({ parsed_output: null });
    await expect(calibrateScores(client, [makeRequest()], new CostMeter(1.5), "claude-haiku-5-5")).rejects.toThrow();
  });
});

describe("calibration input", () => {
  it("includes the people count per request", async () => {
    const a = makeRequest({}, { people: 21 });
    const { client, calls } = stubClient({ parsed_output: { items: [] } });
    await calibrateScores(client, [a], new CostMeter(1.5), "claude-haiku-5-5");
    expect(userText(calls[0])).toContain("21 people");
  });
});

describe("calibration prompt", () => {
  it("asks for digits even at the start of a reason, and bans superlatives by name", async () => {
    const { client, calls } = stubClient({ parsed_output: { items: [] } });
    await calibrateScores(client, [makeRequest()], new CostMeter(1.5), "claude-haiku-5-5");
    const system = String(calls[0].system);
    expect(system).toMatch(/"2 people", not "Two people"/);
    for (const word of ["largest", "strongest", "most", "biggest"]) expect(system).toContain(`"${word}"`);
  });
});
