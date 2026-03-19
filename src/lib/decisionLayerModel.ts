import type { AnalysisInterpretation, AnalysisResult } from "@/lib/api";
import type { ProblemItem, RecommendationItem } from "@/lib/dashboardModel";

type Direction = "higher_better" | "lower_better";

export type DecisionVerdict = "Healthy" | "Watch" | "Degraded" | "Critical";

export interface RecurrenceSummary {
  recurring: boolean;
  repeatedRuns: number;
  focus: string | null;
}

export interface CoreMetricCardModel {
  id: "behavior-score" | "drift" | "cost-per-useful-outcome" | "confidence";
  label: string;
  value: number | null;
  displayValue: string;
  direction: Direction;
  missing: boolean;
  missingLabel?: string;
  emphasis: "strong" | "normal" | "reduced";
  operationalNote: string;
  tone: "safe" | "watch" | "risk" | "neutral";
}

export interface VerdictStripModel {
  verdict: DecisionVerdict;
  message: string;
  certainty: "high" | "medium" | "low" | "unknown";
  certaintyLabel: string;
  escalated: boolean;
}

export interface TopRecommendationHeroModel {
  headline: string;
  supportingBlocks: string[];
  primaryCtaLabel: string;
  secondaryCtaLabel?: string;
  escalated: boolean;
}

export interface DecisionLayerModel {
  verdict: VerdictStripModel;
  hero: TopRecommendationHeroModel;
  coreMetrics: CoreMetricCardModel[];
}

export interface SystemStateRowModel {
  id: string;
  label: string;
  cause: string;
  impact: string;
  missing: boolean;
}

export interface SystemStatePanelModel {
  rows: SystemStateRowModel[];
  enrichmentSuggestions: string[];
}

export interface InterpretationPanelModel {
  summary: string | null;
  businessImpact: string | null;
  riskProjection: string | null;
}

interface VerdictInputs {
  behaviorScore: number | null;
  drift: number | null;
  confidence: number | null;
  criticalSignals: number;
  severeSignals: number;
  regressionDetected: boolean;
  recurrence: RecurrenceSummary;
}

const FORBIDDEN_HEADLINE_PATTERNS = [
  /^review alerts$/i,
  /^investigate issue$/i,
  /^address degradation$/i,
  /^recommendation\s*\d*$/i,
  /^action required$/i,
];

const ACTION_VERBS = ["Fix", "Investigate", "Act", "Stabilize", "Reduce", "Correct", "Recover"];

const HIGH_IMPACT_AREA_KEYWORDS = [
  "billing",
  "checkout",
  "support",
  "refund",
  "plan",
  "shipping",
  "cancel",
  "subscription",
  "compliance",
  "contract",
  "cluster",
  "intent",
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function normalizePercentLike(value: unknown): number | null {
  const raw = asNumber(value);
  if (raw === null) return null;
  if (raw >= 0 && raw <= 1) return Number((raw * 100).toFixed(2));
  return Number(raw.toFixed(2));
}

function clampPercent(value: number | null) {
  if (value === null) return null;
  return Math.max(0, Math.min(100, value));
}

function normalizeText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function pickFirstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function pickFirstPercent(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizePercentLike(record[key]);
    if (value !== null) return clampPercent(value);
  }
  return null;
}

function extractBehaviorScore(result: AnalysisResult | null): number | null {
  if (!result) return null;
  const scores = asRecord(asRecord(result.argos_v2).scores);
  const fromBehavior = pickFirstPercent(scores, ["BEHAVIOR_SCORE", "behavior_score"]);
  if (fromBehavior !== null) return fromBehavior;
  return pickFirstPercent(scores, ["AI_HEALTH_SCORE", "ai_health_score"]);
}

function extractDrift(result: AnalysisResult | null): number | null {
  if (!result) return null;
  const semanticSignals = asRecord(asRecord(asRecord(result.argos_v2).signals).semantic);
  return pickFirstPercent(semanticSignals, [
    "semantic_drift",
    "semantic_dispersion",
    "semantic_entropy",
    "drift",
  ]);
}

function extractCostMetric(result: AnalysisResult | null): number | null {
  if (!result) return null;
  const argos = asRecord(result.argos_v2);
  const scores = asRecord(argos.scores);
  const businessImpact = asRecord(argos.business_impact);
  const topBusinessImpact = asRecord(result.business_impact);

  const scoreValue = pickFirstNumber(scores, [
    "COST_PER_USEFUL_OUTCOME",
    "cost_per_useful_outcome",
    "costPerUsefulOutcome",
  ]);
  if (scoreValue !== null) return Number(scoreValue.toFixed(4));

  const businessValue = pickFirstNumber(businessImpact, [
    "cost_per_useful_outcome",
    "costPerUsefulOutcome",
  ]);
  if (businessValue !== null) return Number(businessValue.toFixed(4));

  const topLevelValue = pickFirstNumber(topBusinessImpact, [
    "cost_per_useful_outcome",
    "costPerUsefulOutcome",
  ]);
  if (topLevelValue !== null) return Number(topLevelValue.toFixed(4));

  return null;
}

function extractConfidence(result: AnalysisResult | null): number | null {
  if (!result) return null;
  return clampPercent(normalizePercentLike(result.global_confidence));
}

function formatMetricValue(metric: CoreMetricCardModel): string {
  if (metric.value === null) return "N/A";
  if (metric.id === "cost-per-useful-outcome") {
    const absValue = Math.abs(metric.value);
    if (absValue >= 1000) return metric.value.toFixed(0);
    if (absValue >= 100) return metric.value.toFixed(1);
    return metric.value.toFixed(2);
  }
  return `${metric.value.toFixed(1)}%`;
}

function behaviorNote(value: number | null) {
  if (value === null) return { note: "Decision confidence is limited", tone: "neutral" as const };
  if (value < 45) return { note: "Below safe range", tone: "risk" as const };
  if (value < 70) return { note: "Performance pressure detected", tone: "watch" as const };
  return { note: "Behavior currently reliable", tone: "safe" as const };
}

function driftNote(value: number | null) {
  if (value === null) return { note: "Decision confidence is limited", tone: "neutral" as const };
  if (value > 55) return { note: "Regressing vs baseline", tone: "risk" as const };
  if (value > 35) return { note: "Drift rising", tone: "watch" as const };
  return { note: "Drift controlled", tone: "safe" as const };
}

function costNote(value: number | null, problems: ProblemItem[]) {
  if (value === null) return { note: "Decision confidence is limited", tone: "neutral" as const };
  const costPressure = problems.some((item) => inferCostImpact(item) > 0);
  if (costPressure) return { note: "Waste rising", tone: "risk" as const };
  if (value > 1) return { note: "Cost pressure visible", tone: "watch" as const };
  return { note: "Cost currently controlled", tone: "safe" as const };
}

function confidenceNote(value: number | null) {
  if (value === null) return { note: "Decision confidence is limited", tone: "neutral" as const };
  if (value < 50) return { note: "Trust level is low", tone: "risk" as const };
  if (value < 75) return { note: "Trust level is moderate", tone: "watch" as const };
  return { note: "Trust level is strong", tone: "safe" as const };
}

function severityWeight(severity: ProblemItem["severity"]) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function inferCostImpact(problem: ProblemItem) {
  const text = normalizeText(`${problem.title} ${problem.impact}`);
  return /(cost|waste|token|efficiency|verbosity)/.test(text) ? 1 : 0;
}

function inferDegradation(problem: ProblemItem) {
  const text = normalizeText(`${problem.title} ${problem.impact}`);
  return /(drift|degrad|instability|collapse|variance)/.test(text) ? 1 : 0;
}

export function rankHotspotsByImpact(items: ProblemItem[]) {
  return [...items].sort((left, right) => {
    const leftScore =
      severityWeight(left.severity) * 10 + inferCostImpact(left) * 3 + inferDegradation(left) * 2;
    const rightScore =
      severityWeight(right.severity) * 10 + inferCostImpact(right) * 3 + inferDegradation(right) * 2;
    return rightScore - leftScore;
  });
}

function sanitizeSnippet(text: string, max = 120) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trim()}...`;
}

function extractArea(texts: string[]) {
  const combined = normalizeText(texts.join(" "));
  const intentMatch = combined.match(/\b([a-z0-9_-]+)\s+intent(s)?\b/);
  if (intentMatch?.[1]) {
    return `${intentMatch[1]} intents`;
  }
  for (const keyword of HIGH_IMPACT_AREA_KEYWORDS) {
    if (combined.includes(keyword)) {
      if (keyword === "intent") return "key intents";
      if (keyword === "cluster") return "active clusters";
      return `${keyword} flows`;
    }
  }
  return null;
}

function buildFallbackHeadline(area: string | null, recurring: boolean) {
  if (recurring && area) {
    return `Act now on recurring drift in ${area} before degradation compounds`;
  }
  if (recurring) {
    return "Act now on recurring drift before degradation compounds";
  }
  if (area) {
    return `Fix ${area} degradation before outcome quality drops further`;
  }
  return "Fix behavior degradation before outcome quality drops further";
}

function normalizeFocusPhrase(text: string) {
  return text
    .trim()
    .replace(/[.]+$/, "")
    .replace(
      /^(fix|investigate|act now on|act on|review|address|resolve|stabilize|reduce|correct|recover)\s+/i,
      "",
    )
    .replace(/^recurring\s+/i, "");
}

function focusAlreadyNamesArea(focus: string, area: string) {
  const focusNorm = normalizeText(focus);
  const areaNorm = normalizeText(area);
  return focusNorm.includes(areaNorm) || areaNorm.split(" ").some((token) => token.length > 3 && focusNorm.includes(token));
}

function isValidHeroHeadline(headline: string) {
  const compact = headline.trim();
  if (!compact) return false;
  if (FORBIDDEN_HEADLINE_PATTERNS.some((pattern) => pattern.test(compact))) return false;
  if (!ACTION_VERBS.some((verb) => compact.startsWith(`${verb} `))) return false;
  const normalized = normalizeText(compact);
  if (!normalized.includes(" before ") && !normalized.includes(" to ")) return false;
  if (compact.split(" ").length < 6) return false;
  return true;
}

function buildHeroHeadline(params: {
  recommendation: RecommendationItem | null;
  topProblem: ProblemItem | null;
  area: string | null;
  recurrence: RecurrenceSummary;
  driftHigh: boolean;
}) {
  const { recommendation, topProblem, area, recurrence, driftHigh } = params;
  const consequence = recurrence.recurring
    ? "before degradation compounds"
    : "before waste and risk increase further";

  const focusFromRecommendation = recommendation?.title
    ? sanitizeSnippet(recommendation.title, 72).replace(/[.]+$/, "")
    : "";
  const focusFromProblem = topProblem?.title
    ? sanitizeSnippet(topProblem.title, 72).replace(/[.]+$/, "")
    : "";
  const focusCandidate = focusFromRecommendation || focusFromProblem;
  const focus = /recommendation\s*\d*/i.test(focusCandidate) ? "" : focusCandidate;
  const normalizedFocus = normalizeFocusPhrase(focus);

  let candidate = "";

  if (recurrence.recurring) {
    if (normalizedFocus) {
      if (area && !focusAlreadyNamesArea(normalizedFocus, area)) {
        candidate = `Act now on recurring ${normalizedFocus.toLowerCase()} in ${area} ${consequence}`;
      } else {
        candidate = `Act now on recurring ${normalizedFocus.toLowerCase()} ${consequence}`;
      }
    } else if (area) {
      candidate = `Act now on recurring drift in ${area} ${consequence}`;
    } else {
      candidate = buildFallbackHeadline(area, true);
    }
  } else if (driftHigh) {
    if (area) {
      candidate = `Fix drift in ${area} ${consequence}`;
    } else if (normalizedFocus) {
      candidate = `Fix ${normalizedFocus.toLowerCase()} drift ${consequence}`;
    } else {
      candidate = buildFallbackHeadline(area, false);
    }
  } else if (normalizedFocus) {
    if (area && !focusAlreadyNamesArea(normalizedFocus, area)) {
      candidate = `Fix ${normalizedFocus.toLowerCase()} in ${area} ${consequence}`;
    } else {
      candidate = `Fix ${normalizedFocus.toLowerCase()} ${consequence}`;
    }
  } else {
    candidate = buildFallbackHeadline(area, false);
  }

  const compact = candidate.replace(/\s+/g, " ").trim();
  if (isValidHeroHeadline(compact)) return compact;
  return buildFallbackHeadline(area, recurrence.recurring);
}

function buildVerdictModel(inputs: VerdictInputs): VerdictStripModel {
  const {
    behaviorScore,
    drift,
    confidence,
    criticalSignals,
    severeSignals,
    regressionDetected,
    recurrence,
  } = inputs;

  const behaviorPoor = behaviorScore !== null && behaviorScore < 45;
  const driftHigh = drift !== null && drift > 55;
  const multipleCritical = criticalSignals >= 2;
  const escalatedByRecurrence = recurrence.recurring && severeSignals >= 1;

  let verdict: DecisionVerdict = "Watch";

  if (multipleCritical || escalatedByRecurrence) {
    verdict = "Critical";
  } else if (behaviorPoor || driftHigh || severeSignals >= 2 || regressionDetected) {
    verdict = "Degraded";
  } else if (
    behaviorScore !== null &&
    behaviorScore >= 70 &&
    (drift === null || drift <= 35) &&
    severeSignals === 0
  ) {
    verdict = "Healthy";
  }

  // Contradiction rules
  if (behaviorPoor && verdict === "Healthy") verdict = "Degraded";
  if (driftHigh && verdict === "Healthy") verdict = "Degraded";
  if (multipleCritical) verdict = "Critical";

  const certainty: VerdictStripModel["certainty"] =
    confidence === null ? "unknown" : confidence < 50 ? "low" : confidence < 75 ? "medium" : "high";

  const certaintyLabel =
    certainty === "unknown"
      ? "Confidence not provided by engine"
      : certainty === "low"
        ? "Low certainty"
        : certainty === "medium"
          ? "Moderate certainty"
          : "High certainty";

  const message =
    verdict === "Critical"
      ? "Critical risk signals detected. Immediate action is required."
      : verdict === "Degraded"
        ? "System quality is degrading and requires focused correction."
        : verdict === "Watch"
          ? "System is operable but needs close monitoring."
          : "System is currently inside safe operating range.";

  return {
    verdict,
    message,
    certainty,
    certaintyLabel,
    escalated: multipleCritical || escalatedByRecurrence,
  };
}

function extractRegressionFlag(result: AnalysisResult | null) {
  if (!result) return false;
  const topBaseline = asRecord(result.baseline_comparison);
  const metadataBaseline = asRecord(asRecord(asRecord(result.argos_v2).metadata).baseline_comparison);
  const baseline = Object.keys(topBaseline).length > 0 ? topBaseline : metadataBaseline;
  if (Object.keys(baseline).length === 0) return false;

  const aiHealthDelta = asNumber(baseline.delta_ai_health_score);
  const containmentDelta = asNumber(baseline.delta_containment_risk);
  const conversionDelta = asNumber(baseline.delta_conversion_risk);

  return (
    (aiHealthDelta !== null && aiHealthDelta <= -1) ||
    (containmentDelta !== null && containmentDelta >= 0.03) ||
    (conversionDelta !== null && conversionDelta >= 0.03)
  );
}

function extractRunSignals(rawResult: Record<string, unknown>): string[] {
  const collected: string[] = [];
  const issues = Array.isArray(rawResult.issues) ? rawResult.issues : [];
  const alerts = Array.isArray(rawResult.alerts) ? rawResult.alerts : [];
  const argos = asRecord(rawResult.argos_v2);
  const recommendations = Array.isArray(argos.recommendations) ? argos.recommendations : [];
  const argosIssues = Array.isArray(argos.issues) ? argos.issues : [];

  issues.forEach((item) => {
    const record = asRecord(item);
    const title = String(record.title ?? record.summary ?? record.issue_type ?? "").trim();
    if (title) collected.push(normalizeText(title));
  });
  alerts.forEach((item) => {
    const record = asRecord(item);
    const title = String(record.title ?? "").trim();
    const recommendation = String(record.recommendation ?? "").trim();
    if (title) collected.push(normalizeText(title));
    if (recommendation) collected.push(normalizeText(recommendation));
  });
  recommendations.forEach((item) => {
    const record = asRecord(item);
    const action = String(record.action ?? record.title ?? record.recommendation ?? "").trim();
    if (action) collected.push(normalizeText(action));
  });
  argosIssues.forEach((item) => {
    const record = asRecord(item);
    const title = String(record.title ?? record.summary ?? record.issue_type ?? "").trim();
    if (title) collected.push(normalizeText(title));
  });

  return collected;
}

function signalMatchesTarget(signal: string, targets: string[]) {
  for (const target of targets) {
    if (!target) continue;
    if (signal.includes(target) || target.includes(signal)) return true;
  }
  return false;
}

export function buildRecurrenceSummary(params: {
  currentProblems: ProblemItem[];
  currentRecommendations: RecommendationItem[];
  historyRuns: Array<{ id: string; raw_result?: Record<string, unknown> | null }>;
  currentRunId?: string;
}): RecurrenceSummary {
  const { currentProblems, currentRecommendations, historyRuns, currentRunId } = params;
  const topRecommendation = currentRecommendations[0] ?? null;
  const topProblem = currentProblems[0] ?? null;

  const targets = [topRecommendation?.title ?? "", topProblem?.title ?? ""]
    .map((text) => normalizeText(text))
    .filter(Boolean);

  if (targets.length === 0) {
    return { recurring: false, repeatedRuns: 1, focus: null };
  }

  let matchingRuns = 0;
  let skippedCurrentFallback = false;
  for (const run of historyRuns) {
    if (!run.raw_result) continue;
    if (currentRunId && run.id === currentRunId) continue;
    if (!currentRunId && !skippedCurrentFallback) {
      skippedCurrentFallback = true;
      continue;
    }
    const signals = extractRunSignals(run.raw_result);
    if (signals.some((signal) => signalMatchesTarget(signal, targets))) {
      matchingRuns += 1;
    }
  }

  const recurring = matchingRuns >= 1;
  const focus = topRecommendation?.title ?? topProblem?.title ?? null;
  return {
    recurring,
    repeatedRuns: matchingRuns + 1,
    focus,
  };
}

export function buildDecisionLayerModel(params: {
  result: AnalysisResult | null;
  problems: ProblemItem[];
  recommendations: RecommendationItem[];
  recurrence: RecurrenceSummary;
}): DecisionLayerModel {
  const { result, problems, recommendations, recurrence } = params;

  const behaviorScore = extractBehaviorScore(result);
  const drift = extractDrift(result);
  const costPerUsefulOutcome = extractCostMetric(result);
  const confidence = extractConfidence(result);

  const criticalSignals = Math.max(
    result?.critical_alerts_count ?? 0,
    problems.filter((item) => item.severity === "critical").length,
  );
  const severeSignals = problems.filter((item) => item.severity === "critical" || item.severity === "high").length;
  const regressionDetected = extractRegressionFlag(result);

  const verdict = buildVerdictModel({
    behaviorScore,
    drift,
    confidence,
    criticalSignals,
    severeSignals,
    regressionDetected,
    recurrence,
  });

  const area = extractArea([
    recommendations[0]?.title ?? "",
    recommendations[0]?.reason ?? "",
    problems[0]?.title ?? "",
    problems[0]?.affectedInteractions ?? "",
  ]);

  const heroHeadline = buildHeroHeadline({
    recommendation: recommendations[0] ?? null,
    topProblem: problems[0] ?? null,
    area,
    recurrence,
    driftHigh: drift !== null && drift > 55,
  });

  const supportingBlocks = [
    recommendations[0]?.reason || problems[0]?.impact || "High-impact risk pattern detected by the engine.",
    recurrence.recurring
      ? `This pattern repeated in ${recurrence.repeatedRuns} recent runs and now requires immediate action.`
      : recommendations[0]?.expectedImpact || "Expected to recover behavior reliability and execution quality.",
  ]
    .map((text) => sanitizeSnippet(text, 118))
    .filter(Boolean)
    .slice(0, 2);

  const hero: TopRecommendationHeroModel = {
    headline: heroHeadline,
    supportingBlocks,
    primaryCtaLabel:
      verdict.verdict === "Critical" || recurrence.recurring ? "Act now on this recommendation" : "Apply this recommendation",
    secondaryCtaLabel: "Re-run analysis",
    escalated: verdict.verdict === "Critical" || recurrence.recurring,
  };

  const behaviorMeta = behaviorNote(behaviorScore);
  const driftMeta = driftNote(drift);
  const costMeta = costNote(costPerUsefulOutcome, problems);
  const confidenceMeta = confidenceNote(confidence);

  const metrics: CoreMetricCardModel[] = [
    {
      id: "behavior-score",
      label: "Behavior Score",
      value: behaviorScore,
      displayValue: "",
      direction: "higher_better",
      missing: behaviorScore === null,
      missingLabel: behaviorScore === null ? "Not provided by engine" : undefined,
      emphasis: behaviorScore === null ? "reduced" : "strong",
      operationalNote: behaviorMeta.note,
      tone: behaviorMeta.tone,
    },
    {
      id: "drift",
      label: "Drift",
      value: drift,
      displayValue: "",
      direction: "lower_better",
      missing: drift === null,
      missingLabel: drift === null ? "Not provided by engine" : undefined,
      emphasis: drift === null ? "reduced" : "normal",
      operationalNote: driftMeta.note,
      tone: driftMeta.tone,
    },
    {
      id: "cost-per-useful-outcome",
      label: "Cost per Useful Outcome",
      value: costPerUsefulOutcome,
      displayValue: "",
      direction: "lower_better",
      missing: costPerUsefulOutcome === null,
      missingLabel: costPerUsefulOutcome === null ? "Not provided by engine" : undefined,
      emphasis: costPerUsefulOutcome === null ? "reduced" : "normal",
      operationalNote: costMeta.note,
      tone: costMeta.tone,
    },
    {
      id: "confidence",
      label: "Confidence",
      value: confidence,
      displayValue: "",
      direction: "higher_better",
      missing: confidence === null,
      missingLabel: confidence === null ? "Not provided by engine" : undefined,
      emphasis: confidence === null ? "reduced" : "normal",
      operationalNote: confidenceMeta.note,
      tone: confidenceMeta.tone,
    },
  ].map((metric) => ({
    ...metric,
    displayValue: formatMetricValue(metric),
  }));

  return {
    verdict,
    hero,
    coreMetrics: metrics,
  };
}

function emptyOrMissing(text: string | null | undefined) {
  return !text || text.trim().length === 0;
}

function firstNonEmpty(candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    if (!emptyOrMissing(candidate)) return sanitizeSnippet(String(candidate), 180);
  }
  return null;
}

export function buildInterpretationPanelModel(
  interpretation: AnalysisInterpretation | null,
  heroHeadline: string,
): InterpretationPanelModel {
  if (!interpretation) {
    return {
      summary: null,
      businessImpact: null,
      riskProjection: null,
    };
  }

  const summaryRaw = firstNonEmpty([interpretation.executive_diagnosis, interpretation.summary]);
  const businessImpactRaw = firstNonEmpty([
    interpretation.business_implications?.[0],
    interpretation.main_risks?.[0]?.impact,
  ]);
  const riskProjectionRaw = firstNonEmpty([
    interpretation.systemic_pattern,
    interpretation.operational_risks?.[0],
    interpretation.confidence_notes,
  ]);

  const normalizeHero = normalizeText(heroHeadline);
  const sanitizeAgainstHero = (value: string | null) =>
    value && normalizeText(value) === normalizeHero ? null : value;

  return {
    summary: sanitizeAgainstHero(summaryRaw),
    businessImpact: sanitizeAgainstHero(businessImpactRaw),
    riskProjection: sanitizeAgainstHero(riskProjectionRaw),
  };
}

function getStructuralIssue(problem: ProblemItem[]) {
  return problem.find((item) => /(structur|template|fallback|collapse|contract|schema)/i.test(item.title));
}

function getDriftIssue(problem: ProblemItem[]) {
  return problem.find((item) => /(drift|instability|variance|mutation|reformulation)/i.test(item.title));
}

export function buildSystemStatePanelModel(
  result: AnalysisResult | null,
  problems: ProblemItem[],
): SystemStatePanelModel {
  const semanticConsistency = clampPercent(normalizePercentLike(result?.consistency_score));
  const structuralIssue = getStructuralIssue(problems);
  const driftIssue = getDriftIssue(problems);

  const rows: SystemStateRowModel[] = [
    {
      id: "semantic-consistency",
      label: "Semantic consistency",
      cause:
        semanticConsistency === null
          ? "Not provided by engine"
          : semanticConsistency < 60
            ? `Semantic consistency is ${semanticConsistency.toFixed(1)}%, below safe operating range.`
            : `Semantic consistency is ${semanticConsistency.toFixed(1)}%, within monitored range.`,
      impact:
        semanticConsistency === null
          ? "Decision confidence is reduced until this metric is provided."
          : semanticConsistency < 60
            ? "Responses can diverge on similar intents and increase rework cost."
            : "Current semantic quality supports stable operator decisions.",
      missing: semanticConsistency === null,
    },
    {
      id: "structural-issues",
      label: "Structural issues",
      cause: structuralIssue
        ? structuralIssue.title
        : "Not provided by engine",
      impact: structuralIssue
        ? structuralIssue.impact
        : "No structural evidence available for this run.",
      missing: !structuralIssue,
    },
    {
      id: "contract-compliance",
      label: "Contract compliance",
      cause:
        structuralIssue && /contract|schema|compliance/i.test(structuralIssue.title)
          ? structuralIssue.title
          : "Not provided by engine",
      impact:
        structuralIssue && /contract|schema|compliance/i.test(structuralIssue.title)
          ? structuralIssue.impact
          : driftIssue
            ? "Drift risk is visible, but contract compliance evidence is incomplete."
            : "Compliance confidence is limited by missing contract evidence.",
      missing: !(
        structuralIssue && /contract|schema|compliance/i.test(structuralIssue.title)
      ),
    },
  ];

  const argosEvidence = asRecord(asRecord(result?.argos_v2).evidence);
  const businessImpact = asRecord(
    Object.keys(asRecord(result?.business_impact)).length > 0
      ? asRecord(result?.business_impact)
      : asRecord(asRecord(result?.argos_v2).business_impact),
  );

  const suggestions: string[] = [];
  if (!("expected_behavior" in argosEvidence)) {
    suggestions.push("Add expected_behavior");
  }
  const businessContext = asRecord(businessImpact.business_context);
  if (!("criticality" in businessContext)) {
    suggestions.push("Add business_context.criticality");
  }
  if (!("waste_rate" in businessImpact)) {
    suggestions.push("Add waste_rate");
  }

  return {
    rows,
    enrichmentSuggestions: suggestions,
  };
}
