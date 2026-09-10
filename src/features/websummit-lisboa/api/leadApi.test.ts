import { describe, expect, it } from "vitest";
import { validateLisboaLead } from "./leadApi";

describe("Lisboa lead validation", () => {
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
