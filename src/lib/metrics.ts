import type { AlertItem } from "@/lib/types";
import type { AnalysisResult, IntentMetric } from "@/lib/api";

export type HealthLevel = "EXCELLENT" | "HEALTHY" | "WARNING" | "POOR" | "CRITICAL";
type UiLanguage = "en" | "pt-BR";

function isPortuguese(language: UiLanguage) {
  return language === "pt-BR";
}

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

export function formatPercent(value?: number, decimals = 2, language: UiLanguage = "en") {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return isPortuguese(language) ? "Dados indisponiveis" : "Data not available";
  }
  return `${value.toFixed(decimals)}%`;
}

export function formatMoney(value?: number, language: UiLanguage = "en") {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return isPortuguese(language) ? "Dados indisponiveis" : "Data not available";
  }

  return new Intl.NumberFormat(isPortuguese(language) ? "pt-BR" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatDate(value?: string, language: UiLanguage = "en") {
  if (!value) return isPortuguese(language) ? "Dados indisponiveis" : "Data not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(isPortuguese(language) ? "pt-BR" : "en-US");
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

export function getMetricNarrative(
  metric: "consistency" | "stability" | "similarity" | "coverage" | "confidence",
  value?: number,
  language: UiLanguage = "en",
) {
  if (value === undefined || value === null) {
    return {
      status: isPortuguese(language) ? "Indisponivel" : "Unavailable",
      detail: isPortuguese(language)
        ? "Esta metrica nao esta disponivel nesta execucao."
        : "This metric is not available in the current run.",
    };
  }

  if (metric === "similarity") {
    if (value <= 40) {
      return {
        status: isPortuguese(language) ? "Bom" : "Good",
        detail: isPortuguese(language)
          ? "Os intents continuam separados. O assistente nao esta colapsando contextos com frequencia."
          : "Different intents are staying separated. Your assistant is not collapsing contexts too often.",
      };
    }
    if (value <= 60) {
      return {
        status: isPortuguese(language) ? "Atencao" : "Attention",
        detail: isPortuguese(language)
          ? "Alguns intents estao comecando a soar parecidos. Revise os limites de prompt antes que a reutilizacao aumente."
          : "Some intents are starting to sound alike. Review prompt boundaries before reuse grows.",
      };
    }
    return {
      status: isPortuguese(language) ? "Ruim" : "Bad",
      detail: isPortuguese(language)
        ? "Intents diferentes estao gerando respostas muito parecidas. Isso costuma indicar que templates genericos estao sobrepondo a logica de intent."
        : "Different intents are producing very similar responses. This usually means generic templates are overpowering intent logic.",
    };
  }

  if (metric === "coverage") {
    if (value >= 85) {
      return {
        status: isPortuguese(language) ? "Bom" : "Good",
        detail: isPortuguese(language)
          ? "O dataset atual cobre a maior parte dos intents esperados com amostras suficientes para sustentar a analise."
          : "Your current dataset covers most expected intents with enough samples to trust the analysis.",
      };
    }
    if (value >= 60) {
      return {
        status: isPortuguese(language) ? "Atencao" : "Attention",
        detail: isPortuguese(language)
          ? "A cobertura e aceitavel, mas alguns intents ainda precisam de mais exemplos para evitar pontos cegos."
          : "Coverage is acceptable, but some intents still need more examples to avoid blind spots.",
      };
    }
    return {
      status: isPortuguese(language) ? "Ruim" : "Bad",
      detail: isPortuguese(language)
        ? "A cobertura esta fraca. O modelo pode parecer estavel so porque partes do espaco de intents estao subamostradas."
        : "Coverage is weak. The model may look stable only because parts of the intent space are under-sampled.",
    };
  }

  if (value >= 75) {
    return {
      status: isPortuguese(language) ? "Bom" : "Good",
      detail: isPortuguese(language)
        ? "Esta metrica esta em uma faixa saudavel e deve sustentar um comportamento mais previsivel."
        : "This is in a healthy range and should support more predictable behavior.",
    };
  }
  if (value >= 60) {
    return {
      status: isPortuguese(language) ? "Atencao" : "Attention",
      detail: isPortuguese(language)
        ? "Ainda e utilizavel, mas continua frouxa o bastante para gerar experiencias inconsistentes."
        : "This is usable, but still loose enough to create inconsistent user experiences.",
    };
  }
  return {
    status: isPortuguese(language) ? "Ruim" : "Bad",
    detail: isPortuguese(language)
      ? "Esta abaixo da faixa recomendada e deve ser tratada como prioridade."
      : "This is below the recommended range and should be treated as a priority problem.",
  };
}

export function getExecutiveSummary(result: AnalysisResult, language: UiLanguage = "en") {
  const similarity = result.cross_intent_similarity ?? 0;
  const consistency = result.consistency_score ?? 0;
  const stability = result.response_stability_score ?? 0;

  if (similarity > 80) {
    return {
      title: isPortuguese(language)
        ? "Seu assistente esta reutilizando respostas demais entre intents diferentes."
        : "Your assistant is over-reusing answers across different intents.",
      detail: isPortuguese(language)
        ? "Esse e o principal problema desta execucao. Os usuarios provavelmente estao recebendo respostas genericas quando deveriam receber respostas especificas por intent."
        : "This is the main problem in the current run. Users are likely receiving generic answers when they should be getting intent-specific responses.",
    };
  }

  if (consistency < 60) {
    return {
      title: isPortuguese(language)
        ? "Seu assistente nao esta seguindo um padrao de resposta estavel."
        : "Your assistant is not following a stable response pattern.",
      detail: isPortuguese(language)
        ? "O modelo varia demais dentro do mesmo intent. Isso normalmente aponta para prompting fraco, templates frouxos ou exemplos insuficientes."
        : "The model changes too much inside the same intent. This usually points to weak prompting, loose templates or insufficient examples.",
    };
  }

  if (stability < 60) {
    return {
      title: isPortuguese(language)
        ? "Seu assistente esta instavel dentro do mesmo topico."
        : "Your assistant is unstable inside the same topic.",
      detail: isPortuguese(language)
        ? "Mesmo quando a classificacao de intent esta correta, a estrutura da resposta ainda oscila mais do que deveria."
        : "Even when intent classification is correct, the response structure still swings more than it should.",
    };
  }

  return {
    title: isPortuguese(language)
      ? "A execucao atual parece saudavel do ponto de vista operacional."
      : "Your current run looks operationally healthy.",
    detail: isPortuguese(language)
      ? "As metricas principais estao em faixas aceitaveis, entao a otimizacao pode focar em eficiencia e monitoramento continuo."
      : "The main metrics are inside acceptable ranges, so optimization can focus on efficiency and long-term monitoring.",
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
