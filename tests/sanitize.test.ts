import { describe, expect, it } from "vitest";
import { cleanText } from "../pipeline/sanitize.ts";

describe("cleanText", () => {
  it("replaces a spaced em dash with a comma", () => {
    expect(cleanText("fast — and cheap")).toBe("fast, and cheap");
  });

  it("replaces an unspaced em dash and trims", () => {
    expect(cleanText("  fast—cheap ")).toBe("fast, cheap");
  });
});
