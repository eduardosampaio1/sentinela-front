import { describe, expect, it } from "vitest";

import { buildInterpretationPanelModel } from "@/lib/decisionLayerModel";

describe("interpretation panel model", () => {
  it("preserves the full interpretation text without truncation", () => {
    const longSummary =
      "Sentinela ARGOS analysis indicates a HIGH risk level with an AI Health Score of 75.06. " +
      "The system exhibits significant behavioral instability and semantic entropy across sales, billing, and support. " +
      "Fix first the repeated containment breakdown in billing because it is driving handoffs.";

    const model = buildInterpretationPanelModel(
      {
        summary: longSummary,
        business_implications: ["Containment issues are increasing avoidable handoff cost."],
        operational_risks: ["Fix first: billing containment flow and repeated fallback responses."],
      },
      "Decision headline",
    );

    expect(model.summary).toBe(longSummary);
    expect(model.summary?.includes("...")).toBe(false);
    expect(model.businessImpact).toBe("Containment issues are increasing avoidable handoff cost.");
    expect(model.riskProjection).toBe("Fix first: billing containment flow and repeated fallback responses.");
  });
});
