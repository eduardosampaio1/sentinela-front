import { describe, expect, it } from "vitest";
import { PROCESSING_SEQUENCE, stateLabel } from "./useExperienceMachine";

describe("Lisboa experience state machine", () => {
  it("keeps the operational sequence deterministic", () => {
    expect(PROCESSING_SEQUENCE).toEqual([
      "aware",
      "receiving",
      "understanding",
      "evaluating",
      "deciding",
      "controlling",
      "responding",
    ]);
  });

  it("provides visible status text for every state", () => {
    expect(stateLabel("deciding")).toBe("Selecting action");
    expect(stateLabel("error")).toBe("Request interrupted");
  });
});
