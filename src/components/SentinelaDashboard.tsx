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
    <div className="mx-auto min-w-0 w-full max-w-6xl space-y-8 pb-12">
      <AnalysisLoadingOverlay open={loading} message={loadingMessage} progress={loadingProgress} />

      <VerdictStrip model={decisionLayer.verdict} />
      <TopRecommendationHero
        model={decisionLayer.hero}
        onPrimaryAction={handlePrimaryRecommendationAction}
        onSecondaryAction={handleRerun}
        secondaryDisabled={loading}
      />
      <CoreMetricsRow items={decisionLayer.coreMetrics} />

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

      <WhySystemStatePanel model={systemStateModel} />
      <EconomicsPanel model={economicsModel} />
      <InteractionAnalysisPanel model={interactionModel} />

      <section id="action-details" className="space-y-6">
        <ProblemsPanel items={problems} />
        <RecommendationsPanel
          items={secondaryRecommendations}
          title="Additional Recommendations"
          subtitle="Secondary actions ranked after the primary recommendation."
          emptyText="No additional actions ranked below the primary recommendation."
        />
      </section>

      <TechnicalDetailsPanel result={result} />
      <ImproveAnalysisPanel suggestions={systemStateModel.enrichmentSuggestions} />

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
