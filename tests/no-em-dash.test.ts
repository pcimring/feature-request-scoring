import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const EM_DASH = "\u2014";

function files(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((f) => files(join(path, f)));
}

describe("house style", () => {
  const targets = ["src", "shared", "pipeline", "tests", "README.md", "index.html", "public/data/scores.json"].flatMap(files);

  it.each(targets)("%s has no em dash", (file) => {
    expect(readFileSync(file, "utf8").includes(EM_DASH)).toBe(false);
  });
});
