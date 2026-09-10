import type { LisboaExperienceResult } from "../experience/types";
import { trackLisboaEvent } from "../analytics/events";

export function DecisionTrace({ result }: { result: LisboaExperienceResult }) {
  return (
    <details
      className="lx-trace"
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open)
          trackLisboaEvent("trace_open");
      }}
    >
      <summary>See what happened</summary>
      <ol>
        {result.trace.map((step, index) => (
          <li key={step.stage}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{step.label}</strong>
              <p>{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="lx-trace-note">
        Operational decisions and telemetry only. Private model reasoning is
        never exposed.
      </p>
    </details>
  );
}
