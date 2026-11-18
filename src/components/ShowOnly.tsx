import { FLAG_LABELS, type FlagType } from "../../shared/types.ts";

export type FilterKey = "low" | FlagType;

export const FILTER_LABELS: Record<FilterKey, string> = {
  low: "Low-confidence scores",
  possibly_resolved: FLAG_LABELS.possibly_resolved,
  mixed_requests: FLAG_LABELS.mixed_requests,
  pr_waiting: FLAG_LABELS.pr_waiting,
};

const KEYS: FilterKey[] = ["low", "possibly_resolved", "mixed_requests", "pr_waiting"];

export function ShowOnly({
  selected,
  onChange,
  shown,
  total,
}: {
  selected: Set<FilterKey>;
  onChange: (s: Set<FilterKey>) => void;
  shown: number;
  total: number;
}) {
  const toggle = (k: FilterKey) => {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange(next);
  };
  return (
    <fieldset className="show-only">
      <legend>
        Show only <span className="showing">{`Showing ${shown} of ${total}`}</span>
      </legend>
      {KEYS.map((k) => (
        <label className="toggle" key={k}>
          <input type="checkbox" checked={selected.has(k)} onChange={() => toggle(k)} />
          {FILTER_LABELS[k]}
        </label>
      ))}
    </fieldset>
  );
}
