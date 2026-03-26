import type { AnalysisResult } from "./api";
import {
  getAIHealthScore,
  getArgosV2,
  getBaselineComparison,
  getConfidencePercent,
  getSignalValue as readSignalValue,
} from "./analysisAdapter";

type TrendDirection = "up" | "down" | "flat";
type IndicatorTone = "healthy" | "watch" | "risk";

export interface OverviewRow {
  label: string;
  value: string;
}

export interface SignalCardModel {
  id: string;
  title: string;
  score: number | null;
  trend: TrendDirection;
  indicator: IndicatorTone;
  direction: "higher_better" | "lower_better";
}

export interface ProblemItem {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  impact: string;
  affectedInteractions: string;
  evidence?: string;
}

export interface RecommendationItem {
  id: string;
  title: string;
  reason: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
  category: string;
}

export interface InteractionPanelModel {
  mode: "full" | "sampled";
  sampleSize: number;
  populationSize: number;
  confidence: number | null;
  explanation: string;
  pseudoIntentMode: "explicit" | "inferred";
  pseudoIntentConfidence: number | null;
  pseudoIntentMethod: string;
  pseudoIntentLimitations: string[];
  metrics: Array<{
    id: string;
    label: string;
    value: number | null;
    preferred: "higher_better" | "lower_better";
  }>;
}

export interface HealthHeaderModel {
  aiHealthScore: number | null;
  riskLevel: string;
  confidence: number | null;
  status: string;
  summary: string;
}

export type RiskTrend = "Improving" | "Stable" | "Regressing";

export interface RiskOverviewModel {
  riskLevel: string;
  aiHealthScore: number | null;
  confidence: number | null;
  trend: RiskTrend;
  topRisks: ProblemItem[];
}

export interface StabilityTrendMetric {
  id: string;
  label: string;
  current: number | null;
  trend: RiskTrend;
}

export interface StabilityTrendModel {
  trend: RiskTrend;
  regressionDetected: boolean;
  baselineAvailable: boolean;
  summary: string;
  metrics: StabilityTrendMetric[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function toScore(value: unknown): number | null {
  const raw = asNumber(value);
  if (raw === null) return null;
  if (raw >= 0 && raw <= 1) return Number((raw * 100).toFixed(2));
  return Number(raw.toFixed(2));
}

function clampScore(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(100, value));
}

function normalizeSeverity(value: unknown): "low" | "medium" | "high" | "critical" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high" || normalized === "warn") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

function getSignalValue(
  result: AnalysisResult | null,
  category: string,
  keyCandidates: string[],
): number | null {
  return readSignalValue(result, category, keyCandidates);
}

function trendFromDelta(delta: number | null): TrendDirection {
  if (delta === null) return "flat";
  if (delta > 0.25) return "up";
  if (delta < -0.25) return "down";
  return "flat";
}

function invertTrend(trend: TrendDirection): TrendDirection {
  if (trend === "up") return "down";
  if (trend === "down") return "up";
  return "flat";
}

function indicatorFromScore(
  score: number | null,
  direction: "higher_better" | "lower_better",
): IndicatorTone {
  if (score === null) return "watch";

  const normalized = direction === "higher_better" ? score : 100 - score;
  if (normalized >= 70) return "healthy";
  if (normalized >= 45) return "watch";
  return "risk";
}

function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return "N/A";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "N/A";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function confidenceLevel(result: AnalysisResult | null): string {
  const source = getConfidencePercent(result) ?? getAIHealthScore(result);
  if (source === null) return "Unknown";
  if (source >= 75) return "High";
  if (source >= 50) return "Medium";
  return "Low";
}

function pickAiHealthScore(result: AnalysisResult | null): number | null {
  return getAIHealthScore(result);
}

function riskLabel(risk?: string): string {
  const normalized = String(risk ?? "").toUpperCase();
  if (normalized === "HIGH") return "High Risk";
  if (normalized === "MODERATE" || normalized === "MEDIUM") return "Moderate Risk";
  if (normalized === "LOW") return "Low Risk";
  return "Unknown Risk";
}

function hasBaselineComparison(result: AnalysisResult | null) {
  return Object.keys(getBaselineComparison(result)).length > 0;
}

function riskTrendFromBaseline(result: AnalysisResult | null): RiskTrend {
  const baseline = getBaselineComparison(result);
  if (Object.keys(baseline).length === 0) return "Stable";

  const aiHealthDelta = asNumber(baseline.delta_ai_health_score);
  const containmentDelta = asNumber(baseline.delta_containment_risk);
  const conversionDelta = asNumber(baseline.delta_conversion_risk);

  if (
    (aiHealthDelta !== null && aiHealthDelta <= -1) ||
    (containmentDelta !== null && containmentDelta >= 0.03) ||
    (conversionDelta !== null && conversionDelta >= 0.03)
  ) {
    return "Regressing";
  }

  if (
    (aiHealthDelta !== null && aiHealthDelta >= 1) &&
    (containmentDelta === null || containmentDelta <= -0.01) &&
    (conversionDelta === null || conversionDelta <= -0.01)
  ) {
    return "Improving";
  }

  return "Stable";
}

function trendFromScoreBand(
  score: number | null,
  preferred: "higher_better" | "lower_better",
): RiskTrend {
  if (score === null) return "Stable";

  const normalized = preferred === "higher_better" ? score : 100 - score;
  if (normalized >= 70) return "Improving";
  if (normalized <= 45) return "Regressing";
  return "Stable";
}

export function formatScore(score: number | null, decimals = 1): string {
  if (score === null) return "N/A";
  return `${score.toFixed(decimals)}`;
}

export function formatPercent(score: number | null, decimals = 1): string {
  if (score === null) return "N/A";
  return `${score.toFixed(decimals)}%`;
}

export function trendLabel(trend: TrendDirection): string {
  if (trend === "up") return "Up";
  if (trend === "down") return "Down";
  return "Stable";
}

export function indicatorLabel(indicator: IndicatorTone): string {
  if (indicator === "healthy") return "Healthy";
  if (indicator === "risk") return "Critical";
  return "Watch";
}

export function overviewRows(
  workspaceName: string | null | undefined,
  result: AnalysisResult | null,
): OverviewRow[] {
  const datasetSize = result?.n_conversations ?? 0;
  return [
    { label: "Workspace", value: workspaceName || "Default workspace" },
    { label: "Dataset Size", value: `${datasetSize.toLocaleString()} interactions` },
    { label: "Last Analysis", value: formatRelativeTime(result?.analyzed_at) },
    { label: "Confidence Level", value: confidenceLevel(result) },
  ];
}

export function healthHeaderModel(result: AnalysisResult | null): HealthHeaderModel {
  const aiHealth = pickAiHealthScore(result);
  const confidence = toScore(result?.global_confidence);
  const level = confidenceLevel(result);
  const risk = riskLabel(result?.risk_level);
  const summary =
    level === "High"
      ? "System behavior is mostly stable. Focus on targeted optimization opportunities."
      : level === "Medium"
        ? "System shows mixed stability. Prioritize high-impact problems first."
        : "System needs intervention. Address critical problems before scaling traffic.";

  return {
    aiHealthScore: aiHealth,
    riskLevel: risk,
    confidence,
    status: level,
    summary,
  };
}

export function riskOverviewModel(result: AnalysisResult | null): RiskOverviewModel {
  return {
    riskLevel: riskLabel(result?.risk_level),
    aiHealthScore: pickAiHealthScore(result),
    confidence: toScore(result?.global_confidence),
    trend: riskTrendFromBaseline(result),
    topRisks: detectedProblems(result).slice(0, 3),
  };
}

export function stabilityTrendModel(result: AnalysisResult | null): StabilityTrendModel {
  const interaction = interactionPanelModel(result);
  const semanticDriftScore =
    getSignalValue(result, "semantic", ["semantic_dispersion", "semantic_drift"]) ??
    getSignalValue(result, "semantic", ["semantic_entropy"]);
  const tokenEfficiency =
    getSignalValue(result, "economic", ["token_efficiency", "verbosity_efficiency"]) ??
    (result?.token_waste_estimate !== undefined
      ? clampScore(100 - (toScore(result.token_waste_estimate) ?? 0))
      : null);

  const baselineTrend = riskTrendFromBaseline(result);
  const baselineAvailable = hasBaselineComparison(result);

  const metrics: StabilityTrendMetric[] = [
    {
      id: "instruction-persistence",
      label: "Instruction persistence",
      current: interaction.metrics.find((metric) => metric.id === "instruction-persistence")?.value ?? null,
      trend: trendFromScoreBand(
        interaction.metrics.find((metric) => metric.id === "instruction-persistence")?.value ?? null,
        "higher_better",
      ),
    },
    {
      id: "context-retention",
      label: "Context retention",
      current: interaction.metrics.find((metric) => metric.id === "context-retention")?.value ?? null,
      trend: trendFromScoreBand(
        interaction.metrics.find((metric) => metric.id === "context-retention")?.value ?? null,
        "higher_better",
      ),
    },
    {
      id: "semantic-drift",
      label: "Semantic drift",
      current: semanticDriftScore,
      trend: trendFromScoreBand(semanticDriftScore, "lower_better"),
    },
    {
      id: "token-efficiency",
      label: "Token efficiency",
      current: tokenEfficiency,
      trend: trendFromScoreBand(tokenEfficiency, "higher_better"),
    },
  ];

  const regressionDetected =
    baselineTrend === "Regressing" || metrics.some((metric) => metric.trend === "Regressing");

  return {
    trend: baselineAvailable ? baselineTrend : metrics.every((metric) => metric.trend === "Stable") ? "Stable" : metrics.some((metric) => metric.trend === "Regressing") ? "Regressing" : "Improving",
    regressionDetected,
    baselineAvailable,
    summary: baselineAvailable
      ? "Trend based on baseline comparison between current and previous analysis."
      : "Baseline comparison not available; trend inferred from current stability signal bands.",
    metrics,
  };
}

export function keyMetricsCards(result: AnalysisResult | null): SignalCardModel[] {
  const semanticDispersion =
    getSignalValue(result, "semantic", ["semantic_dispersion", "dispersion"]) ??
    getSignalValue(result, "semantic", ["semantic_entropy"]);

  const consistency = toScore(result?.consistency_score ?? null);
  const responseStability =
    getSignalValue(result, "behavioral", ["response_stability"]) ??
    toScore(result?.response_stability_score ?? null);
  const tokenEfficiency =
    getSignalValue(result, "economic", ["token_efficiency", "verbosity_efficiency"]) ??
    (result?.token_waste_estimate !== undefined
      ? clampScore(100 - (toScore(result.token_waste_estimate) ?? 0))
      : null);

  const baseline = getBaselineComparison(result);
  const aiHealthDelta = asNumber(baseline.delta_ai_health_score);
  const containmentDelta = asNumber(baseline.delta_containment_risk);
  const conversionDelta = asNumber(baseline.delta_conversion_risk);

  return [
    {
      id: "semantic-dispersion",
      title: "Semantic Dispersion",
      score: clampScore(semanticDispersion),
      trend: invertTrend(trendFromDelta(conversionDelta)),
      indicator: indicatorFromScore(semanticDispersion, "lower_better"),
      direction: "lower_better",
    },
    {
      id: "response-consistency",
      title: "Response Consistency",
      score: clampScore(consistency),
      trend: trendFromDelta(aiHealthDelta),
      indicator: indicatorFromScore(consistency, "higher_better"),
      direction: "higher_better",
    },
    {
      id: "response-stability",
      title: "Response Stability",
      score: clampScore(responseStability),
      trend: invertTrend(trendFromDelta(containmentDelta)),
      indicator: indicatorFromScore(responseStability, "higher_better"),
      direction: "higher_better",
    },
    {
      id: "token-efficiency",
      title: "Token Efficiency",
      score: clampScore(tokenEfficiency),
      trend: invertTrend(trendFromDelta(containmentDelta)),
      indicator: indicatorFromScore(tokenEfficiency, "higher_better"),
      direction: "higher_better",
    },
  ];
}

function affectedInteractionLabel(issue: Record<string, unknown>): string {
  const affectedIntents = Array.isArray(issue.affected_intents)
    ? issue.affected_intents.map((item) => String(item)).filter(Boolean)
    : [];
  if (affectedIntents.length) return `${affectedIntents.length} intents`;
  const evidenceExamples = Array.isArray(issue.evidence_examples) ? issue.evidence_examples.length : 0;
  if (evidenceExamples > 0) return `${evidenceExamples} examples`;
  const conversations = asNumber(issue.affected_interactions) ?? asNumber(issue.affected_count);
  if (conversations !== null) return `${Math.round(conversations)} interactions`;
  return "Scope not provided";
}

function issueImpact(issue: Record<string, unknown>): string {
  const explicitImpact = String(issue.impact ?? issue.severity_reason ?? issue.summary ?? "").trim();
  if (explicitImpact) return explicitImpact;
  const type = String(issue.issue_type ?? issue.category ?? "").toLowerCase();
  if (type.includes("token") || type.includes("verbosity")) return "Higher operating cost and slower conversations.";
  if (type.includes("drift") || type.includes("stability")) return "Lower consistency across similar interactions.";
  if (type.includes("fallback") || type.includes("collapse")) return "Potentially generic answers and low resolution rate.";
  return "Can reduce answer quality and increase escalation risk.";
}

function issueEvidence(issue: Record<string, unknown>): string | undefined {
  const metricEvidence = asRecord(issue.supporting_metrics);
  if (Object.keys(metricEvidence).length > 0) {
    const keys = Object.keys(metricEvidence).slice(0, 3);
    return `Signals: ${keys.join(", ")}`;
  }
  const text = String(issue.summary ?? issue.title ?? "").trim();
  return text || undefined;
}

export function detectedProblems(result: AnalysisResult | null): ProblemItem[] {
  if (!result) return [];

  const argosIssues = Array.isArray(result.argos_v2?.issues) ? result.argos_v2?.issues : [];
  const rawIssues = Array.isArray(result.issues) ? result.issues : [];
  const source = (argosIssues && argosIssues.length > 0 ? argosIssues : rawIssues) as Array<Record<string, unknown>>;

  const items = source.map((issue, index) => {
    const title = String(
      issue.title ??
        issue.summary ??
        issue.issue_type ??
        issue.category ??
        `Detected issue ${index + 1}`,
    ).trim();
    return {
      id: String(issue.issue_id ?? `${title}-${index}`),
      title,
      severity: normalizeSeverity(issue.severity),
      impact: issueImpact(issue),
      affectedInteractions: affectedInteractionLabel(issue),
      evidence: issueEvidence(issue),
    };
  });

  if (items.length > 0) {
    return items.sort((left, right) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[left.severity] - order[right.severity];
    });
  }

  return (result.alerts ?? []).slice(0, 8).map((alert, index) => ({
    id: `alert-${index}`,
    title: alert.title,
    severity: normalizeSeverity(alert.severity),
    impact: alert.hint || "Potential behavioral quality risk.",
    affectedInteractions: alert.intent ? `Intent: ${alert.intent}` : "Cross-intent signal",
    evidence: alert.recommendation,
  }));
}

function recommendationPriority(value: unknown): "high" | "medium" | "low" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "high" || normalized === "critical") return "high";
  if (normalized === "low") return "low";
  return "medium";
}

function normalizeRecommendationItem(
  item: Record<string, unknown>,
  index: number,
  category: string,
): RecommendationItem {
  const title = String(
    item.action ??
      item.title ??
      item.recommendation ??
      item.candidate ??
      `Recommendation ${index + 1}`,
  ).trim();
  const reason = String(
    item.reason ??
      item.because ??
      item.rationale ??
      item.why ??
      item.description ??
      "",
  ).trim();
  const expectedImpact = String(
    item.expected_effect ??
      item.impact ??
      item.expectedImpact ??
      item.outcome ??
      "",
  ).trim();
  return {
    id: `${category}-${index}-${title}`,
    title,
    reason: reason || "Based on detected risk and behavior patterns in this analysis.",
    expectedImpact: expectedImpact || "Expected to improve quality, safety, or efficiency.",
    priority: recommendationPriority(item.priority ?? item.severity),
    category,
  };
}

export function recommendedActions(result: AnalysisResult | null): RecommendationItem[] {
  if (!result) return [];
  const argos = getArgosV2(result);
  const collected: RecommendationItem[] = [];
  const seen = new Set<string>();

  const pushFromArray = (raw: unknown, category: string) => {
    if (!Array.isArray(raw)) return;
    raw.forEach((entry, index) => {
      const record = asRecord(entry);
      const item = normalizeRecommendationItem(record, index, category);
      const key = `${item.title}|${item.reason}`;
      if (seen.has(key)) return;
      seen.add(key);
      collected.push(item);
    });
  };

  pushFromArray(argos.recommendations, "analysis");
  pushFromArray(argos.runtime_recommendation_candidates, "adaptive");
  pushFromArray(argos.guardrail_candidate_hints, "guardrails");
  pushFromArray(argos.rewrite_candidate_hints, "rewrite");
  pushFromArray(argos.adaptive_candidate_hints, "adaptive");

  (result.alerts ?? []).forEach((alert, index) => {
    if (!alert.recommendation) return;
    const item = normalizeRecommendationItem(
      {
        action: alert.title,
        reason: alert.hint,
        expected_effect: alert.recommendation,
        severity: alert.severity,
      },
      index,
      "alerts",
    );
    const key = `${item.title}|${item.reason}`;
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(item);
  });

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return collected
    .sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority])
    .slice(0, 10);
}

function interactionMode(result: AnalysisResult | null): Record<string, unknown> {
  const argos = getArgosV2(result);
  const direct = asRecord(argos.interaction_analysis_mode);
  if (Object.keys(direct).length > 0) return direct;
  return asRecord(asRecord(argos.evidence).interaction_analysis_mode);
}

function interactionOptionality(result: AnalysisResult | null): Record<string, unknown> {
  const argos = getArgosV2(result);
  return asRecord(asRecord(argos.evidence).intent_optionality);
}

function interactionSummary(result: AnalysisResult | null): Record<string, unknown> {
  const argos = getArgosV2(result);
  return asRecord(asRecord(argos.evidence).interaction_session_metrics_summary);
}

export function interactionPanelModel(result: AnalysisResult | null): InteractionPanelModel {
  const mode = interactionMode(result);
  const optionality = interactionOptionality(result);
  const summary = interactionSummary(result);

  const metrics = [
    {
      id: "session-drift",
      label: "Session Drift",
      value: toScore(summary.session_drift_score),
      preferred: "lower_better" as const,
    },
    {
      id: "context-retention",
      label: "Context Retention",
      value: toScore(summary.context_retention_score),
      preferred: "higher_better" as const,
    },
    {
      id: "instruction-persistence",
      label: "Instruction Persistence",
      value: toScore(summary.instruction_persistence_score),
      preferred: "higher_better" as const,
    },
    {
      id: "task-mutation",
      label: "Task Mutation",
      value: toScore(summary.task_mutation_score),
      preferred: "lower_better" as const,
    },
    {
      id: "reformulation-pressure",
      label: "Reformulation Pressure",
      value: toScore(summary.reformulation_pressure_score),
      preferred: "lower_better" as const,
    },
  ];

  return {
    mode: String(mode.interaction_metrics_mode ?? "full") === "sampled" ? "sampled" : "full",
    sampleSize:
      typeof mode.interaction_metrics_sample_size === "number"
        ? mode.interaction_metrics_sample_size
        : 0,
    populationSize:
      typeof mode.interaction_metrics_population_size === "number"
        ? mode.interaction_metrics_population_size
        : 0,
    confidence: toScore(mode.interaction_metrics_confidence),
    explanation:
      String(mode.interaction_metrics_explanation ?? "").trim() ||
      "Interaction metrics computed from the full interaction population.",
    pseudoIntentMode:
      String(optionality.pseudo_intent_mode ?? "").trim().toLowerCase() === "inferred"
        ? "inferred"
        : "explicit",
    pseudoIntentConfidence: toScore(optionality.pseudo_intent_confidence),
    pseudoIntentMethod: String(optionality.pseudo_intent_method ?? "explicit_intent_mode"),
    pseudoIntentLimitations: Array.isArray(optionality.pseudo_intent_limitations)
      ? optionality.pseudo_intent_limitations.map(String)
      : [],
    metrics,
  };
}

export function guardrailSummary(result: AnalysisResult | null): Array<{ label: string; value: string }> {
  if (!result) return [];
  const issues = detectedProblems(result);
  const highSeverity = issues.filter((item) => item.severity === "high" || item.severity === "critical");
  const drift = issues.filter((item) => item.title.toLowerCase().includes("drift"));
  const instability = issues.filter((item) => item.title.toLowerCase().includes("instability"));
  return [
    { label: "Detected Risks", value: `${issues.length}` },
    { label: "High Severity", value: `${highSeverity.length}` },
    { label: "Drift Signals", value: `${drift.length}` },
    { label: "Instability Signals", value: `${instability.length}` },
  ];
}

export function diagnosticsSignals(result: AnalysisResult | null): Array<{ label: string; score: number | null }> {
  return [
    {
      label: "Behavioral Drift",
      score: getSignalValue(result, "behavioral", ["behavioral_shift", "response_variance"]),
    },
    {
      label: "Intent Entropy",
      score: getSignalValue(result, "behavioral", ["intent_entropy", "intent_instability"]),
    },
    {
      label: "Template Collapse",
      score: getSignalValue(result, "structural", ["template_collapse"]),
    },
    {
      label: "Fallback Overuse",
      score: getSignalValue(result, "structural", ["fallback_overuse", "generic_pattern_rate"]),
    },
  ];
}

export function optimizationSignals(result: AnalysisResult | null): Array<{ label: string; score: number | null }> {
  const aiHealth = pickAiHealthScore(result);
  return [
    { label: "System Stability", score: aiHealth },
    { label: "Semantic Entropy", score: getSignalValue(result, "semantic", ["semantic_entropy"]) },
    {
      label: "Cross-Intent Contamination",
      score: getSignalValue(result, "behavioral", ["cross_intent_contamination"]),
    },
    {
      label: "Token Efficiency",
      score: getSignalValue(result, "economic", ["token_efficiency", "verbosity_efficiency"]),
    },
  ];
}

export const argosCards = keyMetricsCards;
export const estixeSignals = guardrailSummary;
export const nomosDiagnostics = diagnosticsSignals;
export const metisSignals = optimizationSignals;
