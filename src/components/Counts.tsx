import type { Dataset } from "../../shared/types.ts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function Counts({ dataset }: { dataset: Dataset }) {
  const { counts } = dataset;
  const items = [
    { value: counts.openIssues, label: "open issues scanned" },
    { value: counts.featureRequests, label: "feature requests found" },
    { value: counts.needsReview, label: "low-confidence scores" },
    { value: counts.flagged ?? 0, label: "flagged for cleanup" },
  ];
  return (
    <section className="counts" aria-label="Counts">
      {items.map((i) => (
        <div className="count" key={i.label}>
          <span className="count-value">{i.value}</span>
          <span className="count-label">{i.label}</span>
        </div>
      ))}
      <p className="updated">Last updated {formatDate(dataset.generatedAt)}</p>
    </section>
  );
}
