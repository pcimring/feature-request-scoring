import type { RawIssue } from "../shared/types.ts";

export const BODY_LIMIT = 4000;
const PER_PAGE = 100;
const RECENT_COMMENTS = 5;
const COMMENT_LIMIT = 600;

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
  user?: { login: string };
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
    author: i.user?.login,
  };
}

/** GitHub search never returns more than this many results for one query. */
const SEARCH_CAP = 1000;

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
    const { items, total_count } = (await res.json()) as { items: SearchItem[]; total_count?: number };
    if (page === 1 && (total_count ?? 0) > SEARCH_CAP) {
      throw new Error(
        `${org} has ${total_count!.toLocaleString("en-US")} open issues, but GitHub search returns at most 1,000. ` +
          "Split the run by repository before scoring this org.",
      );
    }
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

/** One issue thread: distinct people (the author plus every commenter, bots excluded) and the last few human comments. */
export async function fetchThread(
  org: string,
  repo: string,
  number: number,
  author: string | undefined,
  opts: { token?: string; fetchFn?: typeof fetch } = {},
): Promise<{ people: number; recentComments: string[] }> {
  const fetchFn = opts.fetchFn ?? fetch;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const people = new Set<string>(author ? [author] : []);
  const human: string[] = [];
  for (let page = 1; ; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/issues/${number}/comments?per_page=${PER_PAGE}&page=${page}`;
    const res = await fetchFn(url, { headers });
    if (res.status !== 200) throw new Error(`GitHub comments lookup failed for ${repo}#${number} with status ${res.status}`);
    const comments = (await res.json()) as { user: { login: string } | null; created_at?: string; body?: string | null }[];
    for (const c of comments) {
      if (!c.user || c.user.login.endsWith("[bot]")) continue;
      people.add(c.user.login);
      human.push(`${c.user.login} (${(c.created_at ?? "").slice(0, 10)}): ${(c.body ?? "").replace(/\s+/g, " ").trim().slice(0, COMMENT_LIMIT)}`);
    }
    if (comments.length < PER_PAGE) return { people: people.size, recentComments: human.slice(-RECENT_COMMENTS) };
  }
}
