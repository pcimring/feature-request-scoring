import { useEffect, useMemo, useState } from "react";
import { DEFAULT_WEIGHTS, DIMENSIONS, DIMENSION_LABELS, type Dataset, type Weights } from "../shared/types.ts";
import { About } from "./components/About.tsx";
import { Counts } from "./components/Counts.tsx";
import { RequestList } from "./components/RequestList.tsx";
import { ShowOnly, type FilterKey } from "./components/ShowOnly.tsx";
import { WeightSliders } from "./components/WeightSliders.tsx";
import { rankRequests, sortRequests, type SortKey } from "./lib/rank.ts";

type Tab = "scores" | "how";
const tabFromHash = (): Tab => (window.location.hash === "#how-it-works" ? "how" : "scores");
// Only these hashes switch tabs; any other hash (such as #top) leaves the current tab alone.
const isTabHash = (hash: string) => hash === "" || hash === "#scores" || hash === "#how-it-works";

export default function App({ dataset: initial }: { dataset?: Dataset }) {
  const [dataset, setDataset] = useState<Dataset | undefined>(initial);
  const [error, setError] = useState(false);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [showOnly, setShowOnly] = useState<Set<FilterKey>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("weighted");
  // The tab lives in the URL hash, so a direct link opens it and the back button switches back.
  const [tab, setTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    const onHash = () => {
      if (!isTabHash(window.location.hash)) return;
      setTab(tabFromHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (initial) return;
    fetch("/data/scores.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setDataset)
      .catch(() => setError(true));
  }, [initial]);

  const ranked = useMemo(() => {
    const all = sortRequests(rankRequests(dataset?.requests ?? [], weights), sortBy);
    if (showOnly.size === 0) return all;
    // Ticked boxes combine with OR: a request shows if it matches any of them.
    // Visible rows are renumbered 1, 2, 3 so the numbers always match what is on screen.
    return all
      .filter(
        (r) =>
          (showOnly.has("low") && r.confidence.level === "low") ||
          (r.flags ?? []).some((f) => showOnly.has(f.type)),
      )
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [dataset, weights, showOnly, sortBy]);

  return (
    <div className="page" id="top">
      <nav className="tabs" aria-label="Page">
        <a href="#scores" aria-current={tab === "scores" ? "page" : undefined}>
          Scores
        </a>
        <a href="#how-it-works" aria-current={tab === "how" ? "page" : undefined}>
          How it works
        </a>
      </nav>
      <header className="header">
        <p className="eyebrow">AI demo</p>
        <h1>Feature-request scoring</h1>
        <p className="lead">
          Product teams get more feature requests than they can build. This tool reads the open feature requests in a
          GitHub organization, scores each one against a five-part rubric, explains each score, and flags the ones a
          product manager should review.
          {dataset && (
            <>
              {` This demo uses ${dataset.company}'s public repos (`}
              <a href={`https://github.com/${dataset.org}`}>{`github.com/${dataset.org}`}</a>
              {")."}
            </>
          )}
        </p>
        {tab === "scores" && (
          <p className="lead-more">
            For a more detailed overview, see <a href="#how-it-works">How it works</a>.
          </p>
        )}
      </header>

      {error && <p className="notice">The scores could not be loaded. Please refresh the page.</p>}
      {!dataset && !error && <p className="notice">Loading scores...</p>}

      {dataset && tab === "how" && (
        <main>
          <About company={dataset.company} />
        </main>
      )}

      {dataset && tab === "scores" && (
        <main>
          <Counts dataset={dataset} />
          <section className="controls" aria-label="Controls">
            <WeightSliders weights={weights} onChange={setWeights} company={dataset.company} />
            <div className="list-options">
              <label className="sort">
                Sort by
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                  <option value="weighted">Overall score</option>
                  {DIMENSIONS.map((d) => (
                    <option value={d} key={d}>
                      {DIMENSION_LABELS[d]}
                    </option>
                  ))}
                  <option value="confidence">Confidence (lowest first)</option>
                </select>
              </label>
              <ShowOnly selected={showOnly} onChange={setShowOnly} />
            </div>
          </section>
          <p className="showing" aria-live="polite">{`Showing ${ranked.length} of ${dataset.requests.length} requests`}</p>
          <RequestList requests={ranked} />
        </main>
      )}

      <footer className="footer">
        <span>
          Built by Peter Cimring · <a href="https://petercimring.space">petercimring.space</a>
        </span>
        <span>
          <a href="https://github.com/pcimring/feature-request-scoring">Source code on GitHub</a>
          <span className="sep">·</span>
          <a
            href="#top"
            onClick={(e) => {
              // Scroll without touching the hash, so the current tab stays open.
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Back to top ↑
          </a>
        </span>
      </footer>
    </div>
  );
}
