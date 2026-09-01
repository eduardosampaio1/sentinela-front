import { describe, expect, it, vi } from "vitest";
import { experienceReducer, initialExperienceState } from "../hooks/useExperienceState";
import { FallbackDemoProvider } from "./fallbackProvider";
import { ResilientExperienceProvider } from "./provider";
import { experienceScenarios } from "./scenarios";

describe("Web Summit experience", () => {
  it("moves through explicit system states", () => {
    const listening = experienceReducer(initialExperienceState, { type: "PHASE", phase: "listening" });
    const deciding = experienceReducer(listening, { type: "PHASE", phase: "deciding" });
    expect(deciding.phase).toBe("deciding");
    expect(deciding.result).toBeNull();
  });

  it("uses a local illustrative fallback when the remote provider fails", async () => {
    const remote = { submit: vi.fn().mockRejectedValue(new Error("offline")) };
    const provider = new ResilientExperienceProvider(remote, new FallbackDemoProvider());
    const result = await provider.submit("Hello");
    expect(result.mode).toBe("fallback");
    expect(result.illustrative).toBe(true);
    expect(result.trace).toHaveLength(4);
  });

  it("keeps scenarios data-driven and distinct", () => {
    expect(experienceScenarios.map((scenario) => scenario.kind)).toEqual(["simple", "complex", "risky"]);
    expect(new Set(experienceScenarios.map((scenario) => scenario.prompt)).size).toBe(3);
  });
});
