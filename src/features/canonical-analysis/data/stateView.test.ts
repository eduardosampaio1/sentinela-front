import { describe, expect, it } from "vitest";
import type { AnalysisStatus } from "@/lib/v1";
import { describeAnalysisState } from "./stateView";

const EM_ANDAMENTO: AnalysisStatus[] = ["preparing", "receiving", "queued", "running", "recovering"];

describe("describeAnalysisState — apresentação dos 7 estados públicos", () => {
  it("em andamento: ação wait, não-terminal, INDETERMINADO (sem %), não-erro", () => {
    for (const s of EM_ANDAMENTO) {
      const v = describeAnalysisState({ status: s, retry_allowed: false });
      expect(v.action).toBe("wait");
      expect(v.terminal).toBe(false);
      expect(v.indeterminate).toBe(true);
      expect(v.isError).toBe(false);
      expect(v.titleKey).toBe(`canonicalAnalysis.state.${s}.title`);
      expect(v.messageKey).toBe(`canonicalAnalysis.state.${s}.message`);
    }
  });

  it("completed: view_result, terminal, não-erro, determinado", () => {
    const v = describeAnalysisState({ status: "completed", retry_allowed: false });
    expect(v.action).toBe("view_result");
    expect(v.terminal).toBe(true);
    expect(v.isError).toBe(false);
    expect(v.indeterminate).toBe(false);
  });

  it("failed: erro terminal; retry SÓ quando retry_allowed", () => {
    expect(describeAnalysisState({ status: "failed", retry_allowed: true }).action).toBe("retry");
    const semRetry = describeAnalysisState({ status: "failed", retry_allowed: false });
    expect(semRetry.action).toBe("none");
    expect(semRetry.terminal).toBe(true);
    expect(semRetry.isError).toBe(true);
  });
});
