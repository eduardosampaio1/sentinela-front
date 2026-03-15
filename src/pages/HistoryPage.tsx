import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  GitCompareArrows,
  History,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalysisResult } from "@/lib/api";
import { Button } from "@/components/ui/button";

type HistoryRun = {
  id: string;
  created_at: string;
  engine_version: string | null;
  risk_level: string | null;
  n_conversations: number | null;
  n_intents: number | null;
  raw_result: AnalysisResult;
};

type RunMetrics = {
  consistency: number | null;
  globalConfidence: number | null;
  tokenWaste: number | null;
  crossIntentSimilarity: number | null;
  alerts: number;
};

type InsightTone = "good" | "bad" | "neutral";

function formatDate(value?: string | null, locale = "en-US", notAvailable = "N/A") {
  if (!value) return notAvailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
}

function formatShortDate(value?: string | null, locale = "en-US", notAvailable = "N/A") {
  if (!value) return notAvailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "2-digit",
  });
}

function formatMetric(value?: number | null, decimals = 2, notAvailable = "N/A") {
  if (value === null || value === undefined || Number.isNaN(value)) return notAvailable;
  return value.toFixed(decimals);
}

function formatCompactMetric(value?: number | null, notAvailable = "N/A") {
  if (value === null || value === undefined || Number.isNaN(value)) return notAvailable;
  if (Math.abs(value) >= 1000) return value.toLocaleString();
  return value.toFixed(2);
}

function toPercent(value?: number | null, notAvailable = "N/A") {
  if (value === null || value === undefined || Number.isNaN(value)) return notAvailable;
  const normalized = value <= 1 ? value * 100 : value;
  return `${normalized.toFixed(0)}%`;
}

function riskScore(risk?: string | null) {
  switch ((risk ?? "").toUpperCase()) {
    case "LOW":
      return 1;
    case "MEDIUM":
      return 2;
    case "HIGH":
      return 3;
    default:
      return 0;
  }
}

function riskLabel(risk?: string | null) {
  return (risk ?? "UNKNOWN").toUpperCase();
}

function getRiskPillClass(risk?: string | null) {
  switch (riskLabel(risk)) {
    case "LOW":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "MEDIUM":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "HIGH":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function getRiskDotClass(risk?: string | null) {
  switch (riskLabel(risk)) {
    case "LOW":
      return "bg-emerald-400";
    case "MEDIUM":
      return "bg-amber-400";
    case "HIGH":
      return "bg-red-400";
    default:
      return "bg-muted-foreground";
  }
}

function clampPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const normalized = value <= 1 ? value * 100 : value;
  return Math.max(4, Math.min(100, normalized));
}

function extractMetrics(run: HistoryRun): RunMetrics {
  const raw = (run.raw_result ?? {}) as Record<string, unknown>;

  return {
    consistency:
      typeof raw.consistency_score === "number" ? raw.consistency_score : null,
    globalConfidence:
      typeof raw.global_confidence === "number" ? raw.global_confidence : null,
    tokenWaste:
      typeof raw.token_waste_estimate === "number" ? raw.token_waste_estimate : null,
    crossIntentSimilarity:
      typeof raw.cross_intent_similarity === "number"
        ? raw.cross_intent_similarity
        : null,
    alerts: Array.isArray(raw.alerts) ? raw.alerts.length : 0,
  };
}

function average(values: Array<number | null>) {
  const valid = values.filter((v): v is number => typeof v === "number");
  if (!valid.length) return null;
  return valid.reduce((acc, curr) => acc + curr, 0) / valid.length;
}

function getDelta(current?: number | null, previous?: number | null) {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined
  ) {
    return null;
  }
  return current - previous;
}

function getDeltaPresentation(
  current?: number | null,
  previous?: number | null,
  inverseGood = false
) {
  const delta = getDelta(current, previous);

  if (delta === null) {
    return {
      label: "N/A",
      className: "text-muted-foreground",
      icon: <ArrowRight className="h-3.5 w-3.5" />,
    };
  }

  if (Math.abs(delta) < 0.0001) {
    return {
      label: "No change",
      className: "text-muted-foreground",
      icon: <ArrowRight className="h-3.5 w-3.5" />,
    };
  }

  const improved = inverseGood ? delta < 0 : delta > 0;

  return {
    label: `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`,
    className: improved ? "text-emerald-400" : "text-red-400",
    icon: improved ? (
      <ArrowUpRight className="h-3.5 w-3.5" />
    ) : (
      <ArrowDownRight className="h-3.5 w-3.5" />
    ),
  };
}

function compareRisk(current?: string | null, previous?: string | null) {
  const curr = riskScore(current);
  const prev = riskScore(previous);

  if (!curr || !prev) {
    return {
      label: "N/A",
      className: "text-muted-foreground",
      icon: <ArrowRight className="h-3.5 w-3.5" />,
    };
  }

  if (curr === prev) {
    return {
      label: "No change",
      className: "text-muted-foreground",
      icon: <ArrowRight className="h-3.5 w-3.5" />,
    };
  }

  if (curr < prev) {
    return {
      label: `${riskLabel(previous)} ? ${riskLabel(current)}`,
      className: "text-emerald-400",
      icon: <ArrowDownRight className="h-3.5 w-3.5" />,
    };
  }

  return {
    label: `${riskLabel(previous)} ? ${riskLabel(current)}`,
    className: "text-red-400",
    icon: <ArrowUpRight className="h-3.5 w-3.5" />,
  };
}

function buildInsight(current: HistoryRun, previous?: HistoryRun | null) {
  const currentMetrics = extractMetrics(current);
  const previousMetrics = previous ? extractMetrics(previous) : null;

  if (!previous || !previousMetrics) {
    return {
      title: "Baseline created",
      text: "This is your first checkpoint. The next runs will show whether the system is stabilizing or regressing.",
      tone: "neutral" as InsightTone,
    };
  }

  const consistencyDelta = getDelta(
    currentMetrics.consistency,
    previousMetrics.consistency
  );
  const wasteDelta = getDelta(currentMetrics.tokenWaste, previousMetrics.tokenWaste);
  const similarityDelta = getDelta(
    currentMetrics.crossIntentSimilarity,
    previousMetrics.crossIntentSimilarity
  );

  if (riskScore(current.risk_level) > riskScore(previous.risk_level)) {
    return {
      title: "Regression detected",
      text: `Risk moved from ${riskLabel(previous.risk_level)} to ${riskLabel(
        current.risk_level
      )}. This is not a cosmetic variation; the system likely became less reliable.`,
      tone: "bad" as InsightTone,
    };
  }

  if (
    consistencyDelta !== null &&
    consistencyDelta > 0.03 &&
    (wasteDelta === null || wasteDelta <= 0)
  ) {
    return {
      title: "Healthy optimization",
      text: `Consistency improved by ${consistencyDelta.toFixed(
        2
      )} without increasing waste. This looks like a meaningful quality gain.`,
      tone: "good" as InsightTone,
    };
  }

  if (wasteDelta !== null && wasteDelta > 0.03) {
    return {
      title: "Efficiency degraded",
      text: `Token waste increased by ${wasteDelta.toFixed(
        2
      )}. Even if quality held, operational cost likely got worse.`,
      tone: "bad" as InsightTone,
    };
  }

  if (similarityDelta !== null && similarityDelta > 0.03) {
    return {
      title: "Intent collision pressure rising",
      text: `Cross-intent similarity increased by ${similarityDelta.toFixed(
        2
      )}. This may indicate more overlap and ambiguity between intents.`,
      tone: "neutral" as InsightTone,
    };
  }

  return {
    title: "Mixed signal",
    text: "The latest run changed, but not enough to call it a clearly better state. Keep comparing consecutive runs before assuming improvement.",
    tone: "neutral" as InsightTone,
  };
}

function getInsightToneClass(tone: InsightTone) {
  if (tone === "good") return "border-emerald-500/20 bg-emerald-500/10";
  if (tone === "bad") return "border-red-500/20 bg-red-500/10";
  return "border-amber-500/20 bg-amber-500/10";
}

function getRunSearchBlob(run: HistoryRun) {
  const metrics = extractMetrics(run);

  return [
    run.id,
    run.engine_version ?? "",
    run.risk_level ?? "",
    String(run.n_conversations ?? ""),
    String(run.n_intents ?? ""),
    formatMetric(metrics.consistency),
    formatMetric(metrics.tokenWaste),
    formatMetric(metrics.globalConfidence),
    formatMetric(metrics.crossIntentSimilarity),
    String(metrics.alerts),
  ]
    .join(" ")
    .toLowerCase();
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const { loadStoredAnalysis } = useAnalysis();
  const { language } = useLanguage();

  const text = language === "pt-BR"
    ? {
        locale: "pt-BR",
        observability: "Observabilidade de IA",
        title: "Historico de analises",
        subtitle:
          "Monitore a saude das execucoes, detecte regressos e compare bases enviadas como um fluxo de observabilidade, nao como um arquivo morto.",
        openLatestRun: "Abrir ultima execucao",
        compareLatestVsPrevious: "Comparar ultima x anterior",
        totalRuns: "Total de execucoes",
        avgConsistency: "Consistencia media",
        avgConfidence: "Confianca media",
        highRiskCount: "Alto risco",
        latestSystemStatus: "Estado mais recente do sistema",
        consistency: "Consistencia",
        tokenWaste: "Token waste",
        alerts: "Alertas",
        riskStatus: "Status de risco",
        previous: "Anterior",
        automatedDiagnosis: "Diagnostico automatizado",
        engine: "Engine",
        conversations: "Conversas",
        intents: "Intents",
        avgWaste: "Waste medio",
        trendLine: "Linha de tendencia",
        consistencyTrendTitle: "Consistencia nas execucoes recentes",
        consistencyTrendBody: "Sinal rapido para estabilidade e deriva",
        wasteMonitor: "Monitor de waste",
        smallerBetter: "Quanto menor, melhor",
        comparativeView: "Visao comparativa",
        clearComparison: "Limpar comparacao",
        runA: "Execucao A",
        runB: "Execucao B",
        metric: "Metrica",
        delta: "Delta",
        globalConfidence: "Confianca global",
        crossIntentSimilarity: "Similaridade entre intents",
        riskLevel: "Nivel de risco",
        openRunA: "Abrir execucao A",
        openRunB: "Abrir execucao B",
        runs: "Execucoes",
        runsBody:
          "Busque, filtre, compare e reabra analises sem tratar o historico como armazenamento morto.",
        searchPlaceholder: "Buscar engine, risco, metricas...",
        allRiskLevels: "Todos os niveis de risco",
        lowRisk: "Baixo risco",
        mediumRisk: "Risco medio",
        highRisk: "Alto risco",
        selectedCount: (count: number) => `${count}/2 selecionadas`,
        searchChip: (value: string) => `Busca: ${value}`,
        riskChip: (value: string) => `Risco: ${value}`,
        loadingHistory: "Carregando historico...",
        failedToLoadHistory: (value: string) => `Falha ao carregar historico: ${value}`,
        emptyTitle: "Nenhuma execucao encontrada",
        emptyBody:
          "Os filtros atuais removeram todas as execucoes. Isso tambem e um sinal: ou o historico ainda e pequeno, ou os filtros estao restritivos demais.",
        selectRun: (id: string) => `Selecionar ${id}`,
        latest: "Mais recente",
        selected: "Selecionada",
        compare: "Comparar",
        open: "Abrir",
        confidence: "Confianca",
        similarity: "Similaridade",
        totalTriggeredIssues: "Total de problemas acionados",
        inspectRun: "Inspecionar execucao",
        noChange: "Sem mudanca",
        notAvailable: "N/D",
        riskLowLabel: "Baixo",
        riskMediumLabel: "Medio",
        riskHighLabel: "Alto",
        riskUnknownLabel: "Desconhecido",
        baselineTitle: "Baseline criada",
        baselineText:
          "Este e seu primeiro checkpoint. As proximas execucoes vao mostrar se o sistema esta estabilizando ou regredindo.",
        regressionTitle: "Regressao detectada",
        regressionText: (previous: string, current: string) =>
          `O risco mudou de ${previous} para ${current}. Isso nao parece uma variacao cosmetica; o sistema provavelmente ficou menos confiavel.`,
        healthyOptimizationTitle: "Otimizacao saudavel",
        healthyOptimizationText: (delta: number) =>
          `A consistencia melhorou ${delta.toFixed(2)} sem aumentar waste. Isso parece um ganho real de qualidade.`,
        efficiencyDegradedTitle: "Eficiencia degradada",
        efficiencyDegradedText: (delta: number) =>
          `Token waste aumentou ${delta.toFixed(2)}. Mesmo que a qualidade tenha se mantido, o custo operacional provavelmente piorou.`,
        collisionPressureTitle: "Pressao de colisao entre intents subindo",
        collisionPressureText: (delta: number) =>
          `A similaridade entre intents aumentou ${delta.toFixed(2)}. Isso pode indicar mais sobreposicao e ambiguidade entre intents.`,
        mixedSignalTitle: "Sinal misto",
        mixedSignalText:
          "A ultima execucao mudou, mas ainda nao o bastante para dizer que o estado melhorou de forma clara. Continue comparando execucoes consecutivas antes de assumir melhora.",
      }
    : {
        locale: "en-US",
        observability: "AI Observability",
        title: "Analysis History",
        subtitle:
          "Monitor run health, detect regressions, and compare uploaded bases as an observability workflow instead of a passive archive.",
        openLatestRun: "Open latest run",
        compareLatestVsPrevious: "Compare latest vs previous",
        totalRuns: "Total runs",
        avgConsistency: "Avg consistency",
        avgConfidence: "Avg confidence",
        highRiskCount: "High-risk",
        latestSystemStatus: "Latest system status",
        consistency: "Consistency",
        tokenWaste: "Token waste",
        alerts: "Alerts",
        riskStatus: "Risk status",
        previous: "Prev",
        automatedDiagnosis: "Automated diagnosis",
        engine: "Engine",
        conversations: "Conversations",
        intents: "Intents",
        avgWaste: "Avg waste",
        trendLine: "Trend line",
        consistencyTrendTitle: "Consistency over recent runs",
        consistencyTrendBody: "Fast signal for stability and drift",
        wasteMonitor: "Waste monitor",
        smallerBetter: "Smaller is better",
        comparativeView: "Comparative view",
        clearComparison: "Clear comparison",
        runA: "Run A",
        runB: "Run B",
        metric: "Metric",
        delta: "Delta",
        globalConfidence: "Global confidence",
        crossIntentSimilarity: "Cross-intent similarity",
        riskLevel: "Risk level",
        openRunA: "Open Run A",
        openRunB: "Open Run B",
        runs: "Runs",
        runsBody:
          "Search, filter, compare, and reopen analyses without treating history as dead storage.",
        searchPlaceholder: "Search engine, risk, metrics...",
        allRiskLevels: "All risk levels",
        lowRisk: "Low risk",
        mediumRisk: "Medium risk",
        highRisk: "High risk",
        selectedCount: (count: number) => `${count}/2 selected`,
        searchChip: (value: string) => `Search: ${value}`,
        riskChip: (value: string) => `Risk: ${value}`,
        loadingHistory: "Loading history...",
        failedToLoadHistory: (value: string) => `Failed to load history: ${value}`,
        emptyTitle: "No matching runs found",
        emptyBody:
          "Your current filters removed every run. That is useful feedback too: either your history is too small, or your filters are too strict.",
        selectRun: (id: string) => `Select ${id}`,
        latest: "Latest",
        selected: "Selected",
        compare: "Compare",
        open: "Open",
        confidence: "Confidence",
        similarity: "Similarity",
        totalTriggeredIssues: "Total triggered issues",
        inspectRun: "Inspect run",
        noChange: "No change",
        notAvailable: "N/A",
        riskLowLabel: "Low",
        riskMediumLabel: "Medium",
        riskHighLabel: "High",
        riskUnknownLabel: "Unknown",
        baselineTitle: "Baseline created",
        baselineText:
          "This is your first checkpoint. The next runs will show whether the system is stabilizing or regressing.",
        regressionTitle: "Regression detected",
        regressionText: (previous: string, current: string) =>
          `Risk moved from ${previous} to ${current}. This is not a cosmetic variation; the system likely became less reliable.`,
        healthyOptimizationTitle: "Healthy optimization",
        healthyOptimizationText: (delta: number) =>
          `Consistency improved by ${delta.toFixed(2)} without increasing waste. This looks like a meaningful quality gain.`,
        efficiencyDegradedTitle: "Efficiency degraded",
        efficiencyDegradedText: (delta: number) =>
          `Token waste increased by ${delta.toFixed(2)}. Even if quality held, operational cost likely got worse.`,
        collisionPressureTitle: "Intent collision pressure rising",
        collisionPressureText: (delta: number) =>
          `Cross-intent similarity increased by ${delta.toFixed(2)}. This may indicate more overlap and ambiguity between intents.`,
        mixedSignalTitle: "Mixed signal",
        mixedSignalText:
          "The latest run changed, but not enough to call it a clearly better state. Keep comparing consecutive runs before assuming improvement.",
      };

  const displayRisk = (risk?: string | null) => {
    switch ((risk ?? "").toUpperCase()) {
      case "LOW":
        return text.riskLowLabel;
      case "MEDIUM":
        return text.riskMediumLabel;
      case "HIGH":
        return text.riskHighLabel;
      default:
        return text.riskUnknownLabel;
    }
  };

  const presentDelta = (current?: number | null, previous?: number | null, inverseGood = false) => {
    const presentation = getDeltaPresentation(current, previous, inverseGood);
    if (presentation.label === "N/A") return { ...presentation, label: text.notAvailable };
    if (presentation.label === "No change") return { ...presentation, label: text.noChange };
    return presentation;
  };

  const presentRiskDelta = (current?: string | null, previous?: string | null) => {
    const currentScore = riskScore(current);
    const previousScore = riskScore(previous);

    if (!currentScore || !previousScore) {
      return { label: text.notAvailable, className: "text-muted-foreground", icon: <ArrowRight className="h-3.5 w-3.5" /> };
    }

    if (currentScore === previousScore) {
      return { label: text.noChange, className: "text-muted-foreground", icon: <ArrowRight className="h-3.5 w-3.5" /> };
    }

    return {
      label: `${displayRisk(previous)} -> ${displayRisk(current)}`,
      className: currentScore < previousScore ? "text-emerald-400" : "text-red-400",
      icon: currentScore < previousScore
        ? <ArrowDownRight className="h-3.5 w-3.5" />
        : <ArrowUpRight className="h-3.5 w-3.5" />,
    };
  };

  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL");

  useEffect(() => {
    if (!workspace?.id) return;

    async function fetchRuns() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("analysis_runs")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError(error.message);
        setRuns([]);
      } else {
        setRuns((data ?? []) as HistoryRun[]);
      }

      setLoading(false);
    }

    fetchRuns();
  }, [workspace?.id]);

  function handleOpenRun(run: HistoryRun) {
    loadStoredAnalysis(run.raw_result);
    navigate("/dashboard");
  }

  function toggleRun(id: string) {
    setSelectedRuns((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }

      if (prev.length >= 2) {
        return [prev[1], id];
      }

      return [...prev, id];
    });
  }

  function clearSelection() {
    setSelectedRuns([]);
  }

  const filteredRuns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return runs.filter((run) => {
      const matchesRisk =
        riskFilter === "ALL" ? true : riskLabel(run.risk_level) === riskFilter;

      const matchesSearch = normalizedSearch
        ? getRunSearchBlob(run).includes(normalizedSearch)
        : true;

      return matchesRisk && matchesSearch;
    });
  }, [runs, riskFilter, search]);

  const selectedRunObjects = useMemo(
    () => runs.filter((run) => selectedRuns.includes(run.id)),
    [runs, selectedRuns]
  );

  const compareA = selectedRunObjects[0];
  const compareB = selectedRunObjects[1];

  const latestRun = runs[0];
  const previousRun = runs[1];
  const latestMetrics = latestRun ? extractMetrics(latestRun) : null;
  const previousMetrics = previousRun ? extractMetrics(previousRun) : null;
  const insight = useMemo(() => {
    if (!latestRun) return null;
    if (!previousRun) {
      return {
        title: text.baselineTitle,
        text: text.baselineText,
        tone: "neutral" as InsightTone,
      };
    }

    const currentMetrics = extractMetrics(latestRun);
    const previousMetricsLocal = extractMetrics(previousRun);
    const consistencyDelta = getDelta(currentMetrics.consistency, previousMetricsLocal.consistency);
    const wasteDelta = getDelta(currentMetrics.tokenWaste, previousMetricsLocal.tokenWaste);
    const similarityDelta = getDelta(
      currentMetrics.crossIntentSimilarity,
      previousMetricsLocal.crossIntentSimilarity
    );

    if (riskScore(latestRun.risk_level) > riskScore(previousRun.risk_level)) {
      return {
        title: text.regressionTitle,
        text: text.regressionText(displayRisk(previousRun.risk_level), displayRisk(latestRun.risk_level)),
        tone: "bad" as InsightTone,
      };
    }

    if (consistencyDelta !== null && consistencyDelta > 0.03 && (wasteDelta === null || wasteDelta <= 0)) {
      return {
        title: text.healthyOptimizationTitle,
        text: text.healthyOptimizationText(consistencyDelta),
        tone: "good" as InsightTone,
      };
    }

    if (wasteDelta !== null && wasteDelta > 0.03) {
      return {
        title: text.efficiencyDegradedTitle,
        text: text.efficiencyDegradedText(wasteDelta),
        tone: "bad" as InsightTone,
      };
    }

    if (similarityDelta !== null && similarityDelta > 0.03) {
      return {
        title: text.collisionPressureTitle,
        text: text.collisionPressureText(similarityDelta),
        tone: "neutral" as InsightTone,
      };
    }

    return {
      title: text.mixedSignalTitle,
      text: text.mixedSignalText,
      tone: "neutral" as InsightTone,
    };
  }, [displayRisk, latestRun, previousRun, text]);

  const totalRuns = runs.length;
  const averageConsistency = average(
    runs.map((run) => extractMetrics(run).consistency)
  );
  const averageWaste = average(runs.map((run) => extractMetrics(run).tokenWaste));
  const averageConfidence = average(
    runs.map((run) => extractMetrics(run).globalConfidence)
  );
  const highRiskCount = runs.filter(
    (run) => riskLabel(run.risk_level) === "HIGH"
  ).length;

  const recentTimeline = runs.slice(0, 8);

  return (
    <div className="min-w-0 space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_30%)]" />
          <div className="relative p-4 sm:p-6 lg:p-7">
            <div className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-4">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Activity className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{text.observability}</span>
                </div>

                <div className="space-y-2">
                  <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {text.title}
                  </h1>
                  <p className="max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                    {text.subtitle}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {latestRun && (
                    <Button className="w-full sm:w-auto" onClick={() => handleOpenRun(latestRun)}>
                      {text.openLatestRun}
                    </Button>
                  )}
                  {runs.length >= 2 && (
                    <Button
                      className="w-full sm:w-auto"
                      variant="outline"
                      onClick={() => setSelectedRuns([runs[1].id, runs[0].id])}
                    >
                      {text.compareLatestVsPrevious}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-[560px] xl:grid-cols-4">
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {text.totalRuns}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {totalRuns}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {text.avgConsistency}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {formatMetric(averageConsistency, 2, text.notAvailable)}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {text.avgConfidence}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {formatMetric(averageConfidence, 2, text.notAvailable)}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {text.highRiskCount}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {highRiskCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {latestRun && latestMetrics && (
        <section className="grid min-w-0 gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                {text.latestSystemStatus}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {text.consistency}
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {formatMetric(latestMetrics.consistency, 2, text.notAvailable)}
                </div>
                {previousMetrics && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1 text-xs ${
                      presentDelta(
                        latestMetrics.consistency,
                        previousMetrics.consistency
                      ).className
                    }`}
                  >
                    {
                      presentDelta(
                        latestMetrics.consistency,
                        previousMetrics.consistency
                      ).icon
                    }
                    {
                      presentDelta(
                        latestMetrics.consistency,
                        previousMetrics.consistency
                      ).label
                    }
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {text.tokenWaste}
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {formatMetric(latestMetrics.tokenWaste, 2, text.notAvailable)}
                </div>
                {previousMetrics && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1 text-xs ${
                      presentDelta(
                        latestMetrics.tokenWaste,
                        previousMetrics.tokenWaste,
                        true
                      ).className
                    }`}
                  >
                    {
                      presentDelta(
                        latestMetrics.tokenWaste,
                        previousMetrics.tokenWaste,
                        true
                      ).icon
                    }
                    {
                      presentDelta(
                        latestMetrics.tokenWaste,
                        previousMetrics.tokenWaste,
                        true
                      ).label
                    }
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {text.alerts}
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {latestMetrics.alerts}
                </div>
                {previousMetrics && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {text.previous}: {previousMetrics.alerts}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {text.riskStatus}
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${getRiskPillClass(
                      latestRun.risk_level
                    )}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${getRiskDotClass(
                        latestRun.risk_level
                      )}`}
                    />
                    {displayRisk(latestRun.risk_level)}
                  </span>
                </div>
                {previousRun && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1 text-xs ${
                      presentRiskDelta(latestRun.risk_level, previousRun.risk_level)
                        .className
                    }`}
                  >
                    {presentRiskDelta(latestRun.risk_level, previousRun.risk_level).icon}
                    {presentRiskDelta(latestRun.risk_level, previousRun.risk_level).label}
                  </div>
                )}
              </div>
            </div>
          </div>

          {insight && (
            <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                {insight.tone === "good" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : insight.tone === "bad" ? (
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                )}
                <h2 className="text-base font-semibold text-foreground">
                  {text.automatedDiagnosis}
                </h2>
              </div>

              <div className={`rounded-2xl border p-4 ${getInsightToneClass(insight.tone)}`}>
                <div className="text-sm font-semibold text-foreground">
                  {insight.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {insight.text}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">{text.engine}</div>
                  <div className="mt-1 break-words text-sm font-medium text-foreground">
                    {latestRun.engine_version ?? text.notAvailable}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">{text.conversations}</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {latestRun.n_conversations ?? 0}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">{text.intents}</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {latestRun.n_intents ?? 0}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">{text.avgWaste}</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {formatMetric(averageWaste, 2, text.notAvailable)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {recentTimeline.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
            <h2 className="text-base font-semibold text-foreground">{text.trendLine}</h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="mb-4">
                <div className="text-sm font-medium text-foreground">
                  {text.consistencyTrendTitle}
                </div>
                <div className="text-xs text-muted-foreground">
                  {text.consistencyTrendBody}
                </div>
              </div>

              <div className="flex items-end gap-2 overflow-hidden">
                {recentTimeline
                  .slice()
                  .reverse()
                  .map((run) => {
                    const metrics = extractMetrics(run);

                    return (
                      <div key={`consistency-${run.id}`} className="min-w-0 flex-1">
                        <div className="flex h-28 items-end">
                          <div
                            className="w-full rounded-t-md bg-primary/80 transition-all"
                            style={{
                              height: `${clampPercent(metrics.consistency)}%`,
                            }}
                            title={`${text.consistency}: ${formatMetric(metrics.consistency, 2, text.notAvailable)}`}
                          />
                        </div>
                        <div className="mt-2 truncate text-center text-[10px] text-muted-foreground">
                          {formatShortDate(run.created_at, text.locale, text.notAvailable)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="mb-4">
                <div className="text-sm font-medium text-foreground">
                  {text.wasteMonitor}
                </div>
                <div className="text-xs text-muted-foreground">
                  {text.smallerBetter}
                </div>
              </div>

              <div className="space-y-3">
                {recentTimeline.map((run) => {
                  const metrics = extractMetrics(run);

                  return (
                    <div key={`waste-${run.id}`} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${getRiskDotClass(
                              run.risk_level
                            )}`}
                          />
                          <span className="truncate text-xs text-muted-foreground">
                            {formatDate(run.created_at, text.locale, text.notAvailable)}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {formatMetric(metrics.tokenWaste, 2, text.notAvailable)}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-amber-400/80"
                          style={{ width: `${clampPercent(metrics.tokenWaste)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {compareA && compareB && (
        <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                {text.comparativeView}
              </h2>
            </div>

            <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={clearSelection}>
              {text.clearComparison}
            </Button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            {[compareA, compareB].map((run, idx) => (
              <div
                key={run.id}
                className="rounded-2xl border border-border bg-background/40 p-4"
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {idx === 0 ? text.runA : text.runB}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${getRiskDotClass(
                      run.risk_level
                    )}`}
                  />
                  <span className="break-words text-sm font-medium text-foreground">
                    {formatDate(run.created_at, text.locale, text.notAvailable)}
                  </span>
                </div>

                <div className="mt-3 break-words text-sm text-muted-foreground">
                  {text.engine}: {run.engine_version ?? text.notAvailable}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {text.conversations}: {run.n_conversations ?? 0}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {text.intents}: {run.n_intents ?? 0}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 md:hidden">
            {[
              {
                label: text.consistency,
                a: extractMetrics(compareA).consistency,
                b: extractMetrics(compareB).consistency,
                delta: presentDelta(extractMetrics(compareB).consistency, extractMetrics(compareA).consistency),
              },
              {
                label: text.globalConfidence,
                a: extractMetrics(compareA).globalConfidence,
                b: extractMetrics(compareB).globalConfidence,
                delta: presentDelta(extractMetrics(compareB).globalConfidence, extractMetrics(compareA).globalConfidence),
              },
              {
                label: text.tokenWaste,
                a: extractMetrics(compareA).tokenWaste,
                b: extractMetrics(compareB).tokenWaste,
                delta: presentDelta(extractMetrics(compareB).tokenWaste, extractMetrics(compareA).tokenWaste, true),
              },
              {
                label: text.crossIntentSimilarity,
                a: extractMetrics(compareA).crossIntentSimilarity,
                b: extractMetrics(compareB).crossIntentSimilarity,
                delta: presentDelta(extractMetrics(compareB).crossIntentSimilarity, extractMetrics(compareA).crossIntentSimilarity, true),
              },
              {
                label: text.riskLevel,
                a: displayRisk(compareA.risk_level),
                b: displayRisk(compareB.risk_level),
                delta: presentRiskDelta(compareB.risk_level, compareA.risk_level),
              },
              {
                label: text.alerts,
                a: extractMetrics(compareA).alerts,
                b: extractMetrics(compareB).alerts,
                delta: {
                  label: `${extractMetrics(compareB).alerts - extractMetrics(compareA).alerts > 0 ? "+" : ""}${extractMetrics(compareB).alerts - extractMetrics(compareA).alerts}`,
                  className: "text-muted-foreground",
                  icon: <ArrowRight className="h-3.5 w-3.5" />,
                },
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{text.runA}</div>
                    <div className="mt-1 text-sm text-foreground">{typeof item.a === "number" ? formatMetric(item.a, 2, text.notAvailable) : item.a}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{text.runB}</div>
                    <div className="mt-1 text-sm text-foreground">{typeof item.b === "number" ? formatMetric(item.b, 2, text.notAvailable) : item.b}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{text.delta}</div>
                    <div className={`mt-1 inline-flex items-center gap-1 text-sm ${item.delta.className}`}>
                      {item.delta.icon}
                      {item.delta.label}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-border md:block">
            <div className="grid grid-cols-[1.1fr,1fr,1fr,0.8fr] gap-3 bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <div>{text.metric}</div>
              <div>{text.runA}</div>
              <div>{text.runB}</div>
              <div>{text.delta}</div>
            </div>

            {[
              {
                label: text.consistency,
                a: extractMetrics(compareA).consistency,
                b: extractMetrics(compareB).consistency,
                inverseGood: false,
              },
              {
                label: text.globalConfidence,
                a: extractMetrics(compareA).globalConfidence,
                b: extractMetrics(compareB).globalConfidence,
                inverseGood: false,
              },
              {
                label: text.tokenWaste,
                a: extractMetrics(compareA).tokenWaste,
                b: extractMetrics(compareB).tokenWaste,
                inverseGood: true,
              },
              {
                label: text.crossIntentSimilarity,
                a: extractMetrics(compareA).crossIntentSimilarity,
                b: extractMetrics(compareB).crossIntentSimilarity,
                inverseGood: true,
              },
            ].map((item) => {
              const delta = presentDelta(item.b, item.a, item.inverseGood);

              return (
                <div
                  key={item.label}
                  className="grid grid-cols-[1.1fr,1fr,1fr,0.8fr] gap-3 border-t border-border px-4 py-4 text-sm"
                >
                  <div className="font-medium text-foreground">{item.label}</div>
                  <div className="text-foreground">{formatMetric(item.a, 2, text.notAvailable)}</div>
                  <div className="text-foreground">{formatMetric(item.b, 2, text.notAvailable)}</div>
                  <div className={`inline-flex items-center gap-1 ${delta.className}`}>
                    {delta.icon}
                    {delta.label}
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-[1.1fr,1fr,1fr,0.8fr] gap-3 border-t border-border px-4 py-4 text-sm">
              <div className="font-medium text-foreground">{text.riskLevel}</div>
              <div className="text-foreground">{displayRisk(compareA.risk_level)}</div>
              <div className="text-foreground">{displayRisk(compareB.risk_level)}</div>
              <div
                className={`inline-flex items-center gap-1 ${
                  presentRiskDelta(compareB.risk_level, compareA.risk_level).className
                }`}
              >
                {presentRiskDelta(compareB.risk_level, compareA.risk_level).icon}
                {presentRiskDelta(compareB.risk_level, compareA.risk_level).label}
              </div>
            </div>

            <div className="grid grid-cols-[1.1fr,1fr,1fr,0.8fr] gap-3 border-t border-border px-4 py-4 text-sm">
              <div className="font-medium text-foreground">{text.alerts}</div>
              <div className="text-foreground">{extractMetrics(compareA).alerts}</div>
              <div className="text-foreground">{extractMetrics(compareB).alerts}</div>
              <div className="text-muted-foreground">
                {extractMetrics(compareB).alerts - extractMetrics(compareA).alerts > 0
                  ? "+"
                  : ""}
                {extractMetrics(compareB).alerts - extractMetrics(compareA).alerts}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => handleOpenRun(compareA)}>
              {text.openRunA}
            </Button>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => handleOpenRun(compareB)}>
              {text.openRunB}
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{text.runs}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {text.runsBody}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
            <div className="relative w-full md:min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={text.searchPlaceholder}
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div className="relative w-full md:min-w-[170px]">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={riskFilter}
                onChange={(e) =>
                  setRiskFilter(e.target.value as "ALL" | "LOW" | "MEDIUM" | "HIGH")
                }
                className="h-10 w-full appearance-none rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="ALL">{text.allRiskLevels}</option>
                <option value="LOW">{text.lowRisk}</option>
                <option value="MEDIUM">{text.mediumRisk}</option>
                <option value="HIGH">{text.highRisk}</option>
              </select>
            </div>
          </div>
        </div>

        {(selectedRuns.length > 0 || search || riskFilter !== "ALL") && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {selectedRuns.length > 0 && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                {text.selectedCount(selectedRuns.length)}
              </span>
            )}

            {search && (
              <span className="break-all rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {text.searchChip(search)}
              </span>
            )}

            {riskFilter !== "ALL" && (
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {text.riskChip(displayRisk(riskFilter))}
              </span>
            )}

            <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={clearSelection}>
              {text.clearComparison}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {text.loadingHistory}
          </div>
        ) : error ? (
          <div className="break-words text-sm text-red-400">
            {text.failedToLoadHistory(error)}
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <History className="h-10 w-10 text-muted-foreground" />
            <div className="text-lg font-semibold text-foreground">
              {text.emptyTitle}
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              {text.emptyBody}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRuns.map((run) => {
              const runIndex = runs.findIndex((item) => item.id === run.id);
              const metrics = extractMetrics(run);
              const previous = runIndex >= 0 ? runs[runIndex + 1] : undefined;
              const previousMetricsForCard = previous ? extractMetrics(previous) : null;
              const isSelected = selectedRuns.includes(run.id);

              return (
                <div
                  key={run.id}
                  className={`rounded-2xl border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-background/30 hover:border-primary/30"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <button
                          type="button"
                          onClick={() => toggleRun(run.id)}
                          className={`mt-1 h-5 w-5 shrink-0 rounded-md border transition ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-border bg-background hover:border-primary/50"
                          }`}
                          aria-label={text.selectRun(run.id)}
                        >
                          {isSelected && (
                            <div className="mx-auto mt-[3px] h-2 w-2 rounded-sm bg-primary-foreground" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                                  <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="break-words">{formatDate(run.created_at, text.locale, text.notAvailable)}</span>
                                </div>

                                <span
                                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${getRiskPillClass(
                                    run.risk_level
                                  )}`}
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${getRiskDotClass(
                                      run.risk_level
                                    )}`}
                                  />
                                  {displayRisk(run.risk_level)}
                                </span>

                                {runIndex === 0 && (
                                  <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                    {text.latest}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
                                <span className="break-words">{text.engine}: {run.engine_version ?? text.notAvailable}</span>
                                <span>{text.conversations}: {run.n_conversations ?? 0}</span>
                                <span>{text.intents}: {run.n_intents ?? 0}</span>
                                <span>{text.alerts}: {metrics.alerts}</span>
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto">
                              <Button
                                className="w-full sm:w-auto"
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                onClick={() => toggleRun(run.id)}
                              >
                                {isSelected ? text.selected : text.compare}
                              </Button>

                              <Button
                                className="w-full sm:w-auto"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRun(run)}
                              >
                                {text.open}
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-xl border border-border bg-card/70 p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                {text.consistency}
                              </div>
                              <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatMetric(metrics.consistency, 2, text.notAvailable)}
                              </div>
                              {previousMetricsForCard && (
                                <div
                                  className={`mt-1 inline-flex items-center gap-1 text-xs ${
                                    presentDelta(
                                      metrics.consistency,
                                      previousMetricsForCard.consistency
                                    ).className
                                  }`}
                                >
                                  {
                                    presentDelta(
                                      metrics.consistency,
                                      previousMetricsForCard.consistency
                                    ).icon
                                  }
                                  {
                                    presentDelta(
                                      metrics.consistency,
                                      previousMetricsForCard.consistency
                                    ).label
                                  }
                                </div>
                              )}
                            </div>

                            <div className="rounded-xl border border-border bg-card/70 p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                {text.confidence}
                              </div>
                              <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatMetric(metrics.globalConfidence, 2, text.notAvailable)}
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/60">
                                <div
                                  className="h-full rounded-full bg-primary/80"
                                  style={{
                                    width: `${clampPercent(metrics.globalConfidence)}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="rounded-xl border border-border bg-card/70 p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                {text.tokenWaste}
                              </div>
                              <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatMetric(metrics.tokenWaste, 2, text.notAvailable)}
                              </div>
                              {previousMetricsForCard && (
                                <div
                                  className={`mt-1 inline-flex items-center gap-1 text-xs ${
                                    presentDelta(
                                      metrics.tokenWaste,
                                      previousMetricsForCard.tokenWaste,
                                      true
                                    ).className
                                  }`}
                                >
                                  {
                                    presentDelta(
                                      metrics.tokenWaste,
                                      previousMetricsForCard.tokenWaste,
                                      true
                                    ).icon
                                  }
                                  {
                                    presentDelta(
                                      metrics.tokenWaste,
                                      previousMetricsForCard.tokenWaste,
                                      true
                                    ).label
                                  }
                                </div>
                              )}
                            </div>

                            <div className="rounded-xl border border-border bg-card/70 p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                {text.similarity}
                              </div>
                              <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatMetric(metrics.crossIntentSimilarity, 2, text.notAvailable)}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {toPercent(metrics.crossIntentSimilarity, text.notAvailable)}
                              </div>
                            </div>

                            <div className="rounded-xl border border-border bg-card/70 p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                {text.alerts}
                              </div>
                              <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatCompactMetric(metrics.alerts, text.notAvailable)}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {text.totalTriggeredIssues}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              {text.inspectRun}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
