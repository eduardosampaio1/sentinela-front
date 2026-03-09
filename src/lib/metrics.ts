import type { AlertItem } from "@/lib/types";
import type { AnalysisResult, IntentMetric } from "@/lib/api";

export type HealthLevel = "EXCELLENT" | "HEALTHY" | "WARNING" | "POOR" | "CRITICAL";

export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function getConsistencyHealth(score?: number): HealthLevel | "N/A" {
  if (score === undefined || score === null || Number.isNaN(score)) return "N/A";
  if (score >= 90) return "EXCELLENT";
  if (score >= 75) return "HEALTHY";
  if (score >= 60) return "WARNING";
  if (score >= 40) return "POOR";
  return "CRITICAL";
}

export function getSimilarityHealth(score?: number): HealthLevel | "N/A" {
  if (score === undefined || score === null || Number.isNaN(score)) return "N/A";
  if (score <= 20) return "EXCELLENT";
  if (score <= 40) return "HEALTHY";
  if (score <= 60) return "WARNING";
  if (score <= 80) return "POOR";
  return "CRITICAL";
}

export function getWasteHealth(rate?: number): HealthLevel | "N/A" {
  if (rate === undefined || rate === null || Number.isNaN(rate)) return "N/A";
  if (rate <= 5) return "EXCELLENT";
  if (rate <= 12) return "HEALTHY";
  if (rate <= 20) return "WARNING";
  if (rate <= 35) return "POOR";
  return "CRITICAL";
}

export function healthColor(level: string) {
  switch (level) {
    case "EXCELLENT": return "text-emerald-400";
    case "HEALTHY": return "text-green-400";
    case "WARNING": return "text-yellow-400";
    case "POOR": return "text-orange-400";
    case "CRITICAL": return "text-red-400";
    default: return "text-muted-foreground";
  }
}

export function progressColor(level: string) {
  switch (level) {
    case "EXCELLENT": return "bg-emerald-400";
    case "HEALTHY": return "bg-green-400";
    case "WARNING": return "bg-yellow-400";
    case "POOR": return "bg-orange-400";
    case "CRITICAL": return "bg-red-400";
    default: return "bg-muted";
  }
}

export function computeReliabilityIndex(params: {
  consistency_score?: number;
  cross_intent_similarity?: number;
  waste_rate?: number;
}) {
  const consistency = params.consistency_score ?? 0;
  const separation = 100 - (params.cross_intent_similarity ?? 100);
  const efficiency = 100 - (params.waste_rate ?? 50);
  const index = Math.round((clamp(consistency) + clamp(separation) + clamp(efficiency)) / 3);
  return clamp(index);
}

export function formatPercent(value?: number, decimals = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "Data not available";
  return `${value.toFixed(decimals)}%`;
}

export function formatMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "Data not available";
  return `$${Math.round(value)}`;
}

export function formatDate(value?: string) {
  if (!value) return "Data not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function extractIntentFromText(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(?:INTENT\s+(?:CRITICAL|WARN|WARNING|HIGH|LOW):\s*|INTENT:\s*)([A-Z0-9_]+)/i);
  return match?.[1] ?? null;
}

export function normalizeAlerts(rawAlerts: Array<Record<string, unknown>> = []): AlertItem[] {
  const seen = new Set<string>();

  return rawAlerts.flatMap((alert, index) => {
    const title = String(alert.title ?? "");
    const recommendationText = String(alert.recommendation ?? alert.hint ?? "");
    const severityRaw = String(alert.severity ?? "warning").toLowerCase();
    const severity = severityRaw === "warn" ? "warning" : severityRaw;
    const intent = typeof alert.intent === "string"
      ? alert.intent
      : extractIntentFromText(title) ?? extractIntentFromText(recommendationText);

    let problem = title || "Behavioral issue detected";
    let recommendation = recommendationText || "Review prompt structure and response behavior for this intent.";

    if (/cross[-_ ]intent/i.test(title)) {
      problem = "Cross-intent reuse detected";
    } else if (/score_below_crit/i.test(recommendationText) || /very low consistency/i.test(title)) {
      problem = "Very low consistency score";
      recommendation = "Normalize prompt templates and reduce variation between responses for this intent.";
    }

    const key = `${severity}|${intent ?? ""}|${problem}|${recommendation}`;
    if (seen.has(key)) return [];
    seen.add(key);

    return [{
      id: String(alert.id ?? `alert-${index}`),
      severity: (severity === "critical" || severity === "high" || severity === "warning" || severity === "info"
        ? severity
        : "warning") as AlertItem["severity"],
      intent: intent ?? null,
      title,
      problem,
      recommendation,
      first_seen: typeof alert.first_seen === "string" ? alert.first_seen : undefined,
      last_seen: typeof alert.last_seen === "string" ? alert.last_seen : undefined,
      status: alert.status === "resolved" ? "resolved" : "open",
    }];
  });
}

export function estimateWasteRate(result: Pick<AnalysisResult, "token_waste_estimate" | "n_conversations">) {
  if (!result.n_conversations || result.n_conversations <= 0) return undefined;
  return clamp((result.token_waste_estimate / result.n_conversations) * 8, 0, 100);
}

export function estimateSavingsOpportunity(result: Pick<AnalysisResult, "token_waste_estimate" | "cross_intent_similarity" | "response_variance">) {
  const wasteBase = result.token_waste_estimate ?? 0;
  const similarityFactor = clamp((result.cross_intent_similarity ?? 0) / 100, 0, 1);
  const varianceFactor = clamp((result.response_variance ?? 0) / 100, 0, 1);
  const monthlySavings = Math.max(0, Math.round(wasteBase * (0.35 + similarityFactor * 0.25 + varianceFactor * 0.2)));
  const savingPercent = clamp(Math.round((0.2 + similarityFactor * 0.25 + varianceFactor * 0.15) * 100));
  return { monthlySavings, savingPercent };
}

export function getMetricNarrative(metric: "consistency" | "stability" | "similarity" | "coverage" | "confidence", value?: number) {
  if (value === undefined || value === null) return { status: "Unavailable", detail: "This metric is not available in the current run." };

  if (metric === "similarity") {
    if (value <= 40) return { status: "Good", detail: "Different intents are staying separated. Your assistant is not collapsing contexts too often." };
    if (value <= 60) return { status: "Attention", detail: "Some intents are starting to sound alike. Review prompt boundaries before reuse grows." };
    return { status: "Bad", detail: "Different intents are producing very similar responses. This usually means generic templates are overpowering intent logic." };
  }

  if (metric === "coverage") {
    if (value >= 85) return { status: "Good", detail: "Your current dataset covers most expected intents with enough samples to trust the analysis." };
    if (value >= 60) return { status: "Attention", detail: "Coverage is acceptable, but some intents still need more examples to avoid blind spots." };
    return { status: "Bad", detail: "Coverage is weak. The model may look stable only because parts of the intent space are under-sampled." };
  }

  if (value >= 75) return { status: "Good", detail: "This is in a healthy range and should support more predictable behavior." };
  if (value >= 60) return { status: "Attention", detail: "This is usable, but still loose enough to create inconsistent user experiences." };
  return { status: "Bad", detail: "This is below the recommended range and should be treated as a priority problem." };
}

export function getExecutiveSummary(result: AnalysisResult) {
  const similarity = result.cross_intent_similarity ?? 0;
  const consistency = result.consistency_score ?? 0;
  const stability = result.response_stability_score ?? 0;

  if (similarity > 80) {
    return {
      title: "Your assistant is over-reusing answers across different intents.",
      detail: "This is the main problem in the current run. Users are likely receiving generic answers when they should be getting intent-specific responses.",
    };
  }

  if (consistency < 60) {
    return {
      title: "Your assistant is not following a stable response pattern.",
      detail: "The model changes too much inside the same intent. This usually points to weak prompting, loose templates or insufficient examples.",
    };
  }

  if (stability < 60) {
    return {
      title: "Your assistant is unstable inside the same topic.",
      detail: "Even when intent classification is correct, the response structure still swings more than it should.",
    };
  }

  return {
    title: "Your current run looks operationally healthy.",
    detail: "The main metrics are inside acceptable ranges, so optimization can focus on efficiency and long-term monitoring.",
  };
}

export function getTopUnstableIntents(intents: IntentMetric[] = [], limit = 5) {
  return [...intents]
    .filter((intent) => intent.intent)
    .sort((left, right) => (left.consistency_score ?? 100) - (right.consistency_score ?? 100))
    .slice(0, limit);
}

export function getTopRecommendations(alerts: Array<{ recommendation?: string }> = [], limit = 4) {
  return Array.from(new Set(alerts.map((alert) => alert.recommendation).filter(Boolean) as string[])).slice(0, limit);
}
