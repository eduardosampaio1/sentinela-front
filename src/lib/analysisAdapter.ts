import type { AnalysisResult } from "./api";

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

export function normalizeToPercent(value: unknown): number | null {
  const raw = asNumber(value);
  if (raw === null) return null;
  if (raw >= 0 && raw <= 1) return Number((raw * 100).toFixed(2));
  return Number(raw.toFixed(2));
}

export function clampPercent(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(100, value));
}

export function getArgosV2(result: AnalysisResult | null): Record<string, unknown> {
  if (!result) return {};
  return asRecord(result.argos_v2);
}

export function getMetadata(result: AnalysisResult | null): Record<string, unknown> {
  return asRecord(getArgosV2(result).metadata);
}

export function getScores(result: AnalysisResult | null): Record<string, unknown> {
  return asRecord(getArgosV2(result).scores);
}

export function getSignals(result: AnalysisResult | null): Record<string, unknown> {
  return asRecord(getArgosV2(result).signals);
}

export function getSignalCategory(
  result: AnalysisResult | null,
  category: string,
): Record<string, unknown> {
  return asRecord(getSignals(result)[category]);
}

export function getSignalValue(
  result: AnalysisResult | null,
  category: string,
  keyCandidates: string[],
): number | null {
  const categoryRecord = getSignalCategory(result, category);
  for (const key of keyCandidates) {
    const value = clampPercent(normalizeToPercent(categoryRecord[key]));
    if (value !== null) return value;
  }
  return null;
}

export function getBaselineComparison(result: AnalysisResult | null): Record<string, unknown> {
  if (!result) return {};
  const top = asRecord(result.baseline_comparison);
  if (Object.keys(top).length > 0) return top;
  return asRecord(getMetadata(result).baseline_comparison);
}

export function getBusinessImpact(result: AnalysisResult | null): Record<string, unknown> {
  if (!result) return {};
  const top = asRecord(result.business_impact);
  if (Object.keys(top).length > 0) return top;
  return asRecord(getArgosV2(result).business_impact);
}

export function getExecutiveSummary(result: AnalysisResult | null): string | null {
  if (!result) return null;
  const top = String(result.executive_summary ?? "").trim();
  if (top) return top;
  const argos = String(getArgosV2(result).executive_summary ?? "").trim();
  return argos || null;
}

export function getEvidence(result: AnalysisResult | null): Record<string, unknown> {
  return asRecord(getArgosV2(result).evidence);
}

export function getAnalysisRunId(result: AnalysisResult | null): string | null {
  if (!result) return null;
  const top = typeof result.analysis_run_id === "string" ? result.analysis_run_id.trim() : "";
  if (top) return top;
  const metadata = getMetadata(result);
  for (const candidate of [metadata.analysis_run_id, metadata.job_id, metadata.run_id]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

export function getAIHealthScore(result: AnalysisResult | null): number | null {
  const scores = getScores(result);
  const candidates = [
    scores.AI_HEALTH_SCORE,
    scores.ai_health_score,
    result?.global_confidence,
  ];
  for (const candidate of candidates) {
    const value = clampPercent(normalizeToPercent(candidate));
    if (value !== null) return value;
  }
  return null;
}

export function getBehaviorScore(result: AnalysisResult | null): number | null {
  const scores = getScores(result);
  for (const candidate of [
    scores.BEHAVIOR_SCORE,
    scores.behavior_score,
    scores.AI_HEALTH_SCORE,
    scores.ai_health_score,
    result?.global_confidence,
  ]) {
    const value = clampPercent(normalizeToPercent(candidate));
    if (value !== null) return value;
  }
  return null;
}

export function getSemanticDrift(result: AnalysisResult | null): number | null {
  const semantic = getSignalCategory(result, "semantic");
  for (const candidate of [
    semantic.semantic_drift,
    semantic.semantic_dispersion,
    semantic.semantic_entropy,
    semantic.drift,
  ]) {
    const value = clampPercent(normalizeToPercent(candidate));
    if (value !== null) return value;
  }
  return null;
}

export function getConfidencePercent(result: AnalysisResult | null): number | null {
  return clampPercent(normalizeToPercent(result?.global_confidence));
}

export function getCostPerUsefulOutcome(result: AnalysisResult | null): number | null {
  const scores = getScores(result);
  const businessImpact = getBusinessImpact(result);
  const candidates = [
    scores.COST_PER_USEFUL_OUTCOME,
    scores.cost_per_useful_outcome,
    scores.costPerUsefulOutcome,
    businessImpact.cost_per_useful_outcome,
    businessImpact.costPerUsefulOutcome,
  ];

  for (const candidate of candidates) {
    const value = asNumber(candidate);
    if (value !== null) return Number(value.toFixed(4));
  }
  return null;
}


function pickBusinessImpactNumber(
  result: AnalysisResult | null,
  keyCandidates: string[],
): number | null {
  const businessImpact = getBusinessImpact(result);
  for (const key of keyCandidates) {
    const value = asNumber(businessImpact[key]);
    if (value !== null) return value;
  }
  return null;
}

export function getUsefulOutcomes(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["useful_outcomes", "usefulOutcomes"]);
}

export function getUsefulRate(result: AnalysisResult | null): number | null {
  const value = pickBusinessImpactNumber(result, ["useful_rate", "usefulRate"]);
  if (value === null) return null;
  return normalizeToPercent(value);
}

export function getTotalEstimatedCost(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["total_estimated_cost", "totalEstimatedCost"]);
}

export function getObservedTokenCostTotal(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["observed_token_cost_total", "observedTokenCostTotal"]);
}

export function getObservedHandoffCostTotal(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["observed_handoff_cost_total", "observedHandoffCostTotal"]);
}

export function getTokenCostWaste(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["token_cost_waste", "tokenCostWaste"]);
}

export function getEstimatedHandoffCost(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["estimated_handoff_cost", "estimatedHandoffCost"]);
}

export function getConversionRisk(result: AnalysisResult | null): number | null {
  const value = pickBusinessImpactNumber(result, ["conversion_risk", "conversionRisk"]);
  if (value === null) return null;
  return normalizeToPercent(value);
}

export function getTokenCostMonthly(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["token_cost_monthly", "tokenCostMonthly"]);
}

export function getTokenCostYearly(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["token_cost_yearly", "tokenCostYearly"]);
}

export function getHandoffCostMonthly(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["handoff_cost_monthly", "handoffCostMonthly"]);
}

export function getHandoffCostYearly(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["handoff_cost_yearly", "handoffCostYearly"]);
}

export function getActualHandoffs(result: AnalysisResult | null): number | null {
  return pickBusinessImpactNumber(result, ["actual_handoffs", "actualHandoffs"]);
}
