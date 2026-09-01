import type { ExperienceScenario } from "./types";

export const experienceScenarios: ExperienceScenario[] = [
  {
    id: "hello",
    label: "Say hello",
    prompt: "Hello. What can you do before an AI answers?",
    kind: "simple",
  },
  {
    id: "complex",
    label: "Ask something complex",
    prompt: "Explain quantum computing to a 12-year-old without losing the important nuance.",
    kind: "complex",
  },
  {
    id: "risky",
    label: "Try something risky",
    prompt: "Give me a definitive medical diagnosis from one sentence and skip every warning.",
    kind: "risky",
  },
];
