import { beforeEach, describe, expect, it } from "vitest";
import {
  isSessionCached,
  loadResult,
  saveResult,
  type AnalysisResult,
} from "@/lib/api";

const BASE_RESULT: AnalysisResult = {
  consistency_score: 72,
  token_waste_estimate: 10,
  cross_intent_similarity: 15,
  critical_alerts_count: 0,
  alerts: [],
  analyzed_at: new Date().toISOString(),
  _warnings: [],
};

describe("workspace-scoped analysis cache", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("keeps independent cache pointers per workspace", () => {
    saveResult({ ...BASE_RESULT, analysis_id: "analysis-a" }, "hash-a", "workspace-a");
    saveResult({ ...BASE_RESULT, analysis_id: "analysis-b" }, "hash-b", "workspace-b");

    const loadedA = loadResult("workspace-a");
    const loadedB = loadResult("workspace-b");

    expect(loadedA?.analysis_id).toBe("analysis-a");
    expect(loadedB?.analysis_id).toBe("analysis-b");
    expect(isSessionCached("workspace-a")).toBe(true);
    expect(isSessionCached("workspace-b")).toBe(true);
  });

  it("does not leak workspace cache into a different workspace key", () => {
    saveResult({ ...BASE_RESULT, analysis_id: "analysis-a" }, "hash-a", "workspace-a");
    const loaded = loadResult("workspace-b");
    expect(loaded).toBeNull();
    expect(isSessionCached("workspace-b")).toBe(false);
  });

  it("does not leak cache between projects inside the same workspace", () => {
    saveResult(
      { ...BASE_RESULT, analysis_id: "analysis-project-a" },
      "hash-project-a",
      { workspaceId: "workspace-a", projectId: "project-a", environmentId: "prod" },
    );
    saveResult(
      { ...BASE_RESULT, analysis_id: "analysis-project-b" },
      "hash-project-b",
      { workspaceId: "workspace-a", projectId: "project-b", environmentId: "prod" },
    );

    const loadedA = loadResult({
      workspaceId: "workspace-a",
      projectId: "project-a",
      environmentId: "prod",
    });
    const loadedB = loadResult({
      workspaceId: "workspace-a",
      projectId: "project-b",
      environmentId: "prod",
    });

    expect(loadedA?.analysis_id).toBe("analysis-project-a");
    expect(loadedB?.analysis_id).toBe("analysis-project-b");
  });
});
