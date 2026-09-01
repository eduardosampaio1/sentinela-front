import { describe, expect, it } from "vitest";
import { validateLead } from "./leadApi";

describe("Web Summit lead validation", () => {
  it("requires a valid email and explicit consent", () => {
    expect(validateLead({ email: "not-an-email", consent: false })).toEqual({
      email: "Enter a valid work email.",
      consent: "Consent is required so we can contact you.",
    });
  });

  it("accepts a valid work email with consent", () => {
    expect(validateLead({ email: "person@company.com", consent: true })).toEqual({});
  });
});
