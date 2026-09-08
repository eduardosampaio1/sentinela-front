import { getExperienceScenarios } from "../experience/scenarios";
import { trackPublicExperienceEvent } from "../analytics/events";
import { usePublicExperience } from "../usePublicExperience";

export function TryToBreak({ onSelect }: { onSelect: (prompt: string) => void }) {
  const { copy, variant } = usePublicExperience();
  const experienceScenarios = getExperienceScenarios(copy);
  return (
    <div className="ws-seeds">
      <p>{copy.tryTitle}</p>
      <div className="ws-seeds__list">
        {experienceScenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => {
              trackPublicExperienceEvent(variant, "example_click", { scenario: scenario.id });
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
