import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, Radar, ShieldCheck, Sparkles } from "lucide-react";
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
  healthHeaderModel,
  interactionPanelModel,
  recommendedActions,
  riskOverviewModel,
  stabilityTrendModel,
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
import RiskOverviewPanel from "@/components/dashboard-v2/RiskOverviewPanel";
import StabilityTrendPanel from "@/components/dashboard-v2/StabilityTrendPanel";
import SystemOverviewBlock from "@/components/dashboard-v2/SystemOverviewBlock";
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
  const healthHeader = useMemo(() => healthHeaderModel(result), [result]);
  const riskOverview = useMemo(() => riskOverviewModel(result), [result]);
  const stabilityTrend = useMemo(() => stabilityTrendModel(result), [result]);

  const interpretationLocked = interpretationStatus === "queued" || interpretationStatus === "running" || interpretationStatus === "completed";
  const canGenerateInterpretation =
    Boolean(result?.analysis_id) &&
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
      try {
        const persisted = await getInterpretation(
          result,
          workspace?.id,
          project?.id,
          environment?.id,
        );
        setInterpretationAt(persisted.updated_at ?? persisted.created_at ?? new Date().toISOString());
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

  return (
    <div className="mx-auto min-w-0 w-full space-y-6 pb-10 lg:space-y-8">
      <AnalysisLoadingOverlay open={loading} message={loadingMessage} progress={loadingProgress} />

      <section className="grid gap-6 2xl:grid-cols-[1.35fr_0.95fr]">
        <section className="dashboard-panel-strong dashboard-subtle-grid overflow-hidden p-6 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="dashboard-kicker">Executive command deck</span>
              <span className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary">
                Trust, drift, cost, and next action
              </span>
            </div>

            <div className="max-w-3xl">
              <h1 className="font-display text-[2.35rem] font-semibold leading-[1.04] tracking-tight text-foreground sm:text-[3.2rem]">
                {result
                  ? "Know whether the AI is good, drifting, costly, and what to do next."
                  : "Load a run to unlock the full executive dashboard."}
              </h1>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-[0.98rem]">
                {result
                  ? healthHeader.summary
                  : "The dashboard stays operationally structured even before the first run, but decision signals appear only after analysis data is available."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Risk posture</p>
                <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
                  {healthHeader.riskLevel}
                </p>
              </article>
              <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Trust level</p>
                <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
                  {healthHeader.status}
                </p>
              </article>
              <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                <p className="mt-3 text-sm font-medium leading-6 text-foreground">
                  {workspace?.name ?? "Default workspace"}
                </p>
              </article>
              <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Current run</p>
                <p className="mt-3 text-sm font-medium leading-6 text-foreground">
                  {result?.analysis_run_id ?? "No active run"}
                </p>
              </article>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handlePrimaryRecommendationAction} className="rounded-2xl px-5">
                Open action queue
                <ArrowRight className="h-4 w-4" />
              </Button>
              {result ? (
                <Button
                  variant="outline"
                  onClick={handleDownloadReport}
                  className="rounded-2xl border-border/60 bg-background/30"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <VerdictStrip model={decisionLayer.verdict} />
          <SystemOverviewBlock workspaceName={workspace?.name} result={result} />
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.25fr_0.95fr]">
        <TopRecommendationHero
          model={decisionLayer.hero}
          onPrimaryAction={handlePrimaryRecommendationAction}
          onSecondaryAction={handleRerun}
          secondaryDisabled={loading}
        />

        <div className="grid gap-6">
          <RiskOverviewPanel model={riskOverview} />
          <StabilityTrendPanel model={stabilityTrend} />
        </div>
      </section>

      <CoreMetricsRow items={decisionLayer.coreMetrics} />

      <section className="grid gap-6 2xl:grid-cols-[1.18fr_0.82fr]">
        <AIInterpretationPanel
          model={interpretationModel}
          loading={isInterpreting}
          error={interpretationError}
          generatedAt={interpretationAt}
          status={interpretationStatus}
          canGenerate={canGenerateInterpretation}
          isLocked={interpretationLocked}
          onGenerate={handleInterpret}
        />
        <EconomicsPanel model={economicsModel} />
      </section>

      <section id="action-details" className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Action queue</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">Where the team should intervene next</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Problems and recommendations stay together so the operator can connect symptoms, impact, and next moves without hunting through the page.
          </p>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
          <ProblemsPanel items={problems} />
          <RecommendationsPanel
            items={secondaryRecommendations}
            title="Additional recommendations"
            subtitle="Secondary actions ranked after the primary recommendation."
            emptyText="No additional actions ranked below the primary recommendation."
          />
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.12fr_0.88fr]">
        <InteractionAnalysisPanel model={interactionModel} />
        <div className="space-y-6">
          <WhySystemStatePanel model={systemStateModel} />
          <ImproveAnalysisPanel suggestions={systemStateModel.enrichmentSuggestions} />
          <TechnicalDetailsPanel result={result} />
        </div>
      </section>

      <section className="dashboard-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="dashboard-kicker">Decision discipline</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">Use the deck in sequence</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Start with behavior, confirm drift and cost, check confidence, act on the recommendation, and only then open the evidence docks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border/55 bg-background/35 px-3 py-1.5 text-xs text-foreground">
              <ShieldCheck className="mr-2 inline h-3.5 w-3.5 text-emerald-300" />
              Executive first
            </span>
            <span className="rounded-full border border-border/55 bg-background/35 px-3 py-1.5 text-xs text-foreground">
              <Radar className="mr-2 inline h-3.5 w-3.5 text-primary" />
              Deep views on demand
            </span>
            <span className="rounded-full border border-border/55 bg-background/35 px-3 py-1.5 text-xs text-foreground">
              <Sparkles className="mr-2 inline h-3.5 w-3.5 text-amber-200" />
              Backend untouched
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
