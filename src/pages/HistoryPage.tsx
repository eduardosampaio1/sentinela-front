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
  GitCompareArrows,
  History,
  Loader2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalysis } from "@/contexts/AnalysisContext";
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

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatShortDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
}

function formatMetric(value?: number | null, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return value.toFixed(decimals);
}

function toPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
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
      label: `${riskLabel(previous)} → ${riskLabel(current)}`,
      className: "text-emerald-400",
      icon: <ArrowDownRight className="h-3.5 w-3.5" />,
    };
  }

  return {
    label: `${riskLabel(previous)} → ${riskLabel(current)}`,
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
      text: "This is your first observable checkpoint. Future runs will expose whether the model is evolving or regressing.",
      tone: "neutral" as const,
    };
  }

  const riskCompare = compareRisk(current.risk_level, previous.risk_level);
  const consistencyDelta = getDelta(
    currentMetrics.consistency,
    previousMetrics.consistency
  );
  const wasteDelta = getDelta(currentMetrics.tokenWaste, previousMetrics.tokenWaste);

  if (riskScore(current.risk_level) > riskScore(previous.risk_level)) {
    return {
      title: "Regression detected",
      text: `Risk moved from ${riskLabel(previous.risk_level)} to ${riskLabel(
        current.risk_level
      )}. Treat this run as a deterioration until proven otherwise.`,
      tone: "bad" as const,
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
      )} without increasing token waste. This looks like real progress, not noise.`,
      tone: "good" as const,
    };
  }

  if (wasteDelta !== null && wasteDelta > 0.03) {
    return {
      title: "Efficiency degraded",
      text: `Token waste increased by ${wasteDelta.toFixed(
        2
      )}. Even if quality held, operational cost likely worsened.`,
      tone: "bad" as const,
    };
  }

  return {
    title: "Mixed signal",
    text: `Current status is inconclusive. Risk comparison: ${riskCompare.label}. The system changed, but not enough to call it a solid improvement.`,
    tone: "neutral" as const,
  };
}

function average(values: Array<number | null>) {
  const valid = values.filter((v): v is number => typeof v === "number");
  if (!valid.length) return null;
  return valid.reduce((acc, curr) => acc + curr, 0) / valid.length;
}

function statusToneClass(tone: "good" | "bad" | "neutral") {
  if (tone === "good") return "border-emerald-500/20 bg-emerald-500/10";
  if (tone === "bad") return "border-red-500/20 bg-red-500/10";
  return "border-amber-500/20 bg-amber-500/10";
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const { loadStoredAnalysis } = useAnalysis();

  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);

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
  const insight = latestRun ? buildInsight(latestRun, previousRun) : null;

  const totalRuns = runs.length;
  const averageConsistency = average(
    runs.map((run) => extractMetrics(run).consistency)
  );
  const averageWaste = average(runs.map((run) => extractMetrics(run).tokenWaste));
  const highRiskCount = runs.filter(
    (run) => riskLabel(run.risk_level) === "HIGH"
  ).length;

  const recentTimeline = runs.slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_30%)]" />
          <div className="relative p-6 lg:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Activity className="h-3.5 w-3.5" />
                  Observability Center
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Analysis History
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Monitor run health, detect regressions, and compare two uploaded
                    bases as if this were an observability surface instead of a raw
                    database table.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {latestRun && (
                    <Button onClick={() => handleOpenRun(latestRun)}>
                      Open latest run
                    </Button>
                  )}
                  {runs.length >= 2 && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedRuns([runs[1].id, runs[0].id])}
                    >
                      Compare latest vs previous
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-4">
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Total runs
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {totalRuns}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Avg consistency
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {formatMetric(averageConsistency)}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Avg waste
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {formatMetric(averageWaste)}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    High-risk
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
        <section className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Latest system status
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Consistency
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {formatMetric(latestMetrics.consistency)}
                </div>
                {previousMetrics && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1 text-xs ${
                      getDeltaPresentation(
                        latestMetrics.consistency,
                        previousMetrics.consistency
                      ).className
                    }`}
                  >
                    {
                      getDeltaPresentation(
                        latestMetrics.consistency,
                        previousMetrics.consistency
                      ).icon
                    }
                    {
                      getDeltaPresentation(
                        latestMetrics.consistency,
                        previousMetrics.consistency
                      ).label
                    }
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Token waste
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {formatMetric(latestMetrics.tokenWaste)}
                </div>
                {previousMetrics && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1 text-xs ${
                      getDeltaPresentation(
                        latestMetrics.tokenWaste,
                        previousMetrics.tokenWaste,
                        true
                      ).className
                    }`}
                  >
                    {
                      getDeltaPresentation(
                        latestMetrics.tokenWaste,
                        previousMetrics.tokenWaste,
                        true
                      ).icon
                    }
                    {
                      getDeltaPresentation(
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
                  Alerts
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {latestMetrics.alerts}
                </div>
                {previousMetrics && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Prev: {previousMetrics.alerts}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Risk status
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
                    {riskLabel(latestRun.risk_level)}
                  </span>
                </div>
                {previousRun && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1 text-xs ${
                      compareRisk(latestRun.risk_level, previousRun.risk_level)
                        .className
                    }`}
                  >
                    {compareRisk(latestRun.risk_level, previousRun.risk_level).icon}
                    {compareRisk(latestRun.risk_level, previousRun.risk_level).label}
                  </div>
                )}
              </div>
            </div>
          </div>

          {insight && (
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                {insight.tone === "good" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : insight.tone === "bad" ? (
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                )}
                <h2 className="text-base font-semibold text-foreground">
                  Automated diagnosis
                </h2>
              </div>

              <div className={`rounded-2xl border p-4 ${statusToneClass(insight.tone)}`}>
                <div className="text-sm font-semibold text-foreground">
                  {insight.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {insight.text}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Engine</span>
                    <span className="text-sm font-medium text-foreground">
                      {latestRun.engine_version ?? "N/A"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Conversations</span>
                    <span className="text-sm font-medium text-foreground">
                      {latestRun.n_conversations ?? 0}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Intents</span>
                    <span className="text-sm font-medium text-foreground">
                      {latestRun.n_intents ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {recentTimeline.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Trend line</h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Consistency over recent runs
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Quick visual to spot stability or drift
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-2">
                {recentTimeline
                  .slice()
                  .reverse()
                  .map((run) => {
                    const metrics = extractMetrics(run);
                    return (
                      <div key={`consistency-${run.id}`} className="flex-1">
                        <div className="flex h-28 items-end">
                          <div
                            className="w-full rounded-t-md bg-primary/80 transition-all"
                            style={{
                              height: `${clampPercent(metrics.consistency)}%`,
                            }}
                            title={`Consistency: ${formatMetric(metrics.consistency)}`}
                          />
                        </div>
                        <div className="mt-2 truncate text-center text-[10px] text-muted-foreground">
                          {formatShortDate(run.created_at)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Risk and waste monitor
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Smaller is better for waste
                  </div>
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
                            {formatDate(run.created_at)}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {formatMetric(metrics.tokenWaste)}
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
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Comparative view
              </h2>
            </div>

            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear comparison
            </Button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            {[compareA, compareB].map((run, idx) => (
              <div
                key={run.id}
                className="rounded-2xl border border-border bg-background/40 p-4"
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Run {idx === 0 ? "A" : "B"}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${getRiskDotClass(
                      run.risk_level
                    )}`}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {formatDate(run.created_at)}
                  </span>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  Engine: {run.engine_version ?? "N/A"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Conversations: {run.n_conversations ?? 0}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Intents: {run.n_intents ?? 0}
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-[1.1fr,1fr,1fr,0.8fr] gap-3 bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <div>Metric</div>
              <div>Run A</div>
              <div>Run B</div>
              <div>Delta</div>
            </div>

            {[
              {
                label: "Consistency",
                a: extractMetrics(compareA).consistency,
                b: extractMetrics(compareB).consistency,
                inverseGood: false,
              },
              {
                label: "Global confidence",
                a: extractMetrics(compareA).globalConfidence,
                b: extractMetrics(compareB).globalConfidence,
                inverseGood: false,
              },
              {
                label: "Token waste",
                a: extractMetrics(compareA).tokenWaste,
                b: extractMetrics(compareB).tokenWaste,
                inverseGood: true,
              },
              {
                label: "Cross-intent similarity",
                a: extractMetrics(compareA).crossIntentSimilarity,
                b: extractMetrics(compareB).crossIntentSimilarity,
                inverseGood: true,
              },
            ].map((item) => {
              const delta = getDeltaPresentation(item.b, item.a, item.inverseGood);

              return (
                <div
                  key={item.label}
                  className="grid grid-cols-[1.1fr,1fr,1fr,0.8fr] gap-3 border-t border-border px-4 py-4 text-sm"
                >
                  <div className="font-medium text-foreground">{item.label}</div>
                  <div className="text-foreground">{formatMetric(item.a)}</div>
                  <div className="text-foreground">{formatMetric(item.b)}</div>
                  <div className={`inline-flex items-center gap-1 ${delta.className}`}>
                    {delta.icon}
                    {delta.label}
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-[1.1fr,1fr,1fr,0.8fr] gap-3 border-t border-border px-4 py-4 text-sm">
              <div className="font-medium text-foreground">Risk level</div>
              <div className="text-foreground">{riskLabel(compareA.risk_level)}</div>
              <div className="text-foreground">{riskLabel(compareB.risk_level)}</div>
              <div
                className={`inline-flex items-center gap-1 ${
                  compareRisk(compareB.risk_level, compareA.risk_level).className
                }`}
              >
                {compareRisk(compareB.risk_level, compareA.risk_level).icon}
                {compareRisk(compareB.risk_level, compareA.risk_level).label}
              </div>
            </div>

            <div className="grid grid-cols-[1.1fr,1fr,1fr,0.8fr] gap-3 border-t border-border px-4 py-4 text-sm">
              <div className="font-medium text-foreground">Alerts</div>
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
        </section>
      )}

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Runs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select up to 2 runs. If you choose a third, the oldest selected run is replaced.
            </p>
          </div>

          {selectedRuns.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                {selectedRuns.length}/2 selected
              </div>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history...
          </div>
        ) : error ? (
          <div className="text-sm text-red-400">
            Failed to load history: {error}
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <History className="h-10 w-10 text-muted-foreground" />
            <div className="text-lg font-semibold text-foreground">
              No analysis history yet
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Run your first dataset analysis and it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run, index) => {
              const metrics = extractMetrics(run);
              const previous = runs[index + 1];
              const previousMetricsForCard = previous
                ? extractMetrics(previous)
                : null;
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
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex flex-1 items-start gap-4">
                        <button
                          type="button"
                          onClick={() => toggleRun(run.id)}
                          className={`mt-1 h-5 w-5 rounded-md border transition ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-border bg-background hover:border-primary/50"
                          }`}
                          aria-label={`Select ${run.id}`}
                        >
                          {isSelected && (
                            <div className="mx-auto mt-[3px] h-2 w-2 rounded-sm bg-primary-foreground" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                                  {formatDate(run.created_at)}
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
                                  {riskLabel(run.risk_level)}
                                </span>

                                {index === 0 && (
                                  <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                    Latest
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                                <span>Engine: {run.engine_version ?? "N/A"}</span>
                                <span>Conversations: {run.n_conversations ?? 0}</span>
                                <span>Intents: {run.n_intents ?? 0}</span>
                                <span>Alerts: {metrics.alerts}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                onClick={() => toggleRun(run.id)}
                              >
                                {isSelected ? "Selected" : "Compare"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRun(run)}
                              >
                                Open
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-border bg-card/70 p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                Consistency
                              </div>
                              <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatMetric(metrics.consistency)}
                              </div>
                              {previousMetricsForCard && (
                                <div
                                  className={`mt-1 inline-flex items-center gap-1 text-xs ${
                                    getDeltaPresentation(
                                      metrics.consistency,
                                      previousMetricsForCard.consistency
                                    ).className
                                  }`}
                                >
                                  {
                                    getDeltaPresentation(
                                      metrics.consistency,
                                      previousMetricsForCard.consistency
                                    ).icon
                                  }
                                  {
                                    getDeltaPresentation(
                                      metrics.consistency,
                                      previousMetricsForCard.consistency
                                    ).label
                                  }
                                </div>
                              )}
                            </div>

                            <div className="rounded-xl border border-border bg-card/70 p-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                Global confidence
                              </div>
                              <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatMetric(metrics.globalConfidence)}
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
                                Token waste
                              </div>
                              <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatMetric(metrics.tokenWaste)}
                              </div>
                              {previousMetricsForCard && (
                                <div
                                  className={`mt-1 inline-flex items-center gap-1 text-xs ${
                                    getDeltaPresentation(
                                      metrics.tokenWaste,
                                      previousMetricsForCard.tokenWaste,
                                      true
                                    ).className
                                  }`}
                                >
                                  {
                                    getDeltaPresentation(
                                      metrics.tokenWaste,
                                      previousMetricsForCard.tokenWaste,
                                      true
                                    ).icon
                                  }
                                  {
                                    getDeltaPresentation(
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
                                Similarity
                              </div>
                              <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatMetric(metrics.crossIntentSimilarity)}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {toPercent(metrics.crossIntentSimilarity)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              Inspect run
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