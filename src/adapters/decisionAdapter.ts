// ============================================================
// Decision Adapter
// Builds DecisionViewModel from DomainAnalysis
// ============================================================

import type { DomainAnalysis, Sprint4RecommendationRaw } from "@/domain/analysis.types";
import type {
  DecisionViewModel,
  VerdictModel,
  RiskModel,
  RecommendationModel,
  ConfidenceModel,
  CoreMetricViewModel,
  RecurrenceModel,
  ProblemItem,
  RecommendationItem,
  ConfidenceCertainty,
  MetricTone,
  Sprint4ViewModel,
  StructuredRecommendation,
} from "@/domain/verdict.types";
import { buildEconomicsViewModel } from "./economicsAdapter";

// ---- Internal helpers ----

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function sanitizeSnippet(text: string, max = 120): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trim()}...`;
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
  "billing", "checkout", "support", "refund", "plan", "shipping",
  "cancel", "subscription", "compliance", "contract", "cluster", "intent",
];

function isValidHeroHeadline(headline: string): boolean {
  const compact = headline.trim();
  if (!compact) return false;
  if (FORBIDDEN_HEADLINE_PATTERNS.some((p) => p.test(compact))) return false;
  if (!ACTION_VERBS.some((v) => compact.startsWith(`${v} `))) return false;
  const normalized = normalizeText(compact);
  if (!normalized.includes(" before ") && !normalized.includes(" to ")) return false;
  if (compact.split(" ").length < 6) return false;
  return true;
}

function extractArea(texts: string[]): string | null {
  const combined = normalizeText(texts.join(" "));
  const intentMatch = combined.match(/\b([a-z0-9_-]+)\s+intent(s)?\b/);
  if (intentMatch?.[1]) return `${intentMatch[1]} intents`;
  for (const keyword of HIGH_IMPACT_AREA_KEYWORDS) {
    if (combined.includes(keyword)) {
      if (keyword === "intent") return "key intents";
      if (keyword === "cluster") return "active clusters";
      return `${keyword} flows`;
    }
  }
  return null;
}

function buildFallbackHeadline(area: string | null, recurring: boolean): string {
  if (recurring && area) return `Act now on recurring drift in ${area} before degradation compounds`;
  if (recurring) return "Act now on recurring drift before degradation compounds";
  if (area) return `Fix ${area} degradation before outcome quality drops further`;
  return "Fix behavior degradation before outcome quality drops further";
}

function normalizeFocusPhrase(text: string): string {
  return text
    .trim()
    .replace(/[.]+$/, "")
    .replace(/^(fix|investigate|act now on|act on|review|address|resolve|stabilize|reduce|correct|recover)\s+/i, "")
    .replace(/^recurring\s+/i, "");
}

function focusAlreadyNamesArea(focus: string, area: string): boolean {
  const focusNorm = normalizeText(focus);
  const areaNorm = normalizeText(area);
  return focusNorm.includes(areaNorm) || areaNorm.split(" ").some((t) => t.length > 3 && focusNorm.includes(t));
}

function buildHeroHeadline(params: {
  topRecommendation: RecommendationItem | null;
  topProblem: ProblemItem | null;
  area: string | null;
  recurrence: RecurrenceModel;
  driftHigh: boolean;
}): string {
  const { topRecommendation, topProblem, area, recurrence, driftHigh } = params;
  const consequence = recurrence.recurring
    ? "before degradation compounds"
    : "before waste and risk increase further";

  const focusFromRec = topRecommendation?.title ? sanitizeSnippet(topRecommendation.title, 72).replace(/[.]+$/, "") : "";
  const focusFromProblem = topProblem?.title ? sanitizeSnippet(topProblem.title, 72).replace(/[.]+$/, "") : "";
  const focusCandidate = focusFromRec || focusFromProblem;
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

// ---- Extract problems from domain analysis ----

function extractProblems(analysis: DomainAnalysis): ProblemItem[] {
  const items: ProblemItem[] = [];

  // From alerts
  for (const alert of analysis.alerts ?? []) {
    items.push({
      id: alert.id,
      title: alert.title,
      impact: alert.problem,
      affectedInteractions: alert.intent ?? "",
      severity: alert.severity === "warning" ? "medium" : (alert.severity as ProblemItem["severity"]),
    });
  }

  // From issues
  for (const issue of analysis.issues ?? []) {
    if (issue.title) {
      items.push({
        id: issue.issueId ?? `issue-${items.length}`,
        title: issue.title,
        impact: issue.summary ?? "",
        affectedInteractions: "",
        severity: (issue.severity ?? "medium") as ProblemItem["severity"],
      });
    }
  }

  return items.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
}

function severityWeight(severity: ProblemItem["severity"]): number {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

// ---- Extract recommendations ----

function extractRecommendations(analysis: DomainAnalysis): RecommendationItem[] {
  return (analysis.recommendations ?? []).map((r) => ({
    title: r.title ?? r.action ?? "",
    reason: r.reason ?? "",
    expectedImpact: r.expectedImpact ?? "",
    priority: r.priority,
  }));
}

// ---- Verdict builder ----

function buildVerdict(analysis: DomainAnalysis, problems: ProblemItem[]): VerdictModel {
  const behaviorScore = analysis.behaviorScore;
  const drift = analysis.semanticDrift;
  const confidence = analysis.globalConfidence;
  const criticalSignals = Math.max(
    analysis.criticalAlertsCount,
    problems.filter((p) => p.severity === "critical").length,
  );
  const severeSignals = problems.filter((p) => p.severity === "critical" || p.severity === "high").length;

  const behaviorPoor = behaviorScore !== null && behaviorScore !== undefined && behaviorScore < 45;
  const driftHigh = drift !== null && drift !== undefined && drift > 55;
  const multipleCritical = criticalSignals >= 2;

  let verdict: VerdictModel["verdict"] = "Watch";

  if (multipleCritical) {
    verdict = "Critical";
  } else if (behaviorPoor || driftHigh || severeSignals >= 2) {
    verdict = "Degraded";
  } else if (
    behaviorScore !== null &&
    behaviorScore !== undefined &&
    behaviorScore >= 70 &&
    (drift === null || drift === undefined || drift <= 35) &&
    severeSignals === 0
  ) {
    verdict = "Healthy";
  }

  // Contradiction rules
  if (behaviorPoor && verdict === "Healthy") verdict = "Degraded";
  if (driftHigh && verdict === "Healthy") verdict = "Degraded";
  if (multipleCritical) verdict = "Critical";

  const certainty: ConfidenceCertainty =
    confidence === null || confidence === undefined
      ? "unknown"
      : confidence < 50
        ? "low"
        : confidence < 75
          ? "medium"
          : "high";

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
    escalated: multipleCritical,
    score: behaviorScore ?? null,
  };
}

// ---- Top risk builder ----

function buildTopRisk(problems: ProblemItem[], analysis: DomainAnalysis): RiskModel | null {
  const top = problems[0];
  if (!top) return null;

  return {
    title: top.title,
    severity: top.severity,
    evidence: top.impact || "Detected in analysis engine signals.",
    impact: top.affectedInteractions || `Affects ${analysis.nConversations ?? "multiple"} conversations.`,
    category: top.category,
  };
}

// ---- Confidence builder ----

function buildConfidence(analysis: DomainAnalysis): ConfidenceModel {
  const percent = analysis.globalConfidence ?? null;

  const tone: MetricTone =
    percent === null ? "neutral" : percent < 50 ? "risk" : percent < 75 ? "watch" : "safe";

  const certainty: ConfidenceCertainty =
    percent === null ? "unknown" : percent < 50 ? "low" : percent < 75 ? "medium" : "high";

  const limitingFactors: string[] = [];
  if (analysis.nConversations !== undefined && analysis.nConversations < 20) {
    limitingFactors.push("Small dataset — fewer than 20 conversations analyzed.");
  }
  if (analysis.warnings?.length) {
    limitingFactors.push(...analysis.warnings.slice(0, 2));
  }
  if (percent !== null && percent < 60) {
    limitingFactors.push("Engine confidence is below 60% — review dataset quality.");
  }
  if (limitingFactors.length === 0 && percent !== null && percent >= 75) {
    limitingFactors.push("Confidence is strong. No limiting factors detected.");
  }

  return {
    percent,
    displayValue: percent !== null ? `${percent.toFixed(1)}%` : "N/A",
    certainty,
    limitingFactors,
    tone,
  };
}

// ---- Core metrics builder ----

function buildCoreMetrics(analysis: DomainAnalysis, problems: ProblemItem[]): CoreMetricViewModel[] {
  const behaviorScore = analysis.behaviorScore ?? null;
  const drift = analysis.semanticDrift ?? null;
  const confidence = analysis.globalConfidence ?? null;
  const cpuo = analysis.businessImpact?.costPerUsefulOutcome ?? null;

  const behaviorTone: MetricTone =
    behaviorScore === null ? "neutral" : behaviorScore < 45 ? "risk" : behaviorScore < 70 ? "watch" : "safe";
  const driftTone: MetricTone =
    drift === null ? "neutral" : drift > 55 ? "risk" : drift > 35 ? "watch" : "safe";
  const costPressure = problems.some((p) =>
    /(cost|waste|token|efficiency|verbosity)/.test(normalizeText(`${p.title} ${p.impact}`)),
  );
  const cpuoTone: MetricTone =
    cpuo === null ? "neutral" : costPressure ? "risk" : cpuo > 1 ? "watch" : "safe";
  const confidenceTone: MetricTone =
    confidence === null ? "neutral" : confidence < 50 ? "risk" : confidence < 75 ? "watch" : "safe";

  return [
    {
      id: "behavior-score",
      label: "Behavior Score",
      value: behaviorScore,
      displayValue: behaviorScore !== null ? `${behaviorScore.toFixed(1)}%` : "N/A",
      direction: "higher_better",
      missing: behaviorScore === null,
      missingLabel: behaviorScore === null ? "Not provided by engine" : undefined,
      operationalNote:
        behaviorScore === null
          ? "Requires outcome and cost signals"
          : behaviorScore < 45
            ? "Below safe range"
            : behaviorScore < 70
              ? "Performance pressure detected"
              : "Behavior currently reliable",
      tone: behaviorTone,
    },
    {
      id: "drift",
      label: "Semantic Drift",
      value: drift,
      displayValue: drift !== null ? `${drift.toFixed(1)}%` : "N/A",
      direction: "lower_better",
      missing: drift === null,
      missingLabel: drift === null ? "Not provided by engine" : undefined,
      operationalNote:
        drift === null
          ? "Decision confidence is limited"
          : drift > 55
            ? "Regressing vs baseline"
            : drift > 35
              ? "Drift rising"
              : "Drift controlled",
      tone: driftTone,
    },
    {
      id: "cost-per-useful-outcome",
      label: "Cost per Useful Outcome",
      value: cpuo,
      displayValue: cpuo !== null ? `US$ ${cpuo.toFixed(2)}` : "N/A",
      direction: "lower_better",
      missing: cpuo === null,
      missingLabel: cpuo === null ? "Unavailable for current input maturity" : undefined,
      operationalNote:
        cpuo === null
          ? "Decision confidence is limited"
          : costPressure
            ? "Waste rising"
            : cpuo > 1
              ? "Cost pressure visible"
              : "Cost currently controlled",
      tone: cpuoTone,
    },
    {
      id: "confidence",
      label: "Confidence",
      value: confidence,
      displayValue: confidence !== null ? `${confidence.toFixed(1)}%` : "N/A",
      direction: "higher_better",
      missing: confidence === null,
      missingLabel: confidence === null ? "Not provided by engine" : undefined,
      operationalNote:
        confidence === null
          ? "Decision confidence is limited"
          : confidence < 50
            ? "Trust level is low"
            : confidence < 75
              ? "Trust level is moderate"
              : "Trust level is strong",
      tone: confidenceTone,
    },
  ];
}

// ---- Main builder ----

export function buildDecisionViewModel(
  analysis: DomainAnalysis,
  recurrence: RecurrenceModel = { recurring: false, repeatedRuns: 1, focus: null },
): DecisionViewModel {
  const problems = extractProblems(analysis);
  const recommendations = extractRecommendations(analysis);

  const verdict = buildVerdict(analysis, problems);
  const topRisk = buildTopRisk(problems, analysis);
  const confidence = buildConfidence(analysis);
  const coreMetrics = buildCoreMetrics(analysis, problems);
  const economics = buildEconomicsViewModel(analysis);

  const area = extractArea([
    recommendations[0]?.title ?? "",
    recommendations[0]?.reason ?? "",
    problems[0]?.title ?? "",
    problems[0]?.affectedInteractions ?? "",
  ]);

  const driftHigh = (analysis.semanticDrift ?? 0) > 55;

  const headline = buildHeroHeadline({
    topRecommendation: recommendations[0] ?? null,
    topProblem: problems[0] ?? null,
    area,
    recurrence,
    driftHigh,
  });

  const context = [
    recommendations[0]?.reason || problems[0]?.impact || "High-impact risk pattern detected by the engine.",
    recurrence.recurring
      ? `This pattern repeated in ${recurrence.repeatedRuns} recent runs and now requires immediate action.`
      : recommendations[0]?.expectedImpact || "Expected to recover behavior reliability and execution quality.",
  ]
    .map((t) => sanitizeSnippet(t, 118))
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

  const recommendation: RecommendationModel = {
    headline,
    context,
    expectedImpact: recommendations[0]?.expectedImpact,
    primaryCtaLabel:
      verdict.verdict === "Critical" || recurrence.recurring
        ? "Act now on this recommendation"
        : "Apply this recommendation",
    secondaryCtaLabel: "Re-run analysis",
    escalated: verdict.verdict === "Critical" || recurrence.recurring,
  };

  const sprint4 = buildSprint4ViewModel(analysis);

  return {
    verdict,
    topRisk,
    recommendation,
    economics,
    confidence,
    coreMetrics,
    recurrence,
    sprint4,
  };
}

// ---- Sprint 4 view model builder ----

function mapSprint4Rec(raw: Sprint4RecommendationRaw): StructuredRecommendation {
  return {
    id: raw.id,
    priority: raw.priority,
    title: raw.title,
    problem: raw.problem,
    impact: {
      type: raw.impact.type,
      estimatedSavings: raw.impact.estimatedSavings,
      riskReduction: raw.impact.riskReduction as "high" | "medium" | "low",
    },
    evidence: raw.evidence,
    action: raw.action,
    confidence: raw.confidence,
    priorityScore: raw.priorityScore,
    actionCategory: raw.actionCategory,
  };
}

function buildSprint4ViewModel(analysis: DomainAnalysis): Sprint4ViewModel {
  const s4 = analysis.sprint4;
  if (!s4) {
    return { top: null, secondary: [], modelVersion: "sprint4-v1" };
  }
  return {
    top: s4.top ? mapSprint4Rec(s4.top) : null,
    secondary: s4.secondary.map(mapSprint4Rec),
    modelVersion: s4.modelVersion,
  };
}
