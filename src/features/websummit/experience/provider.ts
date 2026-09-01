import { FallbackDemoProvider } from "./fallbackProvider";
import { RemoteExperienceProvider } from "./remoteProvider";
import type { ExperienceResult, WebSummitExperienceProvider } from "./types";

export class ResilientExperienceProvider implements WebSummitExperienceProvider {
  constructor(
    private readonly remote: WebSummitExperienceProvider | null,
    private readonly fallback: WebSummitExperienceProvider,
  ) {}

  async submit(input: string, signal?: AbortSignal): Promise<ExperienceResult> {
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

export function createExperienceProvider(): WebSummitExperienceProvider {
  const baseUrl = String(import.meta.env.VITE_WEBSUMMIT_API_URL ?? "").replace(/\/+$/, "");
  return new ResilientExperienceProvider(
    baseUrl ? new RemoteExperienceProvider(baseUrl) : null,
    new FallbackDemoProvider(),
  );
}
