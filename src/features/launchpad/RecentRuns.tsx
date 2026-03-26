import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";
import { listAnalysisRuns } from "@/lib/analysisRuns";
import { cn, formatRelativeTime, severityOrder } from "@/lib/utils";
import { LoadingState } from "@/shared/states/LoadingState";
import { EmptyState } from "@/shared/states/EmptyState";
import type { AnalysisResult } from "@/lib/api";

interface RunSummary {
  id: string;
  createdAt: string;
  nConversations?: number;
  nIntents?: number;
  riskLevel?: string;
  engineVersion?: string;
  rawResult?: AnalysisResult | null;
}

function RiskBadge({ level }: { level?: string }) {
  if (!level) return <span className="text-xs text-[#94A3B8]">—</span>;

  const styles: Record<string, string> = {
    CRITICAL: "badge-critical",
    HIGH: "badge-high",
    MEDIUM: "badge-high",
    LOW: "badge-low",
  };

  const style = styles[level.toUpperCase()] ?? "badge-info";

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold", style)}>
      {level}
    </span>
  );
}

interface RecentRunsProps {
  maxRuns?: number;
}

export function RecentRuns({ maxRuns = 5 }: RecentRunsProps) {
  const { workspace, project, environment } = useAuth();
  const { loadStoredAnalysis } = useAnalysis();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace?.id || !project?.id || !environment?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    listAnalysisRuns(workspace.id, project.id, environment.id, maxRuns)
      .then((data) => {
        setRuns(
          data.map((run) => ({
            id: run.id,
            createdAt: run.created_at ?? "",
            nConversations: run.n_conversations ?? undefined,
            nIntents: run.n_intents ?? undefined,
            riskLevel: run.risk_level ?? undefined,
            engineVersion: run.engine_version ?? undefined,
            rawResult: run.raw_result as AnalysisResult | null,
          }))
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load recent runs.");
      })
      .finally(() => setLoading(false));
  }, [workspace?.id, project?.id, environment?.id, maxRuns]);

  function handleLoadRun(run: RunSummary) {
    if (run.rawResult) {
      loadStoredAnalysis(run.rawResult);
      navigate("/dashboard");
    }
  }

  if (loading) {
    return <LoadingState message="Loading recent analyses" size="sm" className="py-8" />;
  }

  if (error) {
    return (
      <div className="card-base p-5">
        <p className="section-label mb-3">Recent analyses</p>
        <p className="text-sm text-[#F87171]">{error}</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="card-base p-6">
        <p className="section-label mb-4">Recent analyses</p>
        <EmptyState
          title="No analyses yet"
          description="Run your first analysis to start building your history. Upload a dataset above to get started."
          size="sm"
        />
      </div>
    );
  }

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">Recent analyses</p>
        <button
          onClick={() => navigate("/dashboard/history")}
          className="text-xs text-[#22D3EE] hover:text-[#06B6D4] transition-colors"
        >
          View all
        </button>
      </div>

      <div className="space-y-2">
        {runs.map((run) => (
          <button
            key={run.id}
            onClick={() => handleLoadRun(run)}
            disabled={!run.rawResult}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] transition-all group text-left",
              run.rawResult
                ? "hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.08)] cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            )}
          >
            {/* Time */}
            <div className="flex-shrink-0 text-left min-w-[80px]">
              <p className="text-xs text-[#94A3B8]">{formatRelativeTime(run.createdAt)}</p>
            </div>

            {/* Metrics */}
            <div className="flex-1 flex items-center gap-6 min-w-0">
              {run.nConversations !== undefined && (
                <div className="text-left">
                  <p className="text-xs text-[#94A3B8]">Conversations</p>
                  <p className="text-sm font-medium text-[#94A3B8]">{run.nConversations}</p>
                </div>
              )}
              {run.nIntents !== undefined && (
                <div className="text-left">
                  <p className="text-xs text-[#94A3B8]">Intents</p>
                  <p className="text-sm font-medium text-[#94A3B8]">{run.nIntents}</p>
                </div>
              )}
              {run.engineVersion && (
                <div className="text-left hidden sm:block">
                  <p className="text-xs text-[#94A3B8]">Engine</p>
                  <p className="text-xs font-mono text-[#94A3B8]">{run.engineVersion}</p>
                </div>
              )}
            </div>

            {/* Risk badge */}
            <div className="flex-shrink-0">
              <RiskBadge level={run.riskLevel} />
            </div>

            {/* Arrow */}
            {run.rawResult && (
              <svg
                className="w-4 h-4 text-[#475569] group-hover:text-[#22D3EE] transition-colors flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
