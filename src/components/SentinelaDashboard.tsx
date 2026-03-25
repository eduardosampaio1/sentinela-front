import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getInterpretation,
  interpretAnalysis,
  type AnalysisInterpretation,
  type GetInterpretationResponse,
} from "@/lib/api";
import { downloadAnalysisReportPdf } from "@/lib/analysisReportPdf";
import {
  detectedProblems,
  interactionPanelModel,
  recommendedActions,
} from "@/lib/dashboardModel";
import { listAnalysisRuns } from "@/lib/analysisRuns";
import {
  buildDecisionLayerModel,
  buildInterpretationPanelModel,
  buildRecurrenceSummary,
  buildSystemStatePanelModel,
  rankHotspotsByImpact,
} from "@/lib/decisionLayerModel";
import AnalysisLoadingOverlay from "@/components/dashboard/AnalysisLoadingOverlay";
import { Button } from "@/components/ui/button";
import ProblemsPanel from "@/components/dashboard-v2/ProblemsPanel";
import RecommendationsPanel from "@/components/dashboard-v2/RecommendationsPanel";
import InteractionAnalysisPanel from "@/components/dashboard-v2/InteractionAnalysisPanel";
import VerdictStrip from "@/components/dashboard-decision/VerdictStrip";
import TopRecommendationHero from "@/components/dashboard-decision/TopRecommendationHero";
import CoreMetricsRow from "@/components/dashboard-decision/CoreMetricsRow";
import AIInterpretationPanel from "@/components/dashboard-decision/AIInterpretationPanel";
import WhySystemStatePanel from "@/components/dashboard-decision/WhySystemStatePanel";
import TechnicalDetailsPanel from "@/components/dashboard-decision/TechnicalDetailsPanel";
import ImproveAnalysisPanel from "@/components/dashboard-decision/ImproveAnalysisPanel";
import EconomicsPanel from "@/components/dashboard-decision/EconomicsPanel";
import { buildEconomicsPanelModel } from "@/lib/economicsModel";

export default function SentinelaDashboard() {
  const { workspace, project, environment } = useAuth();
  const {
    result,
    loading,
    loadingMessage,
    loadingProgress,
    handleRerun,
  } = useAnalysis();

  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretationError, setInterpretationError] = useState("");
  const [interpretation, setInterpretation] = useState<AnalysisInterpretation | null>(null);
  const [interpretationAt, setInterpretationAt] = useState<string>("");
  const [interpretationModelName, setInterpretationModelName] = useState<string>("");
  const [interpretationProvider, setInterpretationProvider] = useState<string>("");
  const [interpretationPromptVersion, setInterpretationPromptVersion] = useState<string>("");
  const [interpretationStatus, setInterpretationStatus] = useState<GetInterpretationResponse["status"]>("not_requested");
  const [historyRuns, setHistoryRuns] = useState<Array<{ id: string; raw_result?: Record<string, unknown> | null }>>([]);

  const problems = useMemo(() => rankHotspotsByImpact(detectedProblems(result)), [result]);
  const recommendations = useMemo(() => recommendedActions(result), [result]);
  const interactionModel = useMemo(() => interactionPanelModel(result), [result]);
  const recurrence = useMemo(
    () =>
      buildRecurrenceSummary({
        currentProblems: problems,
        currentRecommendations: recommendations,
        historyRuns,
        currentRunId: result?.analysis_run_id,
      }),
    [historyRuns, problems, recommendations, result?.analysis_run_id],
  );
  const decisionLayer = useMemo(
    () =>
      buildDecisionLayerModel({
        result,
        problems,
        recommendations,
        recurrence,
      }),
    [problems, recommendations, recurrence, result],
  );
  const interpretationModel = useMemo(
    () => buildInterpretationPanelModel(interpretation, decisionLayer.hero.headline),
    [decisionLayer.hero.headline, interpretation],
  );
  const systemStateModel = useMemo(
    () => buildSystemStatePanelModel(result, problems),
    [problems, result],
  );
  const economicsModel = useMemo(() => buildEconomicsPanelModel(result), [result]);
  const interpretationLocked = interpretationStatus === "queued" || interpretationStatus === "running" || interpretationStatus === "completed";
  const canGenerateInterpretation = Boolean(result?.analysis_id) && 
    !isInterpreting && 
    interpretationStatus !== "completed" && 
    interpretationStatus !== "running" && 
    interpretationStatus !== "queued";

  useEffect(() => {
    if (!workspace?.id || !project?.id || !environment?.id) {
      setHistoryRuns([]);
      return;
    }

    let mounted = true;
    void listAnalysisRuns(workspace.id, project.id, environment.id, 6)
      .then((runs) => {
        if (!mounted) return;
        setHistoryRuns(
          runs.map((run) => ({
            id: run.id,
            raw_result: run.raw_result,
          })),
        );
      })
      .catch(() => {
        if (mounted) setHistoryRuns([]);
      });

    return () => {
      mounted = false;
    };
  }, [environment?.id, project?.id, workspace?.id]);


  useEffect(() => {
    if (!result?.analysis_id || !workspace?.id || !project?.id || !environment?.id) {
      setInterpretation(null);
      setInterpretationAt("");
      setInterpretationModelName("");
      setInterpretationProvider("");
      setInterpretationPromptVersion("");
      setInterpretationStatus("not_requested");
      setInterpretationError("");
      return;
    }

    let mounted = true;
    setInterpretationError("");

    void getInterpretation(result, workspace.id, project.id, environment.id)
      .then((response) => {
        if (!mounted) return;
        setInterpretationStatus(response.status);
        setInterpretationAt(response.updated_at ?? response.created_at ?? "");
        setInterpretationModelName(response.model ?? "");
        setInterpretationProvider(response.provider ?? "");
        setInterpretationPromptVersion(response.prompt_version ?? "");
        if (response.report) {
          setInterpretation(response.report);
        } else {
          setInterpretation(null);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        setInterpretation(null);
        setInterpretationAt("");
        setInterpretationModelName("");
        setInterpretationProvider("");
        setInterpretationPromptVersion("");
        setInterpretationStatus("not_requested");
        setInterpretationError(error instanceof Error ? error.message : "Could not load interpretation.");
      });

    return () => {
      mounted = false;
    };
}, [environment?.id, project?.id, result, workspace?.id]);

async function handleInterpret() {
    if (!result || isInterpreting) return;
    setInterpretationError("");
    setIsInterpreting(true);
    try {
      const generated = await interpretAnalysis(
        result,
        workspace?.id,
        project?.id,
        environment?.id,
      );

      setInterpretation(generated.report);
      setInterpretationStatus("completed");
      setInterpretationModelName(generated.model);
      setInterpretationPromptVersion(generated.prompt_version);
      try {
        const persisted = await getInterpretation(
          result,
          workspace?.id,
          project?.id,
          environment?.id,
        );
        setInterpretationAt(persisted.updated_at ?? persisted.created_at ?? new Date().toISOString());
        setInterpretationModelName(persisted.model ?? generated.model);
        setInterpretationProvider(persisted.provider ?? "");
        setInterpretationPromptVersion(persisted.prompt_version ?? generated.prompt_version);
      } catch {
        setInterpretationAt(new Date().toISOString());
      }
    } catch (error) {
      setInterpretationError(
        error instanceof Error ? error.message : "Could not generate interpretation.",
      );
      setInterpretationStatus("failed");
    } finally {
      setIsInterpreting(false);
    }
  }

  function handleDownloadReport() {
    if (!result) return;
    downloadAnalysisReportPdf(result, workspace?.name);
  }

  function handlePrimaryRecommendationAction() {
    const target = document.getElementById("action-details");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }


  const secondaryRecommendations = recommendations.slice(1);
  const usefulRateMetric = economicsModel.hero.find((metric) => metric.id === "useful-rate") ?? null;
  const wasteCostMetric = economicsModel.details.find((metric) => metric.id === "token-waste-cost") ?? null;

  return (
    <div className="mx-auto min-w-0 w-full max-w-6xl space-y-8 pb-12">
      <AnalysisLoadingOverlay open={loading} message={loadingMessage} progress={loadingProgress} />

      <section className="space-y-4">
        <VerdictStrip model={decisionLayer.verdict} />

        <div className="rounded-[28px] border border-border/55 bg-card/60 p-5 shadow-[0_24px_56px_-40px_rgba(2,8,23,0.85)] backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Decision cockpit
                </span>
                <span className="rounded-full border border-border/55 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
                  Health, drift, cost pressure, next action
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                  {result
                    ? "See health, drift, spending quality, and the next action before opening technical depth."
                    : "Load a run to unlock the decision cockpit."}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  {result
                    ? "This view promotes the engine metrics that answer the core decision questions in seconds: is the AI healthy, drifting, wasting money, and what should change now."
                    : "The executive layer appears automatically once an analysis run is available."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:max-w-[560px]">
              <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Useful rate</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                  {usefulRateMetric?.displayValue ?? "Unavailable"}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  How often spend converts into useful outcomes.
                </p>
              </article>

              <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Waste cost</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                  {wasteCostMetric?.displayValue ?? "Unavailable"}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Money lost to verbose or inefficient output.
                </p>
              </article>

              <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Current run</p>
                <p className="mt-3 text-sm font-medium leading-6 text-foreground">
                  {result?.analysis_run_id ?? "No active run"}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Workspace {workspace?.name ?? "Default workspace"}
                </p>
              </article>
            </div>
          </div>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <CoreMetricsRow items={decisionLayer.coreMetrics} />
          <div className="space-y-4">
            <TopRecommendationHero
              model={decisionLayer.hero}
              onPrimaryAction={handlePrimaryRecommendationAction}
              onSecondaryAction={handleRerun}
              secondaryDisabled={loading}
            />
            <EconomicsPanel model={economicsModel} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">Decision support</p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Open only when you need explanation</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Deeper diagnostics stay collapsed by default to reduce cognitive load and keep the executive path clean.
          </p>
        </div>

        <AIInterpretationPanel
          model={interpretationModel}
          interpretation={interpretation}
          loading={isInterpreting}
          error={interpretationError}
          generatedAt={interpretationAt}
          status={interpretationStatus}
          canGenerate={canGenerateInterpretation}
          isLocked={interpretationLocked}
          onGenerate={handleInterpret}
          llmModel={interpretationModelName}
          provider={interpretationProvider}
          promptVersion={interpretationPromptVersion}
        />

        <WhySystemStatePanel model={systemStateModel} />
        <InteractionAnalysisPanel model={interactionModel} />
      </section>

      <section id="action-details" className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">Action queue</p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">What needs attention now</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Problems and secondary recommendations are grouped separately so remediation stays easy to scan.
          </p>
        </div>

        <ProblemsPanel items={problems} />
        <RecommendationsPanel
          items={secondaryRecommendations}
          title="Additional Recommendations"
          subtitle="Secondary actions ranked after the primary recommendation."
          emptyText="No additional actions ranked below the primary recommendation."
        />
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">Supporting details</p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Metadata and enrichment hints</h2>
        </div>
        <TechnicalDetailsPanel result={result} />
        <ImproveAnalysisPanel suggestions={systemStateModel.enrichmentSuggestions} />
      </section>

      {result ? (
        <section className="rounded-xl border border-border/40 bg-card/35 p-3">
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </section>
      ) : null}
    </div>
  );
}
