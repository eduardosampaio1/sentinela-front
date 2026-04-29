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
  Sprint4Raw,
  Sprint4RecommendationRaw,
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


// Engine version display names
const ENGINE_DISPLAY_NAMES: Record<string, string> = {
  '1.8.0-SCALE': 'ARGOS MK 3.5',
};
function normalizeEngineVersion(v: string | undefined): string | undefined {
  if (!v) return undefined;
  return ENGINE_DISPLAY_NAMES[v] ?? v;
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
  // Fallback: Pydantic-serialized canonical results store business_impact inside
  // economics_snapshot.snapshot (no argos_v2 key present in that format).
  const econSnapshot = asRecord((result as Record<string, unknown>).economics_snapshot);
  const snapshot = asRecord(econSnapshot.snapshot);
  const merged = { ...snapshot, ...argos, ...top };
  const mergedDetails = {
    ...asRecord(snapshot.details),
    ...asRecord(argos.details),
    ...asRecord(top.details),
  };
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

  // Sprint 3: ROI fields — read from business_impact or top-level payload
  const economicImpactRaw = asRecord(bi.economic_impact);
  const economicExplanationRaw = asRecord(bi.economic_explanation);
  const avoidedCostRangeRaw = asRecord(bi.avoided_cost_range ?? economicImpactRaw.avoided_cost_range);
  const driversRaw = asRecord(economicImpactRaw.drivers);

  const avoidedCost = asNumber(bi.avoided_cost ?? economicImpactRaw.avoided_cost);
  const optimizedCostEstimate = asNumber(bi.optimized_cost_estimate ?? economicImpactRaw.optimized_cost_estimate);
  const avoidedCostRange =
    avoidedCostRangeRaw && asNumber(avoidedCostRangeRaw.min) !== null
      ? { min: asNumber(avoidedCostRangeRaw.min) ?? 0, max: asNumber(avoidedCostRangeRaw.max) ?? 0 }
      : null;

  const economicImpact =
    avoidedCost !== null
      ? {
          currentCost: asNumber(economicImpactRaw.current_cost) ?? pickNum(["total_estimated_cost", "totalEstimatedCost"]) ?? 0,
          optimizedCostEstimate: optimizedCostEstimate ?? 0,
          avoidedCost,
          avoidedCostRange: avoidedCostRange ?? { min: 0, max: 0 },
          drivers: {
            tokenWaste: asNumber(driversRaw.token_waste) ?? 0,
            handoffInefficiency: asNumber(driversRaw.handoff_inefficiency) ?? 0,
            lowUsefulRate: asNumber(driversRaw.low_useful_rate) ?? 0,
          },
        }
      : null;

  const economicExplanation =
    Object.keys(economicExplanationRaw).length > 0
      ? {
          summary: asString(economicExplanationRaw.summary) ?? "",
          assumptions: Array.isArray(economicExplanationRaw.assumptions)
            ? (economicExplanationRaw.assumptions as unknown[]).map(String)
            : [],
          confidence: (asString(economicExplanationRaw.confidence) ?? "low") as "high" | "medium" | "low",
          lowDataWarning: asString(economicExplanationRaw.low_data_warning) ?? null,
        }
      : null;

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
    // Sprint 3
    avoidedCost,
    optimizedCostEstimate,
    avoidedCostRange,
    economicImpact,
    economicExplanation,
    economicModelVersion: asString(bi.economic_model_version) ?? null,
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

/** Converts snake/SCREAMING_SNAKE code to human-readable label.
 *  "HIGH_VARIANCE" → "High Variance"
 *  "cross_intent_reuse" → "Cross Intent Reuse"
 */
function codeToLabel(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return code
    .replace(/[-_]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Returns true if a title is a generic "Issue N" fallback baked in by older backend versions. */
function isGenericIssueTitle(title: string | undefined): boolean {
  return !title || /^Issue\s+\d+$/i.test(title.trim());
}

function normalizeIssue(raw: unknown): DomainIssue {
  const r = asRecord(raw);

  // Engine uses `issue_type`; contract serialization uses `code`.
  // Also try to extract a code from the fingerprint_id (e.g. "template_collapse:abc123").
  const code =
    asString(r.code) ??
    asString(r.issue_type) ??
    (() => {
      const fid = asString(r.fingerprint_id) ?? asString(r.issue_id);
      if (fid && fid.includes(":")) return fid.split(":")[0];
      return undefined;
    })();

  const rawTitle = asString(r.title);
  const title =
    (!isGenericIssueTitle(rawTitle) ? rawTitle : undefined) ??
    codeToLabel(code) ??
    asString(r.summary);

  // recommended_actions can be a list or a single string
  const rawActions = r.recommended_actions;
  const recommendedActions: string[] = Array.isArray(rawActions)
    ? (rawActions as unknown[]).map((a) => String(a)).filter(Boolean)
    : [];

  const recommendation =
    asString(r.recommendation) ??
    asString(r.recommended_action) ??
    recommendedActions[0];

  const evidence =
    typeof r.evidence === "object" && r.evidence !== null && !Array.isArray(r.evidence)
      ? (r.evidence as Record<string, unknown>)
      : undefined;

  const relatedIntents: string[] = Array.isArray(r.related_intents)
    ? (r.related_intents as unknown[]).map((i) => String(i)).filter(Boolean)
    : [];

  return {
    issueId: asString(r.fingerprint_id) ?? asString(r.issue_id),
    issueType: code,
    code,
    severity: asString(r.severity),
    confidence: asNumber(r.confidence) ?? undefined,
    title,
    summary: asString(r.summary),
    category: asString(r.category),
    metric: asString(r.metric),
    evidence,
    relatedIntents: relatedIntents.length > 0 ? relatedIntents : undefined,
    recommendation,
    recommendedActions: recommendedActions.length > 0 ? recommendedActions : undefined,
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

// ---- Sprint 4: Structured recommendation extractor ----

function normalizeSprint4Rec(raw: unknown): Sprint4RecommendationRaw | null {
  const r = asRecord(raw);
  if (!r || typeof r.id !== "string") return null;
  const impact = asRecord(r.impact);
  const evidence = asRecord(r.evidence);
  const action = asRecord(r.action);
  return {
    id: asString(r.id) ?? "",
    priority: asNumber(r.priority) ?? 1,
    title: asString(r.title) ?? "",
    problem: asString(r.problem) ?? asString(r.title) ?? "",
    impact: {
      type: asString(impact.type) ?? "quality",
      estimatedSavings: asNumber(impact.estimated_savings),
      riskReduction: (asString(impact.risk_reduction) ?? "low") as "high" | "medium" | "low",
    },
    evidence: {
      usefulRate: asNumber(evidence.useful_rate) ?? undefined,
      actualHandoffs: asNumber(evidence.actual_handoffs) ?? undefined,
      signals: Array.isArray(evidence.signals) ? (evidence.signals as unknown[]).map(String) : undefined,
    },
    action: {
      summary: asString(action.summary) ?? "",
      steps: Array.isArray(action.steps) ? (action.steps as unknown[]).map(String) : [],
      category: asString(action.category) ?? "",
    },
    confidence: asNumber(r.confidence) ?? 0,
    priorityScore: asNumber(r.priority_score) ?? 0,
    actionCategory: asString(r.action_category) ?? "",
  };
}

function extractSprint4(result: AnalysisResult): Sprint4Raw | null {
  const mk3 = asRecord(getArgosV2(result).argos_mk3);
  const s4 = asRecord(mk3.sprint4);
  if (!s4 || Object.keys(s4).length === 0) return null;

  const top = normalizeSprint4Rec(s4.top);
  const secondary = asArray<unknown>(s4.secondary)
    .map(normalizeSprint4Rec)
    .filter((r): r is Sprint4RecommendationRaw => r !== null);

  return {
    top,
    secondary,
    modelVersion: asString(s4.model_version) ?? "sprint4-v1",
  };
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
    // Identity — always populated: generate UUID if engine didn't provide one
    analysisId: asString(result.analysis_id) ?? crypto.randomUUID(),
    analysisRunId: extractAnalysisRunId(result) ?? crypto.randomUUID(),
    datasetHash: asString(result._cache_key),
    analyzedAt: result.analyzed_at ?? new Date().toISOString(),
    engineVersion: normalizeEngineVersion(asString(result.engine_version)),

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
    underrepresentedIntents: (result.underrepresented_intents ?? []).map((v: unknown): string => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && "intent" in (v as object))
        return String((v as Record<string, unknown>).intent);
      return String(v);
    }),

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

    // Sprint 4: Structured recommendation contract
    sprint4: extractSprint4(result),

    // Meta
    warnings: result._warnings ?? [],
    cacheKey: asString(result._cache_key),
  };
}
