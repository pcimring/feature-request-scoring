import { describe, expect, it } from "vitest";
import { parseLimit } from "../pipeline/args.ts";

describe("parseLimit", () => {
  it("is undefined when --limit is not given", () => {
    expect(parseLimit(["node", "run.ts"])).toBeUndefined();
  });

  it("reads a positive whole number", () => {
    expect(parseLimit(["node", "run.ts", "--limit", "5"])).toBe(5);
  });

  it("stops with a clear error when the number is missing or not a positive whole number", () => {
    for (const bad of [[], ["abc"], ["0"], ["-2"], ["2.5"]]) {
      expect(() => parseLimit(["node", "run.ts", "--limit", ...bad])).toThrow(/--limit needs a positive whole number/);
    }
  });
});
