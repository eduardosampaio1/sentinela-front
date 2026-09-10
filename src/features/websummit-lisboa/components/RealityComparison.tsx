import { useState } from "react";
import { trackLisboaEvent } from "../analytics/events";

export function RealityComparison() {
  const [value, setValue] = useState(52);
  return (
    <section className="lx-reality">
      <div className="lx-reality-heading">
        <p>Illustrative simulation</p>
        <h2>
          One request.
          <br />
          Two realities.
        </h2>
      </div>
      <div
        className="lx-reality-stage"
        style={{ "--split": `${value}%` } as React.CSSProperties}
      >
        <div className="lx-reality-without">
          <span>Without Sentinela</span>
          <strong>AI is the default.</strong>
          <p>
            Full context sent
            <br />
            No route decision
            <br />
            No policy evidence
          </p>
        </div>
        <div className="lx-reality-with">
          <span>With Sentinela</span>
          <strong>Decision comes first.</strong>
          <p>
            Need evaluated
            <br />
            Route selected
            <br />
            Context controlled
          </p>
        </div>
        <input
          type="range"
          min="18"
          max="82"
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          onPointerUp={() =>
            trackLisboaEvent("comparison_interaction", { split: value })
          }
          aria-label="Compare AI execution with and without Sentinela"
        />
      </div>
    </section>
  );
}
