import { describe, expect, it } from "vitest";
import { cleanText } from "../pipeline/sanitize.ts";

describe("cleanText", () => {
  it("replaces a spaced em dash with a comma", () => {
    expect(cleanText("fast \u2014 and cheap")).toBe("fast, and cheap");
  });

  it("replaces an unspaced em dash and trims", () => {
    expect(cleanText("  fast\u2014cheap ")).toBe("fast, cheap");
  });
});

describe("cleanText: counts as digits", () => {
  it("turns spelled-out counts into digits, at the start of a reason too", () => {
    expect(cleanText("Two people with four comments and no reactions; 105-star SDK audience.")).toBe(
      "2 people with 4 comments and no reactions; 105-star SDK audience.",
    );
  });

  it("handles compound numbers and singular nouns", () => {
    expect(cleanText("Twenty-one people with thirty-two comments, one reaction and one comment.")).toBe(
      "21 people with 32 comments, 1 reaction and 1 comment.",
    );
  });

  it("leaves words that are not counts alone", () => {
    expect(cleanText("Reads as one user's edge case; no one else asked, and it is one of a kind.")).toBe(
      "Reads as one user's edge case; no one else asked, and it is one of a kind.",
    );
  });
});
