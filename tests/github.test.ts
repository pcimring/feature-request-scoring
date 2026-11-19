import { describe, expect, it } from "vitest";
import { BODY_LIMIT, fetchOpenIssues, fetchRepoStats, fetchThread } from "../pipeline/github.ts";

function item(n: number, body: string | null = "body") {
  return {
    id: 1000 + n,
    number: n,
    title: `Issue ${n}`,
    body,
    html_url: `https://github.com/cloudinary/cloudinary_npm/issues/${n}`,
    repository_url: "https://api.github.com/repos/cloudinary/cloudinary_npm",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
    comments: 4,
    reactions: { total_count: 7 },
    labels: [{ name: "enhancement" }],
  };
}

function stubFetch(pages: unknown[][], status = 200) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const page = Number(new URL(url).searchParams.get("page"));
    return new Response(JSON.stringify({ items: pages[page - 1] ?? [] }), { status });
  }) as typeof fetch;
  return { fetchFn, calls };
}

describe("fetchOpenIssues", () => {
  it("stops with a clear error when the org has more open issues than GitHub search returns", async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify({ total_count: 1500, items: [item(1)] }), { status: 200 })) as typeof fetch;
    await expect(fetchOpenIssues("bigorg", { fetchFn })).rejects.toThrow(/1,500 open issues.*at most 1,000/);
  });

  it("queries open issues in the org and follows pages until a short page", async () => {
    const full = Array.from({ length: 100 }, (_, i) => item(i + 1));
    const { fetchFn, calls } = stubFetch([full, [item(101)]]);
    const issues = await fetchOpenIssues("cloudinary", { fetchFn });
    expect(issues).toHaveLength(101);
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe(
      "https://api.github.com/search/issues?q=org%3Acloudinary+is%3Aissue+is%3Aopen&per_page=100&page=1",
    );
  });

  it("maps repo, reactions and labels", async () => {
    const { fetchFn } = stubFetch([[item(5)]]);
    const [issue] = await fetchOpenIssues("cloudinary", { fetchFn });
    expect(issue).toMatchObject({
      id: 1005,
      number: 5,
      repo: "cloudinary_npm",
      reactions: 7,
      comments: 4,
      labels: ["enhancement"],
      url: "https://github.com/cloudinary/cloudinary_npm/issues/5",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
    });
  });

  it("cuts long bodies to the limit and turns a null body into an empty string", async () => {
    const { fetchFn } = stubFetch([[item(1, "x".repeat(6000)), item(2, null)]]);
    const [long, empty] = await fetchOpenIssues("cloudinary", { fetchFn });
    expect(BODY_LIMIT).toBe(4000);
    expect(long.body).toHaveLength(4000);
    expect(empty.body).toBe("");
  });

  it("sends a bearer token only when one is given", async () => {
    const a = stubFetch([[item(1)]]);
    await fetchOpenIssues("cloudinary", { fetchFn: a.fetchFn });
    expect(a.calls[0].headers.Authorization).toBeUndefined();
    const b = stubFetch([[item(1)]]);
    await fetchOpenIssues("cloudinary", { fetchFn: b.fetchFn, token: "t0k" });
    expect(b.calls[0].headers.Authorization).toBe("Bearer t0k");
  });

  it("throws with the status on a non-200 response", async () => {
    const { fetchFn } = stubFetch([[]], 403);
    await expect(fetchOpenIssues("cloudinary", { fetchFn })).rejects.toThrow(/403/);
  });
});

describe("fetchRepoStats", () => {
  it("returns stars and forks per repo", async () => {
    const calls: string[] = [];
    const fetchFn = (async (url: string) => {
      calls.push(url);
      const name = url.split("/").pop();
      return new Response(JSON.stringify({ stargazers_count: name === "a" ? 120 : 5, forks_count: name === "a" ? 30 : 1 }));
    }) as typeof fetch;
    const stats = await fetchRepoStats("cloudinary", ["a", "b"], { fetchFn });
    expect(calls).toEqual(["https://api.github.com/repos/cloudinary/a", "https://api.github.com/repos/cloudinary/b"]);
    expect(stats).toEqual({ a: { stars: 120, forks: 30 }, b: { stars: 5, forks: 1 } });
  });
});

describe("fetchThread", () => {
  it("counts the author plus distinct commenters, ignoring bots, across pages", async () => {
    const page1 = [...Array.from({ length: 98 }, () => ({ user: { login: "alice" } })), { user: { login: "bob" } }, { user: { login: "dependabot[bot]" } }];
    const page2 = [{ user: { login: "carol" } }, { user: { login: "author" } }];
    const urls: string[] = [];
    const fetchFn = (async (url: string) => {
      urls.push(url);
      const page = Number(new URL(url).searchParams.get("page"));
      return new Response(JSON.stringify(page === 1 ? page1 : page2));
    }) as typeof fetch;
    const { people } = await fetchThread("cloudinary", "cloudinary_npm", 56, "author", { fetchFn, token: "t" });
    expect(people).toBe(4);
    expect(urls[0]).toBe("https://api.github.com/repos/cloudinary/cloudinary_npm/issues/56/comments?per_page=100&page=1");
    expect(urls).toHaveLength(2);
  });

  it("maps the issue author from search results", async () => {
    const { fetchFn } = stubFetch([[{ ...item(1), user: { login: "octo" } }]]);
    const [issue] = await fetchOpenIssues("cloudinary", { fetchFn });
    expect(issue.author).toBe("octo");
  });
});

describe("fetchThread recent comments", () => {
  it("returns the last 5 human comments with author and date, each cut to 600 characters", async () => {
    const comments = Array.from({ length: 7 }, (_, i) => ({
      user: { login: `u${i}` },
      created_at: `2020-0${i + 1}-01T00:00:00Z`,
      body: i === 6 ? "x".repeat(900) : `comment ${i}`,
    }));
    comments.push({ user: { login: "ci[bot]" }, created_at: "2021-01-01T00:00:00Z", body: "bot noise" });
    const fetchFn = (async () => new Response(JSON.stringify(comments))) as unknown as typeof fetch;
    const { recentComments } = await fetchThread("cloudinary", "r", 1, "a", { fetchFn });
    expect(recentComments).toHaveLength(5);
    expect(recentComments[0]).toBe("u2 (2020-03-01): comment 2");
    expect(recentComments[4].length).toBeLessThanOrEqual("u6 (2020-07-01): ".length + 600);
    expect(recentComments.join(" ")).not.toContain("bot noise");
  });
});
