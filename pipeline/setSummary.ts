import type { RawIssue } from "../shared/types.ts";

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Plain-text description of the whole set, so the model can score each request relative to the others. */
export function setSummary(features: RawIssue[], repos: string[] = []): string {
  const reactions = features.map((f) => f.reactions);
  const comments = features.map((f) => f.comments);
  const stars = features.map((f) => f.repoStars ?? 0);
  return [
    `This set has ${features.length} feature requests.`,
    `Reactions: ${reactions.filter((r) => r === 0).length} of ${features.length} have no reactions; most reactions: ${Math.max(...reactions)}.`,
    `Comments: median comments: ${median(comments)}; most comments: ${Math.max(...comments)}.`,
    `Audience: repository stars range from ${Math.min(...stars)} to ${Math.max(...stars)} (median ${median(stars)}).`,
    ...(repos.length ? [`Repositories in the org: ${repos.join(", ")}`] : []),
  ].join("\n");
}
