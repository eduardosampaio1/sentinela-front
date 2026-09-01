import type { ExperienceResult, WebSummitExperienceProvider } from "./types";

function classify(input: string) {
  const risky = /diagnos|password|secret|credit card|harm|weapon|suicide|medical/i.test(input);
  const complex = input.length > 110 || /explain|compare|analy[sz]e|strategy|quantum/i.test(input);
  return { risky, complex };
}

export class FallbackDemoProvider implements WebSummitExperienceProvider {
  async submit(input: string): Promise<ExperienceResult> {
    const { risky, complex } = classify(input);
    await new Promise((resolve) => window.setTimeout(resolve, 520));

    if (risky) {
      return {
        answer:
          "A confident answer would be the wrong outcome here. Sentinela would restrict the route, preserve the uncertainty and ask for qualified human review.",
        decision: {
          llmRequired: false,
          route: "controlled-response",
          risk: "high",
          rationale: "The request asks the system to remove safeguards from a high-impact decision.",
          contextStrategy: "Retain only the minimum context needed to explain the boundary.",
        },
        trace: buildTrace("Risk changed the action, not just the wording."),
        mode: "fallback",
        illustrative: true,
      };
    }

    return {
      answer: complex
        ? "Sentinela would preserve the nuance, select a capable route and constrain the answer to what the evidence supports. The goal is not a longer answer. It is a controlled one."
        : "Sentinela first decides whether AI is needed at all. Simple requests can take a lighter route without giving up control or traceability.",
      decision: {
        llmRequired: true,
        route: complex ? "capable-model" : "efficient-model",
        risk: "low",
        rationale: complex
          ? "The request benefits from reasoning and careful explanation."
          : "The request is low-risk and can use an efficient route.",
        contextStrategy: complex ? "Keep the relevant nuance." : "Use the smallest useful context.",
      },
      trace: buildTrace("The route matches the work instead of defaulting to the largest model."),
      mode: "fallback",
      illustrative: true,
    };
  }
}

function buildTrace(decision: string): ExperienceResult["trace"] {
  return [
    { stage: "understand", label: "Understand", detail: "Classify intent, complexity and risk.", status: "completed" },
    { stage: "decide", label: "Decide", detail: decision, status: "completed" },
    { stage: "control", label: "Control", detail: "Apply route and context boundaries.", status: "completed" },
    { stage: "respond", label: "Respond", detail: "Return an answer with the decision trace intact.", status: "completed" },
  ];
}
