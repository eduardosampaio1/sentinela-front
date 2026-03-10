import { useMemo, useState } from "react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import EmptyState from "@/components/dashboard/EmptyState";
import AnalysisIngestionCard from "@/components/dashboard/AnalysisIngestionCard";
import AnalysisLoadingOverlay from "@/components/dashboard/AnalysisLoadingOverlay";
import MetricInfo from "@/components/dashboard/MetricInfo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle,
  ArrowRight,
  CircleDollarSign,
  Gauge,
  Radar,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { AlertItem } from "@/lib/types";
import {
  computeReliabilityIndex,
  estimateSavingsOpportunity,
  estimateWasteRate,
  formatDate,
  formatMoney,
  formatPercent,
  getConsistencyHealth,
  getExecutiveSummary,
  getMetricNarrative,
  getSimilarityHealth,
  getTopRecommendations,
  getTopUnstableIntents,
  getWasteHealth,
  healthColor,
  normalizeAlerts,
  progressColor,
} from "@/lib/metrics";

const metricTooltips = {
  consistency: "How often the assistant stays structurally consistent inside the same intent. Higher is better.",
  confidence: "How confident the engine is in the diagnosis itself. This is not the same thing as model quality.",
  stability: "How much responses fluctuate inside the same intent. Higher is better.",
  variance: "The inverse of stability. Lower is better because it means less oscillation.",
  similarity: "How similar different intents are to each other. Lower is better because intents should remain distinct.",
  waste: "Estimated waste created by redundant or unnecessarily long responses. This should be framed as optimization potential, not exact billing.",
  coverage: "How much of the expected intent space is represented in the current dataset.",
};

function ScoreBar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all duration-700 ${progressColor(tone)}`} style={{ width: `${Math.max(6, Math.min(value, 100))}%` }} />
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
  tone,
  tooltip,
}: {
  title: string;
  value: string;
  helper: string;
  tone: string;
  tooltip?: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm transition hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <MetricInfo title={title} tooltip={tooltip} />
      <div className={`text-3xl font-bold ${healthColor(tone)}`}>{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{helper}</div>
      <ScoreBar value={Number.parseFloat(value) || 0} tone={tone} />
    </div>
  );
}

export default function SentinelaDashboard() {
  const { workspace, workspaceLoading } = useAuth();
  
  const {
    result,
    handleFileUpload,
    handlePasteAnalysis,
    importAnalysisResult,
    handleRerun,
    loading,
    loadingMessage,
    loadingProgress,
  } = useAnalysis();
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const normalizedAlerts: AlertItem[] = useMemo(() => {
    if (!result) return [];
    return normalizeAlerts(result.alerts as unknown as Array<Record<string, unknown>>).map((alert) => ({
      ...alert,
      status: resolvedIds.includes(alert.id) ? ("resolved" as const) : ("open" as const),
    }));
  }, [resolvedIds, result]);

  const openAlerts = normalizedAlerts.filter((alert) => alert.status !== "resolved");
  const criticalAlertsCount = result?.critical_alerts_count ?? openAlerts.filter((alert) => alert.severity === "critical").length;

  const wasteRate = result ? estimateWasteRate(result) : undefined;
  const reliability = result ? computeReliabilityIndex({
    consistency_score: result.consistency_score,
    cross_intent_similarity: result.cross_intent_similarity,
    waste_rate: wasteRate,
  }) : 0;

  const consistencyHealth = getConsistencyHealth(result?.consistency_score);
  const confidenceHealth = getConsistencyHealth(result?.global_confidence);
  const stabilityHealth = getConsistencyHealth(result?.response_stability_score);
  const varianceHealth = getSimilarityHealth(100 - (result?.response_variance ?? 100));
  const similarityHealth = getSimilarityHealth(result?.cross_intent_similarity);
  const coverageHealth = getConsistencyHealth(result?.intent_coverage_score);
  const wasteHealth = getWasteHealth(wasteRate);
  const reliabilityHealth = getConsistencyHealth(reliability);

  const summary = result ? getExecutiveSummary(result) : null;
  const savings = result ? estimateSavingsOpportunity(result) : { monthlySavings: 0, savingPercent: 0 };
  const unstableIntents = result ? getTopUnstableIntents(result.intents, 5) : [];
  const topRecommendations = result ? getTopRecommendations(result.alerts, 4) : [];
  
  if (workspaceLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalysisLoadingOverlay open={loading} message={loadingMessage} progress={loadingProgress} />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Make the diagnosis readable. The numbers matter, but the story behind them matters more.
          </p>
        </div>

        {result ? (
          <Button variant="secondary" onClick={handleRerun} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Run again with last dataset
          </Button>
        ) : null}
      </div>

      <AnalysisIngestionCard
        loading={loading}
        hasResult={!!result}
        onFileUpload={handleFileUpload}
        onRunFromPaste={handlePasteAnalysis}
        onImportResult={importAnalysisResult}
      />

      {!result ? (
        <EmptyState
          title="No analysis loaded yet"
          description="Upload a dataset or import a result JSON to start populating the dashboard."
        />
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                  {result.engine_version ?? "Engine version unavailable"}
                </Badge>
                <Badge variant="secondary">Risk {result.risk_level ?? "N/A"}</Badge>
                <Badge variant="secondary">{result.n_conversations ?? 0} conversations</Badge>
                <Badge variant="secondary">{result.n_intents ?? 0} intents</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">AI Health Summary</span>
                </div>
                <h2 className="text-3xl font-semibold text-foreground">{summary?.title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{summary?.detail}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Overall health</div>
                  <div className={`mt-2 text-2xl font-semibold ${healthColor(reliabilityHealth)}`}>{reliabilityHealth}</div>
                  <p className="mt-1 text-xs text-muted-foreground">A blended view of consistency, separation and efficiency.</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Could save</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-foreground">{formatMoney(savings.monthlySavings)}</span>
                    <span className="text-sm text-emerald-400">~{savings.savingPercent}%</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Estimated optimization upside if reuse and instability are reduced.</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Critical alerts</div>
                  <div className="mt-2 text-2xl font-semibold text-red-400">{criticalAlertsCount}</div>
                  <p className="mt-1 text-xs text-muted-foreground">Use this as a triage signal, not as the full diagnosis.</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Last analysis</div>
                  <div className="mt-2 text-base font-semibold text-foreground">{formatDate(result.analyzed_at)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">Cached data can be useful, but fresh data should drive decisions.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Gauge className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-semibold text-foreground">What needs attention first</div>
                  <div className="text-xs text-muted-foreground">The dashboard should point to action, not force interpretation.</div>
                </div>
              </div>
              <div className="space-y-3">
                {unstableIntents.length > 0 ? unstableIntents.slice(0, 3).map((intent) => (
                  <div key={intent.intent} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-sm text-foreground">{intent.intent}</div>
                        <div className="text-xs text-muted-foreground">
                          {(intent.n_conversations ?? 0)} convs · variance {formatPercent(intent.response_variance)}
                        </div>
                      </div>
                      <div className={`text-right text-lg font-semibold ${healthColor(getConsistencyHealth(intent.consistency_score))}`}>
                        {formatPercent(intent.consistency_score)}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No per-intent stability data was returned in this run.
                  </div>
                )}
              </div>
              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <CircleDollarSign className="h-4 w-4" /> Potential savings narrative
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  If you reduce generic responses and bring the worst intents closer to the healthy range, this run suggests up to
                  <span className="font-semibold text-foreground"> {formatMoney(savings.monthlySavings)} </span>
                  in optimization upside and about
                  <span className="font-semibold text-foreground"> {savings.savingPercent}% </span>
                  less waste.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Consistency score"
              value={formatPercent(result.consistency_score)}
              helper={getMetricNarrative("consistency", result.consistency_score).detail}
              tone={String(consistencyHealth)}
              tooltip={metricTooltips.consistency}
            />
            <MetricCard
              title="Diagnostic confidence"
              value={formatPercent(result.global_confidence)}
              helper={getMetricNarrative("confidence", result.global_confidence).detail}
              tone={String(confidenceHealth)}
              tooltip={metricTooltips.confidence}
            />
            <MetricCard
              title="Response stability"
              value={formatPercent(result.response_stability_score)}
              helper={getMetricNarrative("stability", result.response_stability_score).detail}
              tone={String(stabilityHealth)}
              tooltip={metricTooltips.stability}
            />
            <MetricCard
              title="Response variance"
              value={formatPercent(result.response_variance)}
              helper="Lower is better. High variance means the assistant swings too much inside the same intent."
              tone={String(varianceHealth)}
              tooltip={metricTooltips.variance}
            />
            <MetricCard
              title="Cross-intent similarity"
              value={formatPercent(result.cross_intent_similarity)}
              helper={getMetricNarrative("similarity", result.cross_intent_similarity).detail}
              tone={String(similarityHealth)}
              tooltip={metricTooltips.similarity}
            />
            <MetricCard
              title="Intent coverage"
              value={result.intent_coverage_score !== undefined ? formatPercent(result.intent_coverage_score) : "N/A"}
              helper={result.intent_coverage_score !== undefined
                ? getMetricNarrative("coverage", result.intent_coverage_score).detail
                : "Coverage data was not returned by the current analysis run."}
              tone={String(coverageHealth)}
              tooltip={metricTooltips.coverage}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
            <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Radar className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Where the model breaks</h3>
                  <p className="text-sm text-muted-foreground">The lowest stability intents deserve attention before everything else.</p>
                </div>
              </div>
              <div className="space-y-3">
                {unstableIntents.map((intent, index) => {
                  const tone = getConsistencyHealth(intent.consistency_score);
                  return (
                    <div key={intent.intent} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-sm text-muted-foreground">{index + 1}</div>
                          <div>
                            <div className="font-mono text-sm text-foreground">{intent.intent}</div>
                            <div className="text-xs text-muted-foreground">
                              {intent.n_conversations ?? 0} convs · mean chars {intent.mean_assistant_chars ?? "N/A"} · std {intent.std_assistant_chars ?? "N/A"}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className={healthColor(String(tone))}>{formatPercent(intent.consistency_score)}</Badge>
                      </div>
                      <ScoreBar value={intent.consistency_score ?? 0} tone={String(tone)} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">AI issues detected</h3>
                    <p className="text-sm text-muted-foreground">Deduplicated to reduce noise and make action clearer.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {openAlerts.length > 0 ? openAlerts.slice(0, 4).map((alert) => (
                    <div key={alert.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{alert.problem}</div>
                          <div className="text-xs text-muted-foreground">{alert.intent || "Global issue"}</div>
                        </div>
                        <Badge variant="secondary" className={healthColor(alert.severity.toUpperCase())}>{alert.severity}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{alert.recommendation}</p>
                      <Button
                        variant="ghost"
                        className="mt-3 h-auto px-0 text-sm text-primary"
                        onClick={() => setResolvedIds((current) => [...current, alert.id])}
                      >
                        Mark resolved <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">No open alerts in the current view.</div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-300">
                  <AlertTriangle className="h-4 w-4" /> Recommended next moves
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {topRecommendations.length > 0 ? topRecommendations.map((recommendation) => (
                    <div key={recommendation} className="rounded-2xl border border-amber-500/15 bg-background/40 px-3 py-2">
                      {recommendation}
                    </div>
                  )) : (
                    <div>No recommendations available in this run.</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
