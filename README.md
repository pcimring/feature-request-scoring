# Feature-request scoring

An AI tool that helps a product manager decide which feature requests to build next. It reads the open feature requests across a GitHub organization, scores each one against a five-part rubric, explains each score, and flags the ones a person should review. The live demo uses Cloudinary's public repos.

- **Live demo:** https://feature-request-scoring.vercel.app
- **How it works, on the page:** https://feature-request-scoring.vercel.app/#how-it-works

## Why

Product teams get more feature requests than they can build, and they often rank them by gut feel or by who asked loudest. A scoring rubric gives those decisions a data backbone. The hard part is applying the rubric to dozens of requests written in different styles, which is where an LLM helps. The PM still makes the call: the tool sorts, and shows its reasoning so it can be checked.

## How it works

1. **Fetch:** a script pulls every open issue across the GitHub org. For the demo: 215 open issues in the `cloudinary` org on 2026-11-18, mostly in SDK repos.
2. **Classify:** Claude Haiku 5.5 labels each issue as a feature request, bug, question or other. Only feature requests go on (62 of 215).
3. **Score:** Claude Haiku 5.5 restates each feature request as the underlying problem, separate from the solution the requester proposed, then scores it from 1 to 5 on:
   - **Reach:** how many people want it. Mostly the number of distinct people in the thread, then comments and reactions. The repo's star count only breaks ties.
   - **Business Impact:** likely effect on revenue, retention or expansion, judged from what the issue says.
   - **Urgency:** whether something is blocked now or has a deadline.
   - **Strategic Fit:** alignment with the company's stated direction, from a short summary of its public announcements (`pipeline/strategy.md`).
   - **Feasibility:** how easy it is to build (5 = a small change in one repo).

   Every score has a one-line reason, and the model states its confidence in each request's scores.
4. **Compare side by side:** each request is scored on its own, so scores bunch in the middle. A final pass shows the model all the requests together and spreads out Reach, Business Impact and Urgency relative to each other.
5. **Flag for cleanup:** the scorer also reads the last 5 comments of each thread and answers three yes-or-no checks, each with its evidence:
   - **Mixed requests:** the thread drifted into several separate asks.
   - **Possibly resolved:** a maintainer says it shipped, a dedicated repo now exists, or the requester accepted a working alternative.
   - **PR waiting:** someone already opened a pull request.
6. **Show:** the results are saved to `public/data/scores.json`. A static page ranks the requests by an overall score, a weighted average of the five scores using the slider weights. The page can sort by any dimension and show only low-confidence or flagged requests. All of this is plain arithmetic in the browser, so no AI runs while you browse and no API key reaches the page.

Re-running the script reuses the stored result for any issue that hasn't changed, so a refresh only pays for new or edited issues.

## Use it on another GitHub org

The target lives in one file, `pipeline/target.ts`:

```ts
export const TARGET = {
  org: "cloudinary",                    // github.com/<org>
  company: "Cloudinary",                // name shown on the page
  strategyFile: "pipeline/strategy.md", // the company's public direction, for Strategic Fit
};
```

Change the three values, write a short strategy summary for the new company, and run the pipeline. The prompts don't name any company, so nothing else needs to change.

## Limits

- These are public GitHub issues, not the company's full product wishlist. A real deployment would also pull from tools like Productboard, Jira and Gong.
- Business Impact and Urgency are educated guesses from public text. The tool has no access to the company's internal data, customers or roadmap.
- That is why every score carries its reason and low-confidence requests are flagged for a person to review.

## Pricing extension

With billing data, Reach and Business Impact could be weighted by plan tier and revenue, normalized by account size so a few large accounts don't drown out everyone else. The ranking then becomes a pricing signal: which requests come from accounts close to an upgrade, and which features could justify a higher tier.

## Future work

- A daily scheduled refresh (GitHub Action), with "Last updated" on the page.
- Grouping requests that describe the same problem, and scoring each group once.
- Checking whether a waiting PR was merged or closed, through the GitHub API, instead of reading it from the thread.
- An n8n version of the pipeline, reusing the same scoring prompt.
- Drafting "close the loop" replies to requesters once a request ships.

## Run it

Requires Node 22+, an Anthropic API key and a GitHub token (fine-grained, public repos, read-only).

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
echo "GITHUB_TOKEN=github_pat_..." >> .env.local
npm run pipeline                  # fetch, classify, score; writes public/data/scores.json
npm run pipeline -- --limit 5     # score only 5 new requests (a cheap trial)
npm run dev                       # the page, at http://localhost:5173
npm test
```

Cost: a full run of the 62 demo requests costs about $0.05 on Claude Haiku 5.5 (about $1 on Claude Opus 5.5, which scored similarly on a side-by-side test). The script stops itself if a run passes $1.50. Repo star counts are saved in `data/repo-stats.json` and reused.

## Stack

TypeScript, React, Vite, Vitest, Zod, and the Anthropic TypeScript SDK with structured outputs. Hosted as a static site on Vercel.

Built by [Peter Cimring](https://petercimring.space).
