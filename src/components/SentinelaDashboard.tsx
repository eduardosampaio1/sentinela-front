import { useMemo, useState } from "react";
import { Bot, RefreshCcw } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useAuth } from "@/contexts/AuthContext";
import { interpretAnalysis, type AnalysisInterpretation } from "@/lib/api";
import {
  detectedProblems,
  interactionPanelModel,
  keyMetricsCards,
  riskOverviewModel,
  recommendedActions,
  stabilityTrendModel,
} from "@/lib/dashboardModel";
import AnalysisLoadingOverlay from "@/components/dashboard/AnalysisLoadingOverlay";
import InterpretationCard from "@/components/dashboard/InterpretationCard";
import InterpretationSkeleton from "@/components/dashboard/InterpretationSkeleton";
import { Button } from "@/components/ui/button";
import SystemOverviewBlock from "@/components/dashboard-v2/SystemOverviewBlock";
import SignalScoreCard from "@/components/dashboard-v2/SignalScoreCard";
import ProblemsPanel from "@/components/dashboard-v2/ProblemsPanel";
import RecommendationsPanel from "@/components/dashboard-v2/RecommendationsPanel";
import InteractionAnalysisPanel from "@/components/dashboard-v2/InteractionAnalysisPanel";
import RiskOverviewPanel from "@/components/dashboard-v2/RiskOverviewPanel";
import StabilityTrendPanel from "@/components/dashboard-v2/StabilityTrendPanel";

export default function SentinelaDashboard() {
  const { workspace } = useAuth();
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
  const [interpretationModel, setInterpretationModel] = useState("");
  const [interpretationPromptVersion, setInterpretationPromptVersion] = useState("");
  const [interpretationCached, setInterpretationCached] = useState(false);
  const [interpretationAt, setInterpretationAt] = useState<string>("");

  const riskOverview = useMemo(() => riskOverviewModel(result), [result]);
  const stabilityTrend = useMemo(() => stabilityTrendModel(result), [result]);
  const keyMetrics = useMemo(() => keyMetricsCards(result), [result]);
  const problems = useMemo(() => detectedProblems(result), [result]);
  const recommendations = useMemo(() => recommendedActions(result), [result]);
  const interactionModel = useMemo(() => interactionPanelModel(result), [result]);

  async function handleInterpret() {
    if (!result || isInterpreting) return;
    setInterpretationError("");
    setIsInterpreting(true);
    try {
      const response = await interpretAnalysis(result);
      setInterpretation(response.report);
      setInterpretationModel(response.model);
      setInterpretationPromptVersion(response.prompt_version);
      setInterpretationCached(response.cached);
      setInterpretationAt(new Date().toISOString());
    } catch (error) {
      setInterpretationError(
        error instanceof Error ? error.message : "Could not generate interpretation.",
      );
    } finally {
      setIsInterpreting(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <AnalysisLoadingOverlay open={loading} message={loadingMessage} progress={loadingProgress} />

      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            AI System Health
          </h1>
          <p className="text-sm text-muted-foreground">
            Clear diagnosis of current risks, quality, and recommended next actions.
          </p>
        </div>

        {result ? (
          <Button variant="secondary" onClick={handleRerun} disabled={loading} className="w-full sm:w-auto">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Re-run Analysis
          </Button>
        ) : null}
      </div>

      <RiskOverviewPanel model={riskOverview} />
      <StabilityTrendPanel model={stabilityTrend} />

      <SystemOverviewBlock workspaceName={workspace?.name} result={result} />

      <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Key Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Main quality and efficiency signals to track performance over time.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {keyMetrics.map((item) => (
            <SignalScoreCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <ProblemsPanel items={problems} />
      <RecommendationsPanel items={recommendations} />
      <InteractionAnalysisPanel model={interactionModel} />

      <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">AI Interpretation</h2>
            <p className="text-sm text-muted-foreground">
              Optional explanation generated from the current analysis payload.
            </p>
            {interpretationAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Last interpretation: {new Date(interpretationAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <Button onClick={handleInterpret} disabled={!result || isInterpreting}>
            <Bot className="mr-2 h-4 w-4" />
            {isInterpreting
              ? "Generating..."
              : interpretation
                ? "Refresh Interpretation"
                : "Generate Interpretation"}
          </Button>
        </div>

        {isInterpreting ? <InterpretationSkeleton /> : null}

        {!isInterpreting && interpretation ? (
          <InterpretationCard
            interpretation={interpretation}
            model={interpretationModel}
            promptVersion={interpretationPromptVersion}
            cached={interpretationCached}
          />
        ) : null}

        {!isInterpreting && interpretationError ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {interpretationError}
          </div>
        ) : null}
      </section>
    </div>
  );
}
