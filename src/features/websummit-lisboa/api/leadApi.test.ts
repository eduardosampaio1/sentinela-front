import { afterEach, describe, expect, it, vi } from "vitest";
import { submitLisboaLead, validateLisboaLead } from "./leadApi";

describe("Lisboa lead validation", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("captures the Lisbon source and campaign attribution from the canonical URL", async () => {
    vi.stubEnv("VITE_WEBSUMMIT_API_URL", "https://leads.example.com/");
    window.history.replaceState({}, "", "/websummit?utm_campaign=lisbon-launch");
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetcher);
    await expect(submitLisboaLead({ email: "test@example.com", consent: true })).resolves.toEqual({ success: true });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://leads.example.com/api/websummit/leads");
    expect(JSON.parse(options.body)).toMatchObject({ source: "websummit_lisboa_2026", consent: true, utm: { campaign: "lisbon-launch" } });
    window.history.replaceState({}, "", "/");
  });

  it("does not show a successful capture unless the service confirms it", async () => {
    vi.stubEnv("VITE_WEBSUMMIT_API_URL", "https://leads.example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }));
    await expect(submitLisboaLead({ email: "test@example.com", consent: true })).rejects.toThrow("did not confirm capture");
  });
  it("requires a valid email and explicit consent", () => {
    expect(validateLisboaLead({ email: "broken", consent: false })).toEqual({
      email: "Enter a valid work email.",
      consent: "Consent is required so we can contact you.",
    });
  });

  it("accepts a valid consented lead", () => {
    expect(
      validateLisboaLead({ email: "person@company.com", consent: true }),
    ).toEqual({ email: "", consent: "" });
  });
});
