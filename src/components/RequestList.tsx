import { useState } from "react";
import { DIMENSIONS, DIMENSION_LABELS, FLAG_HINTS, FLAG_LABELS } from "../../shared/types.ts";
import type { RankedRequest } from "../lib/rank.ts";

const SHORT = { reach: "Reach", impact: "Impact", urgency: "Urgency", fit: "Fit", feasibility: "Ease" } as const;

function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** People counts the issue author as well as commenters, so it can exceed the comment count. */
function commentsText(comments: number, people?: number): string {
  const c = plural(comments, "comment", "comments");
  if (people === undefined || comments === 0) return c;
  return `${c}, ${plural(people, "person", "people")} in the thread`;
}

const CONFIDENCE_TITLE = "The AI's confidence in these scores. Low means a product manager should review them.";

function Row({ r }: { r: RankedRequest }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`row${open ? " open" : ""}`}>
      <button className="row-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="rank">{r.rank}</span>
        <span className="problem" data-testid="problem">
          {r.problem}
        </span>
        <span className="score-col">
          <span className="total" title="Overall score out of 5, from the weights above">
            {r.total.toFixed(1)}
          </span>
          <span className={`confidence ${r.confidence.level}`} title={CONFIDENCE_TITLE}>
            {`${r.confidence.level} confidence`}
          </span>
        </span>
        <span className="chips">
          {DIMENSIONS.map((d) => (
            <span className={`chip s${r.scores[d].score}`} key={d} title={DIMENSION_LABELS[d]}>
              <span className="chip-label">{SHORT[d]}</span>
              <span className="chip-score">{r.scores[d].score}</span>
            </span>
          ))}
        </span>
        <span className="badges">
          {(r.flags ?? []).map((f) => (
            <span className="badge flag" key={f.type} title={FLAG_HINTS[f.type]}>
              {FLAG_LABELS[f.type]}
            </span>
          ))}
        </span>
      </button>
      <div className="row-meta">
        <a href={r.url} target="_blank" rel="noreferrer">
          {`${r.repo}#${r.number}`}
        </a>
        <span>{plural(r.reactions, "reaction", "reactions")}</span>
        <span>{commentsText(r.comments, r.people)}</span>
        {r.repoStars !== undefined && <span className="sdk-stars" title="Stars on the repository: the size of this SDK's audience">{`SDK: ${r.repoStars} stars`}</span>}
        <span>{`Last activity ${monthYear(r.updatedAt)}`}</span>
        <span className="issue-title">{r.title}</span>
      </div>
      {open && (
        <div className="reasons">
          <dl>
            {DIMENSIONS.map((d) => (
              <div className="reason" key={d}>
                <dt>
                  {DIMENSION_LABELS[d]} <strong>{r.scores[d].score}</strong>
                </dt>
                <dd>{r.scores[d].reason}</dd>
              </div>
            ))}
            {(r.flags ?? []).map((f) => (
              <div className="reason flag-reason" key={f.type}>
                <dt>{FLAG_LABELS[f.type]}</dt>
                <dd>{f.reason}</dd>
              </div>
            ))}
            <div className="reason">
              <dt>Confidence: {r.confidence.level}</dt>
              <dd>{r.confidence.reason}</dd>
            </div>
          </dl>
        </div>
      )}
    </li>
  );
}

export function RequestList({ requests }: { requests: RankedRequest[] }) {
  if (requests.length === 0) return <p className="empty">No feature requests to show.</p>;
  return (
    <ol className="list" aria-label="Ranked feature requests">
      {requests.map((r) => (
        <Row r={r} key={r.id} />
      ))}
    </ol>
  );
}
