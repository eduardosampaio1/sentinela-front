import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Gauge,
  Radar,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import EmptyState from "@/components/dashboard/EmptyState";
import AnalysisIngestionCard from "@/components/dashboard/AnalysisIngestionCard";
import AnalysisLoadingOverlay from "@/components/dashboard/AnalysisLoadingOverlay";
import InterpretationCard from "@/components/dashboard/InterpretationCard";
import InterpretationSkeleton from "@/components/dashboard/InterpretationSkeleton";
import MetricInfo from "@/components/dashboard/MetricInfo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AlertItem } from "@/lib/types";
import type { AnalysisInterpretation } from "@/lib/api";
import { interpretAnalysis } from "@/lib/api";
import { demoAnalysis } from "@/lib/demoAnalysis";
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
  healthColor,
  normalizeAlerts,
  progressColor,
} from "@/lib/metrics";

function ScoreBar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all duration-700 ${progressColor(tone)}`}
        style={{ width: `${Math.max(6, Math.min(value, 100))}%` }}
      />
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
    <div className="min-w-0 rounded-3xl border border-border bg-card/70 p-4 shadow-sm transition hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:p-5">
      <MetricInfo title={title} tooltip={tooltip} />
      <div className={`break-words text-3xl font-bold ${healthColor(tone)}`}>{value}</div>
      <div className="mt-2 break-words text-sm text-muted-foreground">{helper}</div>
      <ScoreBar value={Number.parseFloat(value) || 0} tone={tone} />
    </div>
  );
}

export default function SentinelaDashboard() {
  const { workspaceLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const {
    result,
    handleFileUpload,
    handlePasteAnalysis,
    importAnalysisResult,
    handleRerun,
    loading,
    loadingMessage,
    loadingProgress,
    loadStoredAnalysis,
  } = useAnalysis();

  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [interpretation, setInterpretation] = useState<AnalysisInterpretation | null>(null);
  const [interpretationModel, setInterpretationModel] = useState("");
  const [interpretationPromptVersion, setInterpretationPromptVersion] = useState("");
  const [interpretationCached, setInterpretationCached] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretationError, setInterpretationError] = useState("");

  const normalizedAlerts: AlertItem[] = useMemo(() => {
    if (!result) return [];

    return normalizeAlerts(result.alerts as unknown as Array<Record<string, unknown>>).map((alert) => ({
      ...alert,
      status: resolvedIds.includes(alert.id) ? ("resolved" as const) : ("open" as const),
    }));
  }, [resolvedIds, result]);

  const openAlerts = normalizedAlerts.filter((alert) => alert.status !== "resolved");
  const criticalAlertsCount =
    result?.critical_alerts_count ?? openAlerts.filter((alert) => alert.severity === "critical").length;
  const wasteRate = result ? estimateWasteRate(result) : undefined;
  const reliability = result
    ? computeReliabilityIndex({
        consistency_score: result.consistency_score,
        cross_intent_similarity: result.cross_intent_similarity,
        waste_rate: wasteRate,
      })
    : 0;

  const consistencyHealth = getConsistencyHealth(result?.consistency_score);
  const confidenceHealth = getConsistencyHealth(result?.global_confidence);
  const stabilityHealth = getConsistencyHealth(result?.response_stability_score);
  const varianceHealth = getSimilarityHealth(100 - (result?.response_variance ?? 100));
  const similarityHealth = getSimilarityHealth(result?.cross_intent_similarity);
  const coverageHealth = getConsistencyHealth(result?.intent_coverage_score);
  const reliabilityHealth = getConsistencyHealth(reliability);

  const summary = result ? getExecutiveSummary(result, language) : null;
  const savings = result ? estimateSavingsOpportunity(result) : { monthlySavings: 0, savingPercent: 0 };
  const unstableIntents = result ? getTopUnstableIntents(result.intents, 5) : [];
  const topRecommendations = result ? getTopRecommendations(result.alerts, 4) : [];
  const firstActions = topRecommendations.slice(0, 3);
  const topAlert = openAlerts[0];
  const isDemoMode = searchParams.get("demo") === "1";

  useEffect(() => {
    if (!isDemoMode || result) return;

    loadStoredAnalysis(demoAnalysis);
    navigate("/dashboard", { replace: true });
  }, [isDemoMode, loadStoredAnalysis, navigate, result]);

  function handleLoadDemo() {
    loadStoredAnalysis(demoAnalysis);
    navigate("/dashboard", { replace: true });
  }

  async function handleInterpretWithAI() {
    if (!result || isInterpreting) return;

    setInterpretationError("");
    setIsInterpreting(true);

    try {
      const response = await interpretAnalysis(result);
      setInterpretation(response.report);
      setInterpretationModel(response.model);
      setInterpretationPromptVersion(response.prompt_version);
      setInterpretationCached(response.cached);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : language === "pt-BR"
            ? "Nao foi possivel interpretar a analise."
            : "Failed to interpret analysis.";

      setInterpretationError(message);
    } finally {
      setIsInterpreting(false);
    }
  }

  if (workspaceLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        {t("dashboard.loadingWorkspace")}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <AnalysisLoadingOverlay open={loading} message={loadingMessage} progress={loadingProgress} />

      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("common.overview")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.headingBody")}</p>
        </div>

        {result ? (
          <Button variant="secondary" onClick={handleRerun} disabled={loading} className="w-full sm:w-auto">
            <RefreshCcw className="mr-2 h-4 w-4" /> {t("dashboard.rerun")}
          </Button>
        ) : null}
      </div>

      <AnalysisIngestionCard
        loading={loading}
        hasResult={Boolean(result)}
        onFileUpload={handleFileUpload}
        onRunFromPaste={handlePasteAnalysis}
        onImportResult={importAnalysisResult}
        onLoadDemo={handleLoadDemo}
      />

      {!result ? (
        <EmptyState
          title={t("dashboard.emptyTitle")}
          description={t("dashboard.emptyBody")}
          primaryLabel={t("dashboard.loadSample")}
          secondaryLabel={t("dashboard.useOwnData")}
          onPrimaryClick={handleLoadDemo}
          onSecondaryClick={() => navigate("/dashboard")}
        />
      ) : (
        <>
          <section className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="min-w-0 rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="max-w-full border-primary/30 bg-primary/5 text-primary">
                  <span className="truncate">{result.engine_version ?? t("dashboard.engineUnavailable")}</span>
                </Badge>
                <Badge variant="secondary">{t("dashboard.risk")} {result.risk_level ?? t("common.notAvailable")}</Badge>
                <Badge variant="secondary">{result.n_conversations ?? 0} {t("dashboard.conversationsLabel")}</Badge>
                <Badge variant="secondary">{result.n_intents ?? 0} {t("dashboard.intentsLabel")}</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-primary">
                  <Sparkles className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {t("dashboard.firstRead")}
                  </span>
                </div>
                <h2 className="break-words text-2xl font-semibold text-foreground sm:text-3xl">{summary?.title}</h2>
                <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">{summary?.detail}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="min-w-0 rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashboard.overallHealth")}</div>
                  <div className={`mt-2 break-words text-2xl font-semibold ${healthColor(reliabilityHealth)}`}>
                    {reliabilityHealth}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.overallHealthBody")}</p>
                </div>

                <div className="min-w-0 rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashboard.couldSave")}</div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-2">
                    <span className="break-words text-2xl font-semibold text-foreground">
                      {formatMoney(savings.monthlySavings, language)}
                    </span>
                    <span className="text-sm text-emerald-400">~{savings.savingPercent}%</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.couldSaveBody")}</p>
                </div>

                <div className="min-w-0 rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.criticalAlertsLabel")}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-red-400">{criticalAlertsCount}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.criticalAlertsBody")}</p>
                </div>

                <div className="min-w-0 rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.lastAnalysisLabel")}
                  </div>
                  <div className="mt-2 break-words text-base font-semibold text-foreground">
                    {formatDate(result.analyzed_at, language)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.lastAnalysisBody")}</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <Gauge className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{t("dashboard.firstActions")}</div>
                  <div className="text-xs text-muted-foreground">{t("dashboard.firstActionsBody")}</div>
                </div>
              </div>

              <div className="space-y-3">
                {firstActions.length > 0 ? firstActions.map((recommendation, index) => (
                  <div key={recommendation} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-sm text-muted-foreground">
                        {index + 1}
                      </div>
                      <div className="min-w-0 break-words text-sm text-muted-foreground">{recommendation}</div>
                    </div>
                  </div>
                )) : unstableIntents.length > 0 ? unstableIntents.slice(0, 3).map((intent) => (
                  <div key={intent.intent} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="break-words font-mono text-sm text-foreground">{intent.intent}</div>
                        <div className="break-words text-xs text-muted-foreground">
                          {(intent.n_conversations ?? 0)} {t("dashboard.convsShort")} - {t("dashboard.varianceShort")}{" "}
                          {formatPercent(intent.response_variance, 2, language)}
                        </div>
                      </div>
                      <div className={`text-lg font-semibold ${healthColor(getConsistencyHealth(intent.consistency_score))} sm:text-right`}>
                        {formatPercent(intent.consistency_score, 2, language)}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    {t("dashboard.noPrioritizedActions")}
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {t("dashboard.whyMatters")}
                </div>
                <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                  {topAlert
                    ? `${topAlert.problem}: ${topAlert.recommendation}`
                    : t("dashboard.whyMattersFallback", {
                        amount: formatMoney(savings.monthlySavings, language),
                        percent: savings.savingPercent,
                      })}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{t("dashboard.aiInterpretationTitle")}</div>
                <p className="text-sm text-muted-foreground">{t("dashboard.aiInterpretationBody")}</p>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button className="w-full sm:w-auto" onClick={handleInterpretWithAI} disabled={isInterpreting}>
                  <Bot className="mr-2 h-4 w-4" />
                  {interpretation ? t("dashboard.aiRefreshInterpretation") : t("dashboard.aiInterpretation")}
                </Button>
                {result.analysis_run_id ? (
                  <span className="text-xs text-muted-foreground">{t("dashboard.savedReuse")}</span>
                ) : (
                  <span className="text-xs text-amber-300">{t("dashboard.unsavedReuse")}</span>
                )}
              </div>
            </div>

            {isInterpreting ? <InterpretationSkeleton /> : null}

            {!isInterpreting && interpretation ? (
              <div className="mt-5">
                <InterpretationCard
                  interpretation={interpretation}
                  model={interpretationModel}
                  promptVersion={interpretationPromptVersion}
                  cached={interpretationCached}
                />
              </div>
            ) : null}

            {!isInterpreting && interpretationError ? (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                {interpretationError}
              </div>
            ) : null}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title={t("metrics.consistencyScore")}
              value={formatPercent(result.consistency_score, 2, language)}
              helper={getMetricNarrative("consistency", result.consistency_score, language).detail}
              tone={String(consistencyHealth)}
              tooltip={language === "pt-BR"
                ? "Mostra com que frequencia o assistente permanece consistente dentro do mesmo intent. Quanto maior, melhor."
                : "How often the assistant stays structurally consistent inside the same intent. Higher is better."}
            />
            <MetricCard
              title={language === "pt-BR" ? "Confianca do diagnostico" : "Diagnostic confidence"}
              value={formatPercent(result.global_confidence, 2, language)}
              helper={getMetricNarrative("confidence", result.global_confidence, language).detail}
              tone={String(confidenceHealth)}
              tooltip={language === "pt-BR"
                ? "Mostra a confianca do motor no proprio diagnostico. Nao e a mesma coisa que qualidade do modelo."
                : "How confident the engine is in the diagnosis itself. This is not the same thing as model quality."}
            />
            <MetricCard
              title={t("metrics.responseStability")}
              value={formatPercent(result.response_stability_score, 2, language)}
              helper={getMetricNarrative("stability", result.response_stability_score, language).detail}
              tone={String(stabilityHealth)}
              tooltip={language === "pt-BR"
                ? "Mostra o quanto as respostas flutuam dentro do mesmo intent. Quanto maior, melhor."
                : "How much responses fluctuate inside the same intent. Higher is better."}
            />
            <MetricCard
              title={language === "pt-BR" ? "Variancia de resposta" : "Response variance"}
              value={formatPercent(result.response_variance, 2, language)}
              helper={language === "pt-BR"
                ? "Quanto menor, melhor. Variancia alta significa que o assistente oscila demais dentro do mesmo intent."
                : "Lower is better. High variance means the assistant swings too much inside the same intent."}
              tone={String(varianceHealth)}
              tooltip={language === "pt-BR"
                ? "E o inverso da estabilidade. Quanto menor, melhor, porque significa menos oscilacao."
                : "The inverse of stability. Lower is better because it means less oscillation."}
            />
            <MetricCard
              title={t("metrics.crossIntentSimilarity")}
              value={formatPercent(result.cross_intent_similarity, 2, language)}
              helper={getMetricNarrative("similarity", result.cross_intent_similarity, language).detail}
              tone={String(similarityHealth)}
              tooltip={language === "pt-BR"
                ? "Mostra o quanto intents diferentes estao parecidos entre si. Quanto menor, melhor."
                : "How similar different intents are to each other. Lower is better because intents should remain distinct."}
            />
            <MetricCard
              title={language === "pt-BR" ? "Cobertura de intents" : "Intent coverage"}
              value={
                result.intent_coverage_score !== undefined
                  ? formatPercent(result.intent_coverage_score, 2, language)
                  : t("common.notAvailable")
              }
              helper={
                result.intent_coverage_score !== undefined
                  ? getMetricNarrative("coverage", result.intent_coverage_score, language).detail
                  : language === "pt-BR"
                    ? "Os dados atuais nao retornaram cobertura de intents."
                    : "Coverage data was not returned by the current analysis run."
              }
              tone={String(coverageHealth)}
              tooltip={language === "pt-BR"
                ? "Mostra quanto do espaco esperado de intents aparece no dataset atual."
                : "How much of the expected intent space is represented in the current dataset."}
            />
          </section>

          <section className="rounded-3xl border border-border/70 bg-background/40 px-4 py-3">
            <div className="text-sm font-medium text-foreground">{t("dashboard.detailedBreakdown")}</div>
            <p className="text-sm text-muted-foreground">{t("dashboard.detailedBreakdownBody")}</p>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[1.2fr_0.9fr]">
            <div className="min-w-0 rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <Radar className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">{t("dashboard.whereModelBreaks")}</h3>
                  <p className="text-sm text-muted-foreground">{t("dashboard.whereModelBreaksBody")}</p>
                </div>
              </div>

              <div className="space-y-3">
                {unstableIntents.map((intent, index) => {
                  const tone = getConsistencyHealth(intent.consistency_score);

                  return (
                    <div key={intent.intent} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <div className="mb-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-sm text-muted-foreground">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="break-words font-mono text-sm text-foreground">{intent.intent}</div>
                            <div className="break-words text-xs text-muted-foreground">
                              {intent.n_conversations ?? 0} {t("dashboard.convsShort")} - {t("dashboard.meanChars")}{" "}
                              {intent.mean_assistant_chars ?? t("common.notAvailable")} - {t("dashboard.stdChars")}{" "}
                              {intent.std_assistant_chars ?? t("common.notAvailable")}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className={healthColor(String(tone))}>
                          {formatPercent(intent.consistency_score, 2, language)}
                        </Badge>
                      </div>
                      <ScoreBar value={intent.consistency_score ?? 0} tone={String(tone)} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-foreground">{t("dashboard.aiIssues")}</h3>
                    <p className="text-sm text-muted-foreground">{t("dashboard.aiIssuesBody")}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {openAlerts.length > 0 ? openAlerts.slice(0, 4).map((alert) => (
                    <div key={alert.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="break-words text-sm font-medium text-foreground">{alert.problem}</div>
                          <div className="text-xs text-muted-foreground">{alert.intent || t("common.globalIssue")}</div>
                        </div>
                        <Badge variant="secondary" className={healthColor(alert.severity.toUpperCase())}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="mt-2 break-words text-sm text-muted-foreground">{alert.recommendation}</p>
                      <Button
                        variant="ghost"
                        className="mt-3 h-auto px-0 text-left text-sm text-primary"
                        onClick={() => setResolvedIds((current) => [...current, alert.id])}
                      >
                        {t("dashboard.markResolved")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      {t("dashboard.noOpenAlerts")}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {t("dashboard.recommendedMoves")}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {topRecommendations.length > 0 ? topRecommendations.map((recommendation) => (
                    <div key={recommendation} className="rounded-2xl border border-amber-500/15 bg-background/40 px-3 py-2">
                      {recommendation}
                    </div>
                  )) : (
                    <div>{t("dashboard.noRecommendations")}</div>
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
