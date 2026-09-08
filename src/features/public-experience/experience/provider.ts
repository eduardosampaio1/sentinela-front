import { FallbackDemoProvider } from "./fallbackProvider";
import { RemoteExperienceProvider } from "./remoteProvider";
import type { PublicExperienceLocale } from "../content/copy";
import type { ExperienceResult, PublicExperienceProvider } from "./types";

export class ResilientExperienceProvider implements PublicExperienceProvider {
  constructor(
    private readonly remote: PublicExperienceProvider | null,
    private readonly fallback: PublicExperienceProvider,
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

export function createExperienceProvider(locale: PublicExperienceLocale = "en"): PublicExperienceProvider {
  const baseUrl = String(import.meta.env.VITE_WEBSUMMIT_API_URL ?? "").replace(/\/+$/, "");
  return new ResilientExperienceProvider(
    baseUrl ? new RemoteExperienceProvider(baseUrl, locale) : null,
    new FallbackDemoProvider(locale),
  );
}
