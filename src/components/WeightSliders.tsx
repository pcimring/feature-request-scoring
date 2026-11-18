import { DIMENSIONS, DIMENSION_LABELS, type Dimension, type Weights } from "../../shared/types.ts";

const HINTS: Record<Dimension, string> = {
  reach: "How many users ask or would be affected",
  impact: "Likely effect on revenue, retention or expansion",
  urgency: "Blocker or time-sensitive language",
  fit: "Alignment with Cloudinary's stated direction",
  feasibility: "How easy it is to build (5 = easy)",
};

export function WeightSliders({ weights, onChange }: { weights: Weights; onChange: (w: Weights) => void }) {
  return (
    <fieldset className="sliders">
      <legend>Weights: what matters most to you?</legend>
      {DIMENSIONS.map((d) => (
        <label className="slider" key={d} title={HINTS[d]}>
          <span className="slider-name">{DIMENSION_LABELS[d]}</span>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={weights[d]}
            aria-label={`${DIMENSION_LABELS[d]} weight`}
            onChange={(e) => onChange({ ...weights, [d]: Number(e.target.value) })}
          />
          <span className="slider-value">{weights[d]}</span>
          <span className="slider-hint">{HINTS[d]}</span>
        </label>
      ))}
    </fieldset>
  );
}
