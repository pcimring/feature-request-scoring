import type { RawIssue } from "../shared/types.ts";

export const BODY_LIMIT = 4000;
const PER_PAGE = 100;

interface SearchItem {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  repository_url: string;
  created_at: string;
  updated_at: string;
  comments: number;
  reactions?: { total_count: number };
  labels: { name: string }[];
}

function toIssue(i: SearchItem): RawIssue {
  return {
    id: i.id,
    number: i.number,
    repo: i.repository_url.split("/").pop() ?? "",
    title: i.title,
    body: (i.body ?? "").slice(0, BODY_LIMIT),
    url: i.html_url,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    reactions: i.reactions?.total_count ?? 0,
    comments: i.comments,
    labels: i.labels.map((l) => l.name),
  };
}

export async function fetchOpenIssues(
  org: string,
  opts: { token?: string; fetchFn?: typeof fetch } = {},
): Promise<RawIssue[]> {
  const fetchFn = opts.fetchFn ?? fetch;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const issues: RawIssue[] = [];
  for (let page = 1; ; page++) {
    const q = encodeURIComponent(`org:${org} is:issue is:open`).replace(/%20/g, "+");
    const url = `https://api.github.com/search/issues?q=${q}&per_page=${PER_PAGE}&page=${page}`;
    const res = await fetchFn(url, { headers });
    if (res.status !== 200) {
      throw new Error(`GitHub search failed with status ${res.status}: ${await res.text()}`);
    }
    const { items } = (await res.json()) as { items: SearchItem[] };
    issues.push(...items.map(toIssue));
    if (items.length < PER_PAGE) return issues;
  }
}

export async function fetchRepoStats(
  org: string,
  repos: string[],
  opts: { token?: string; fetchFn?: typeof fetch } = {},
): Promise<Record<string, { stars: number; forks: number }>> {
  const fetchFn = opts.fetchFn ?? fetch;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const stats: Record<string, { stars: number; forks: number }> = {};
  for (const repo of repos) {
    const res = await fetchFn(`https://api.github.com/repos/${org}/${repo}`, { headers });
    if (res.status !== 200) throw new Error(`GitHub repo lookup failed for ${repo} with status ${res.status}`);
    const r = (await res.json()) as { stargazers_count: number; forks_count: number };
    stats[repo] = { stars: r.stargazers_count, forks: r.forks_count };
  }
  return stats;
}
