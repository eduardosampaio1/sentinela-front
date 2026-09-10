import type { LisboaExperienceProvider, LisboaExperienceResult } from "./types";

function trace(decisionDetail: string): LisboaExperienceResult["trace"] {
  return [
    {
      stage: "understand",
      label: "Understand",
      detail: "Classify intent, complexity and risk.",
      status: "completed",
    },
    {
      stage: "decide",
      label: "Decide",
      detail: decisionDetail,
      status: "completed",
    },
    {
      stage: "control",
      label: "Control",
      detail: "Apply route, policy and context boundaries.",
      status: "completed",
    },
    {
      stage: "respond",
      label: "Respond",
      detail: "Release an answer with the operational trace intact.",
      status: "completed",
    },
  ];
}

export class LisboaFallbackProvider implements LisboaExperienceProvider {
  async submit(input: string): Promise<LisboaExperienceResult> {
    const risky =
      /\b(diagnos\w*|password|secret|credit card|loan|income|harm\w*|weapon|suicide|medical)\b/i.test(
        input,
      );
    const complex =
      input.length > 110 ||
      /\b(explain|compare|analy[sz]e|strategy|quantum|trade-off)\b/i.test(
        input,
      );
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    if (risky) {
      return {
        answer:
          "A confident answer would be the wrong outcome. Sentinela restricts the route, preserves uncertainty and calls for qualified human review.",
        decision: {
          llmRequired: false,
          route: "controlled-response",
          risk: "high",
          rationale:
            "The request removes safeguards from a high-impact decision.",
          contextStrategy:
            "Keep only the context required to explain the boundary.",
        },
        trace: trace(
          "Risk changes the permitted action, not only the wording.",
        ),
        mode: "fallback",
        illustrative: true,
      };
    }

    return {
      answer: complex
        ? "Sentinela preserves the useful nuance, selects a capable route and limits the answer to what the evidence supports."
        : "Hello. Sentinela can resolve simple requests without defaulting to a model call, while keeping the decision visible.",
      decision: {
        llmRequired: complex,
        route: complex ? "efficient-model" : "deterministic",
        risk: "low",
        rationale: complex
          ? "The request benefits from model reasoning."
          : "The request can be handled without model inference.",
        contextStrategy: complex
          ? "Preserve only decision-relevant context."
          : "No model context required.",
      },
      trace: trace(
        complex
          ? "Use the smallest capable route."
          : "Bypass the model for a deterministic response.",
      ),
      mode: "fallback",
      illustrative: true,
    };
  }
}

export class LisboaRemoteProvider implements LisboaExperienceProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 12_000,
  ) {}

  async submit(
    input: string,
    outerSignal?: AbortSignal,
  ): Promise<LisboaExperienceResult> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), this.timeoutMs);
    const abort = () => controller.abort();
    outerSignal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(`${this.baseUrl}/api/websummit/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, locale: "en" }),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Experience API returned ${response.status}`);
      return (await response.json()) as LisboaExperienceResult;
    } finally {
      window.clearTimeout(timer);
      outerSignal?.removeEventListener("abort", abort);
    }
  }
}

export class LisboaResilientProvider implements LisboaExperienceProvider {
  constructor(
    private readonly remote: LisboaExperienceProvider | null,
    private readonly fallback: LisboaExperienceProvider,
  ) {}

  async submit(input: string, signal?: AbortSignal) {
    if (this.remote) {
      try {
        return await this.remote.submit(input, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
      }
    }
    return this.fallback.submit(input, signal);
  }
}

export function createLisboaProvider(): LisboaExperienceProvider {
  const baseUrl = String(import.meta.env.VITE_WEBSUMMIT_API_URL ?? "").replace(
    /\/+$/,
    "",
  );
  return new LisboaResilientProvider(
    baseUrl ? new LisboaRemoteProvider(baseUrl) : null,
    new LisboaFallbackProvider(),
  );
}
