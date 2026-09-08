import type { ExperienceScenario } from "./types";
import type { PublicExperienceCopy } from "../content/copy";

export function getExperienceScenarios(copy: PublicExperienceCopy): ExperienceScenario[] {
  return [
    { id: "hello", ...copy.scenarios.hello, kind: "simple" },
    { id: "complex", ...copy.scenarios.complex, kind: "complex" },
    { id: "risky", ...copy.scenarios.risky, kind: "risky" },
  ];
}
