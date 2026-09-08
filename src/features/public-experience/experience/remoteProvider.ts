import type { PublicExperienceLocale } from "../content/copy";
import type { ExperienceResult, PublicExperienceProvider } from "./types";

export class RemoteExperienceProvider implements PublicExperienceProvider {
  constructor(private readonly baseUrl: string, private readonly locale: PublicExperienceLocale = "en", private readonly timeoutMs = 12_000) {}

  async submit(input: string, outerSignal?: AbortSignal): Promise<ExperienceResult> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.timeoutMs);
    const abort = () => controller.abort();
    outerSignal?.addEventListener("abort", abort, { once: true });

    try {
      const response = await fetch(`${this.baseUrl}/api/websummit/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, locale: this.locale }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Experience API returned ${response.status}`);
      return (await response.json()) as ExperienceResult;
    } finally {
      window.clearTimeout(timeout);
      outerSignal?.removeEventListener("abort", abort);
    }
  }
}
