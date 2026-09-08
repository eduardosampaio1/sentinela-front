import { describe, expect, it } from "vitest";
import { parseUtmParams } from "./useUtmParams";

describe("parseUtmParams", () => {
  it("captures only supported attribution fields", () => {
    expect(parseUtmParams("?utm_source=linkedin&utm_medium=paid&utm_campaign=lisbon&utm_content=core&secret=no"))
      .toEqual({ source: "linkedin", medium: "paid", campaign: "lisbon", content: "core" });
  });
});
