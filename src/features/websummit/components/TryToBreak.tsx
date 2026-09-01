import { experienceScenarios } from "../experience/scenarios";
import { trackWebSummitEvent } from "../analytics/events";

export function TryToBreak({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="ws-seeds">
      <p>Try to break Sentinela</p>
      <div className="ws-seeds__list">
        {experienceScenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => {
              trackWebSummitEvent("websummit_example_click", { scenario: scenario.id });
              onSelect(scenario.prompt);
            }}
          >
            {scenario.label}
          </button>
        ))}
      </div>
    </div>
  );
}
