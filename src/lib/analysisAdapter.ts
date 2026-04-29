import type { AnalysisResult } from "@/lib/api";

function toPercent(value: unknown): number {
  const n = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return Math.round(n * 100);
}

export function getAnalysisRunId(result: AnalysisResult): string | undefined {
  return result.analysis_run_id;
}

export function getAIHealthScore(result: AnalysisResult): number {
  return toPercent(result.argos_v2?.scores?.["AI_HEALTH_SCORE"]);
}

export function getBehaviorScore(result: AnalysisResult): number {
  return toPercent(result.argos_v2?.scores?.["BEHAVIOR_SCORE"]);
}

export function getConfidencePercent(result: AnalysisResult): number | undefined {
  return result.global_confidence;
}

export function getSemanticDrift(result: AnalysisResult): number {
  return toPercent(result.argos_v2?.signals?.["semantic"]?.["semantic_drift"]);
}

export function getSignalValue(
  result: AnalysisResult,
  category: string,
  keys: string[],
): number | undefined {
  const signals = result.argos_v2?.signals;
  if (!signals) return undefined;
  const group = signals[category];
  if (!group) return undefined;
  for (const key of keys) {
    if (key in group) return toPercent(group[key]);
  }
  return undefined;
}

export function getCostPerUsefulOutcome(result: AnalysisResult): number | undefined {
  const bi = result.business_impact;
  if (!bi) return undefined;
  const val = bi["cost_per_useful_outcome"];
  return typeof val === "number" ? val : undefined;
}

export function getExecutiveSummary(result: AnalysisResult): string | undefined {
  return result.executive_summary;
}

export function getBusinessImpact(
  result: AnalysisResult,
): Record<string, unknown> | undefined {
  return result.business_impact;
}

export function getBaselineComparison(
  result: AnalysisResult,
): Record<string, unknown> | undefined {
  return result.baseline_comparison;
}
