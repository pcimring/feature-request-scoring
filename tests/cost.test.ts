import { describe, expect, it } from "vitest";
import { BudgetExceededError, CostMeter } from "../pipeline/cost.ts";

describe("CostMeter", () => {
  it("prices Haiku 5.5 tokens and stays under the limit", () => {
    const m = new CostMeter(1.5);
    m.add("claude-haiku-5-5", { input_tokens: 100_000, output_tokens: 0 });
    expect(m.totalUsd).toBeCloseTo(0.01, 6);
  });

  it("prices Opus 5.5 output tokens", () => {
    const m = new CostMeter(1.5);
    m.add("claude-opus-5-5", { input_tokens: 0, output_tokens: 50_000 });
    expect(m.totalUsd).toBeCloseTo(1.0, 6);
  });

  it("throws once the total passes the limit", () => {
    const m = new CostMeter(1.5);
    expect(() => m.add("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 0 })).toThrow(
      BudgetExceededError,
    );
    expect(m.totalUsd).toBeCloseTo(4, 6);
  });

  it("throws on a model with no known price", () => {
    const m = new CostMeter(1.5);
    expect(() => m.add("claude-unknown", { input_tokens: 1, output_tokens: 1 })).toThrow(/price/);
  });
});
