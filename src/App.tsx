import { useEffect, useMemo, useState } from "react";
import { DEFAULT_WEIGHTS, type Dataset, type Weights } from "../shared/types.ts";
import { About } from "./components/About.tsx";
import { Counts } from "./components/Counts.tsx";
import { RequestList } from "./components/RequestList.tsx";
import { WeightSliders } from "./components/WeightSliders.tsx";
import { rankRequests } from "./lib/rank.ts";

export default function App({ dataset: initial }: { dataset?: Dataset }) {
  const [dataset, setDataset] = useState<Dataset | undefined>(initial);
  const [error, setError] = useState(false);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [reviewOnly, setReviewOnly] = useState(false);

  useEffect(() => {
    if (initial) return;
    fetch("/data/scores.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setDataset)
      .catch(() => setError(true));
  }, [initial]);

  const ranked = useMemo(() => {
    const all = rankRequests(dataset?.requests ?? [], weights);
    return reviewOnly ? all.filter((r) => r.confidence.level === "low") : all;
  }, [dataset, weights, reviewOnly]);

  return (
    <div className="page">
      <header className="header">
        <p className="eyebrow">AI demo</p>
        <h1>Feature-request scoring</h1>
        <p className="lead">
          Product teams get more feature requests than they can build. This tool reads the open feature requests in
          Cloudinary's public GitHub repos, scores each one against a five-part rubric, explains every score, and flags
          the ones a product manager should review.
        </p>
        <p className="source">
          Data source: <a href="https://github.com/cloudinary">github.com/cloudinary</a>
        </p>
      </header>

      {error && <p className="notice">The scores could not be loaded. Please refresh the page.</p>}
      {!dataset && !error && <p className="notice">Loading scores...</p>}

      {dataset && (
        <main>
          <Counts dataset={dataset} />
          <section className="controls" aria-label="Controls">
            <WeightSliders weights={weights} onChange={setWeights} />
            <label className="toggle">
              <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} />
              Needs review only
            </label>
          </section>
          <RequestList requests={ranked} />
          <About />
        </main>
      )}

      <footer className="footer">
        <span>
          Built by Peter Cimring · <a href="https://petercimring.space">petercimring.space</a>
        </span>
        <a href="https://github.com/pcimring/feature-request-scoring">Source code on GitHub</a>
      </footer>
    </div>
  );
}
