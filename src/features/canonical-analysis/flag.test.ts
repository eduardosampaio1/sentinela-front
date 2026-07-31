import { afterEach, describe, expect, it, vi } from "vitest";
import { isCanonicalAnalysisEnabled } from "./flag";

afterEach(() => vi.unstubAllEnvs());

describe("isCanonicalAnalysisEnabled — flag da jornada canônica", () => {
  it("DESLIGADA por padrão (env ausente/vazia)", () => {
    vi.stubEnv("VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED", "");
    expect(isCanonicalAnalysisEnabled()).toBe(false);
  });

  it("ligada só com exatamente 'true' (case/space-insensitive)", () => {
    vi.stubEnv("VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED", " TRUE ");
    expect(isCanonicalAnalysisEnabled()).toBe(true);
  });

  it("'false' e qualquer outro valor mantêm desligada", () => {
    for (const v of ["false", "1", "yes", "on"]) {
      vi.stubEnv("VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED", v);
      expect(isCanonicalAnalysisEnabled()).toBe(false);
    }
  });
});
