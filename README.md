# Feature-request scoring

An AI tool that helps a product manager decide which feature requests to build next. It reads the open feature requests in Cloudinary's public GitHub repos, scores each one against a five-part rubric, explains every score, and flags the ones a person should review.

## Why

Product teams get more feature requests than they can build, and they often rank them by gut feel or by who asked loudest. A scoring rubric gives those decisions a data backbone. The hard part is applying the rubric to dozens of requests written in different styles, which is where an LLM helps. The PM still makes the call: the tool sorts, and shows its reasoning so it can be checked.

## How it works

1. **Fetch:** a script pulls every open issue across the `cloudinary` GitHub org (215 issues in 38 repos on 2026-11-18, mostly SDKs).
2. **Classify:** Claude Haiku 5.5 labels each issue as a feature request, bug, question or other. Only feature requests go on (62 of 215).
3. **Score:** Claude Opus 5.5 restates each feature request as the underlying problem, separate from the solution the requester proposed, then scores it from 1 to 5 on:
   - **Reach:** how many users ask or would be affected (reactions, comments, how widely the SDK is used).
   - **Business Impact:** likely effect on revenue, retention or expansion.
   - **Urgency:** blocker or time-sensitive language.
   - **Strategic Fit:** alignment with Cloudinary's stated direction, from a short summary of its public announcements (`pipeline/strategy.md`).
   - **Feasibility:** how easy it is to build (5 = easy).

   Every score has a one-line reason, and the model states its confidence. Low-confidence requests are flagged "Needs review".
4. **Save:** the results go into `public/data/scores.json`.
5. **Show:** a static page ranks the requests by a weighted total. The weight sliders and the review filter are plain arithmetic in the browser, so no AI runs while you browse and no API key ever reaches the page.

Re-running the script reuses the stored result for any issue that hasn't changed, so a refresh only pays for new or edited issues.

## Limits

- These are public SDK requests from GitHub, not Cloudinary's full product wishlist. A real deployment would also pull from tools like Productboard, Jira and Gong.
- Business Impact and Urgency are educated guesses from public text. The tool has no access to Cloudinary's internal data, customers or roadmap.
- That is why every score carries its reason and thin requests are flagged for a person to review.

## Pricing extension

With billing data, Reach and Business Impact could be weighted by plan tier and revenue, normalized by account size so a few large accounts don't drown out everyone else. The ranking then becomes a pricing signal: which requests come from accounts close to an upgrade, and which features could justify a higher tier.

## Future work

- A daily scheduled refresh (GitHub Action), with "Last updated" on the page.
- Grouping requests that describe the same problem, and scoring each group once.
- An n8n version of the pipeline, reusing the same scoring prompt.
- Drafting "close the loop" replies to requesters once a request ships.

## Run it

Requires Node 22+ and an Anthropic API key.

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run pipeline            # fetch, classify, score; writes public/data/scores.json
npm run pipeline -- --limit 5   # score only 5 new requests (a cheap trial)
npm run dev                 # the page, at http://localhost:5173
npm test
```

Cost: the first full run cost about $1 in API calls. The script stops itself if a run passes $1.50. An optional `GITHUB_TOKEN` in `.env.local` raises GitHub's rate limit.

## Stack

TypeScript, React, Vite, Vitest, Zod, and the Anthropic TypeScript SDK with structured outputs. Hosted as a static site on Vercel.

Built by [Peter Cimring](https://petercimring.space).
