import { describe, expect, it } from "vitest";
import { setSummary } from "../pipeline/setSummary.ts";
import type { RawIssue } from "../shared/types.ts";

const issue = (reactions: number, comments: number, repoStars: number): RawIssue => ({
  id: reactions * 100 + comments, number: 1, repo: "r", title: "t", body: "", url: "u", createdAt: "", updatedAt: "",
  reactions, comments, labels: [], repoStars, repoForks: 0,
});

describe("setSummary", () => {
  it("describes the spread of reactions, comments and repo stars across the set", () => {
    const text = setSummary([issue(0, 1, 10), issue(0, 2, 50), issue(0, 3, 900), issue(10, 13, 400)]);
    expect(text).toContain("4 feature requests");
    expect(text).toContain("3 of 4 have no reactions");
    expect(text).toContain("most reactions: 10");
    expect(text).toContain("median comments: 2.5");
    expect(text).toContain("most comments: 13");
    expect(text).toContain("repository stars range from 10 to 900");
  });
});

describe("setSummary repos", () => {
  it("lists the org's repositories so the model can spot work that already exists elsewhere", () => {
    const text = setSummary([issue(0, 1, 10)], ["cloudinary_npm", "cloudinary-react-native"]);
    expect(text).toContain("Repositories in the org: cloudinary_npm, cloudinary-react-native");
  });
});
