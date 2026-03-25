// ============================================================
// Analysis Adapter
// Transforms raw API AnalysisResult into DomainAnalysis
// ============================================================

import type { AnalysisResult } from "@/lib/api";
import type {
  DomainAnalysis,
  DomainAlert,
  DomainIssue,
  DomainIntentScore,
  DomainRecommendation,
  DomainBusinessImpact,
  DomainArgosScores,
  DomainArgosSignals,
} from "@/domain/analysis.types";

// ---- Utility helpers ----

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function normalizeToPercent(value: unknown): number | null {
  const raw = asNumber(value);
  if (raw === null) return null;
  if (raw >= 0 && raw <= 1) return Number((raw * 100).toFixed(2));
  return Number(raw.toFixed(2));
}

function clampPercent(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(100, value));
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// ---- Argos v2 helpers ----

function getArgosV2(result: AnalysisResult): Record<string, unknown> {
  return asRecord(result.argos_v2);
}

function getScores(result: AnalysisResult): Record<string, unknown> {
  return asRecord(getArgosV2(result).scores);
}

function getSignals(result: AnalysisResult): Record<string, unknown> {
  return asRecord(getArgosV2(result).signals);
}

function getMetadata(result: AnalysisResult): Record<string, unknown> {
  return asRecord(getArgosV2(result).metadata);
}

function getBusinessImpactRaw(result: AnalysisResult): Record<string, unknown> {
  const top = asRecord(result.business_impact);
  const argos = asRecord(getArgosV2(result).business_impact);
  const merged = { ...argos, ...top };
  const mergedDetails = { ...asRecord(argos.details), ...asRecord(top.details) };
  if (Object.keys(mergedDetails).length > 0) merged.details = mergedDetails;
  return merged;
}

// ---- Score extractors ----

export function extractAIHealthScore(result: AnalysisResult): number | null {
  const scores = getScores(result);
  const candidates = [scores.AI_HEALTH_SCORE, scores.ai_health_score, result.global_confidence];
  for (const c of candidates) {
    const v = clampPercent(normalizeToPercent(c));
    if (v !== null) return v;
  }
  return null;
}

export function extractBehaviorScore(result: AnalysisResult): number | null {
  const scores = getScores(result);
  for (const c of [
    scores.BEHAVIOR_SCORE,
    scores.behavior_score,
    scores.AI_HEALTH_SCORE,
    scores.ai_health_score,
    result.global_confidence,
  ]) {
    const v = clampPercent(normalizeToPercent(c));
    if (v !== null) return v;
  }
  return null;
}

export function extractSemanticDrift(result: AnalysisResult): number | null {
  const semantic = asRecord(getSignals(result).semantic);
  for (const c of [
    semantic.semantic_drift,
    semantic.semantic_dispersion,
    semantic.semantic_entropy,
    semantic.drift,
  ]) {
    const v = clampPercent(normalizeToPercent(c));
    if (v !== null) return v;
  }
  return null;
}

export function extractConfidencePercent(result: AnalysisResult): number | null {
  return clampPercent(normalizeToPercent(result.global_confidence));
}

// ---- Business impact extractor ----

function extractBusinessImpact(result: AnalysisResult): DomainBusinessImpact {
  const bi = getBusinessImpactRaw(result);
  const scores = getScores(result);

  const pickNum = (keys: string[]): number | null => {
    for (const key of keys) {
      const v = asNumber(bi[key]);
      if (v !== null) return v;
    }
    return null;
  };

  const cpuo = (() => {
    const candidates = [
      bi.cost_per_useful_outcome,
      bi.costPerUsefulOutcome,
      scores.COST_PER_USEFUL_OUTCOME,
      scores.cost_per_useful_outcome,
    ];
    for (const c of candidates) {
      const v = asNumber(c);
      if (v !== null) return Number(v.toFixed(4));
    }
    return null;
  })();

  const usefulRate = (() => {
    const raw = pickNum(["useful_rate", "usefulRate"]);
    if (raw === null) return null;
    return normalizeToPercent(raw);
  })();

  const conversionRisk = (() => {
    const raw = pickNum(["conversion_risk", "conversionRisk"]);
    if (raw === null) return null;
    return normalizeToPercent(raw);
  })();

  return {
    costPerUsefulOutcome: cpuo,
    usefulRate,
    usefulOutcomes: pickNum(["useful_outcomes", "usefulOutcomes"]),
    totalEstimatedCost: pickNum(["total_estimated_cost", "totalEstimatedCost"]),
    observedTokenCostTotal: pickNum(["observed_token_cost_total", "observedTokenCostTotal"]),
    observedHandoffCostTotal: pickNum(["observed_handoff_cost_total", "observedHandoffCostTotal"]),
    tokenCostWaste: pickNum(["token_cost_waste", "tokenCostWaste"]),
    estimatedHandoffCost: pickNum(["estimated_handoff_cost", "estimatedHandoffCost"]),
    conversionRisk,
    tokenCostMonthly: pickNum(["token_cost_monthly", "tokenCostMonthly"]),
    tokenCostYearly: pickNum(["token_cost_yearly", "tokenCostYearly"]),
    handoffCostMonthly: pickNum(["handoff_cost_monthly", "handoffCostMonthly"]),
    handoffCostYearly: pickNum(["handoff_cost_yearly", "handoffCostYearly"]),
    actualHandoffs: pickNum(["actual_handoffs", "actualHandoffs"]),
  };
}

// ---- Alert normalization ----

let alertCounter = 0;

function normalizeAlert(raw: unknown): DomainAlert {
  const r = asRecord(raw);
  alertCounter += 1;
  return {
    id: asString(r.id) ?? `alert-${alertCounter}`,
    severity: (asString(r.severity) ?? "info") as DomainAlert["severity"],
    intent: asString(r.intent) ?? null,
    title: asString(r.title) ?? asString(r.problem) ?? "Alert",
    problem: asString(r.problem) ?? asString(r.title) ?? "",
    recommendation: asString(r.recommendation) ?? "",
    firstSeen: asString(r.first_seen),
    lastSeen: asString(r.last_seen),
    status: (asString(r.status) as "open" | "resolved") ?? "open",
  };
}

// ---- Issue normalization ----

function normalizeIssue(raw: unknown): DomainIssue {
  const r = asRecord(raw);
  return {
    issueId: asString(r.issue_id),
    issueType: asString(r.issue_type),
    severity: asString(r.severity),
    confidence: asNumber(r.confidence) ?? undefined,
    title: asString(r.title) ?? asString(r.summary),
    summary: asString(r.summary),
    category: asString(r.category),
    recommendation: asString(r.recommendation),
  };
}

// ---- Intent score normalization ----

function normalizeIntentScore(raw: unknown): DomainIntentScore {
  const r = asRecord(raw);
  return {
    intent: asString(r.intent) ?? "unknown",
    score: asNumber(r.score) ?? asNumber(r.consistency_score) ?? 0,
    nConversations: asNumber(r.n_conversations) ?? undefined,
    responseVariance: asNumber(r.response_variance) ?? undefined,
    responseStabilityScore: asNumber(r.response_stability_score) ?? undefined,
    meanAssistantChars: asNumber(r.mean_assistant_chars) ?? undefined,
    stdAssistantChars: asNumber(r.std_assistant_chars) ?? undefined,
    severity: asString(r.severity),
  };
}

// ---- Recommendation normalization ----

function normalizeRecommendation(raw: unknown): DomainRecommendation {
  const r = asRecord(raw);
  return {
    priority: asNumber(r.priority) ?? undefined,
    action: asString(r.action),
    title: asString(r.title) ?? asString(r.action),
    reason: asString(r.reason),
    expectedImpact: asString(r.expected_effect) ?? asString(r.expected_impact) ?? asString(r.expectedImpact),
  };
}

// ---- Scores extraction ----

function extractDomainScores(result: AnalysisResult): DomainArgosScores {
  const raw = getScores(result);
  const scores: DomainArgosScores = {};
  for (const [key, value] of Object.entries(raw)) {
    const num = clampPercent(normalizeToPercent(value));
    scores[key] = num;
  }
  scores.aiHealthScore = extractAIHealthScore(result);
  scores.behaviorScore = extractBehaviorScore(result);
  return scores;
}

// ---- Signals extraction ----

function extractDomainSignals(result: AnalysisResult): DomainArgosSignals {
  const raw = getSignals(result);
  const signals: DomainArgosSignals = {};
  for (const [category, value] of Object.entries(raw)) {
    if (typeof value === "object" && value !== null) {
      signals[category] = value as Record<string, number>;
    }
  }
  return signals;
}

// ---- Analysis Run ID ----

function extractAnalysisRunId(result: AnalysisResult): string | undefined {
  const top = typeof result.analysis_run_id === "string" ? result.analysis_run_id.trim() : "";
  if (top) return top;
  const metadata = getMetadata(result);
  for (const candidate of [metadata.analysis_run_id, metadata.job_id, metadata.run_id]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return undefined;
}

// ---- Main adapter function ----

export function adaptAnalysisResult(result: AnalysisResult): DomainAnalysis {
  const argosV2 = getArgosV2(result);
  const rawAlerts = asArray<unknown>(result.alerts);
  const rawIssues = asArray<unknown>(result.issues ?? asArray<unknown>(argosV2.issues));
  const rawIntents = asArray<unknown>(result.intents);
  const rawRecommendations = asArray<unknown>(argosV2.recommendations);

  const executiveSummary = (() => {
    const top = typeof result.executive_summary === "string" ? result.executive_summary.trim() : "";
    if (top) return top;
    const argos = typeof argosV2.executive_summary === "string" ? argosV2.executive_summary.trim() : "";
    return argos || null;
  })();

  return {
    // Identity
    analysisId: asString(result.analysis_id),
    analysisRunId: extractAnalysisRunId(result),
    datasetHash: asString(result._cache_key),
    analyzedAt: result.analyzed_at ?? new Date().toISOString(),
    engineVersion: asString(result.engine_version),

    // Context
    workspaceId: asString(result.workspace_id),
    projectId: asString(result.project_id),
    environmentId: asString(result.environment_id),

    // Core metrics
    consistencyScore: result.consistency_score ?? 0,
    globalConfidence: extractConfidencePercent(result),
    riskLevel: result.risk_level as DomainAnalysis["riskLevel"],
    nConversations: result.n_conversations,
    nIntents: result.n_intents,

    // Behavior
    tokenWasteEstimate: result.token_waste_estimate ?? 0,
    crossIntentSimilarity: result.cross_intent_similarity ?? 0,
    responseVariance: asNumber(result.response_variance),
    responseStabilityScore: asNumber(result.response_stability_score),
    intentCoverageScore: asNumber(result.intent_coverage_score),
    coveredIntents: asNumber(result.covered_intents),
    totalIntents: asNumber(result.total_intents),
    minSamplesPerIntent: asNumber(result.min_samples_per_intent),
    underrepresentedIntents: result.underrepresented_intents ?? [],

    // Alerts and issues
    criticalAlertsCount: result.critical_alerts_count ?? 0,
    alerts: rawAlerts.map(normalizeAlert),
    issues: rawIssues.map(normalizeIssue),

    // Intents
    intents: rawIntents.map(normalizeIntentScore),

    // Deep analysis
    scores: extractDomainScores(result),
    signals: extractDomainSignals(result),
    recommendations: rawRecommendations.map(normalizeRecommendation),
    businessImpact: extractBusinessImpact(result),
    executiveSummary: executiveSummary ?? null,

    // Computed
    behaviorScore: extractBehaviorScore(result),
    semanticDrift: extractSemanticDrift(result),
    aiHealthScore: extractAIHealthScore(result),

    // Meta
    warnings: result._warnings ?? [],
    cacheKey: asString(result._cache_key),
  };
}
