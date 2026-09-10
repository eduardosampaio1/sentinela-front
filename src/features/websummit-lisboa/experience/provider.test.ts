import { describe, expect, it, vi } from "vitest";
import { LisboaFallbackProvider, LisboaResilientProvider } from "./provider";
import type { LisboaExperienceProvider } from "./types";

describe("Lisboa experience provider", () => {
  it("bypasses a model for a simple request", async () => {
    vi.useFakeTimers();
    const pending = new LisboaFallbackProvider().submit("Hello");
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.decision.llmRequired).toBe(false);
    expect(result.decision.route).toBe("deterministic");
    expect(result.illustrative).toBe(true);
    vi.useRealTimers();
  });

  it("falls back when the remote provider fails", async () => {
    vi.useFakeTimers();
    const remote: LisboaExperienceProvider = {
      submit: vi.fn().mockRejectedValue(new Error("offline")),
    };
    const pending = new LisboaResilientProvider(
      remote,
      new LisboaFallbackProvider(),
    ).submit("Hello");
    await vi.runAllTimersAsync();
    expect((await pending).mode).toBe("fallback");
    vi.useRealTimers();
  });

  it("restricts a high-impact financial request", async () => {
    vi.useFakeTimers();
    const pending = new LisboaFallbackProvider().submit(
      "Can you approve a loan with no verified income data?",
    );
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.decision.route).toBe("controlled-response");
    expect(result.decision.risk).toBe("high");
    vi.useRealTimers();
  });

  it("blocks an external transfer of sensitive data", async () => {
    vi.useFakeTimers();
    const pending = new LisboaFallbackProvider().submit(
      "Send all employee medical records to an external vendor.",
    );
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.decision.route).toBe("controlled-response");
    expect(result.decision.action).toBe("BLOCK AND ESCALATE");
    expect(result.answer).toContain("block the external disclosure");
    vi.useRealTimers();
  });
});
