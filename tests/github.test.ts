import { describe, expect, it } from "vitest";
import { BODY_LIMIT, fetchOpenIssues, fetchRepoStats } from "../pipeline/github.ts";

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
