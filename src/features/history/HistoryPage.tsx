import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { LoadingState } from "@/shared/states/LoadingState";
import { EmptyState } from "@/shared/states/EmptyState";
import { ErrorState } from "@/shared/states/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";
import { listAnalysisRuns } from "@/lib/analysisRuns";
import type { AnalysisRunSummary } from "@/lib/analysisRuns";
import type { AnalysisResult } from "@/lib/api";
import { RunRow } from "./RunRow";

export function HistoryPage() {
  const { workspace, project, environment } = useAuth();
  const { loadStoredAnalysis } = useAnalysis();
  const navigate = useNavigate();

  const [runs, setRuns] = useState<AnalysisRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = () => {
    if (!workspace?.id || !project?.id || !environment?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    listAnalysisRuns(workspace.id, project.id, environment.id, 50)
      .then((data) => {
        setRuns(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load analysis history.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, [workspace?.id, project?.id, environment?.id]);

  function handleLoadRun(result: AnalysisResult) {
    loadStoredAnalysis(result);
    navigate("/dashboard");
  }

  const noContext = !workspace?.id || !project?.id || !environment?.id;

  return (
    <AppShell topBarTitle="Analysis history">
      <PageFrame maxWidth="2xl">
        <PageHeader
          title="Analysis history"
          description="All analysis runs for the current workspace context."
          actions={
            <button
              onClick={fetchRuns}
              className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>
          }
        />

        {noContext && (
          <EmptyState
            title="No workspace context"
            description="Select a workspace, project, and environment to view analysis history."
            action={{
              label: "Manage workspaces",
              onClick: () => navigate("/workspaces"),
            }}
          />
        )}

        {!noContext && loading && (
          <LoadingState message="Loading analysis history" className="py-16" />
        )}

        {!noContext && !loading && error && (
          <ErrorState
            title="Failed to load history"
            message={error}
            onRetry={fetchRuns}
          />
        )}

        {!noContext && !loading && !error && runs.length === 0 && (
          <EmptyState
            title="No analysis history yet"
            description="No analyses have been recorded in this context. Run your first analysis to start building history."
            action={{
              label: "Run first analysis",
              onClick: () => navigate("/home"),
            }}
          />
        )}

        {!noContext && !loading && !error && runs.length > 0 && (
          <div className="card-base overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
              <div className="w-28 flex-shrink-0">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748]">Date</p>
              </div>
              <div className="w-24 flex-shrink-0">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748]">Risk</p>
              </div>
              <div className="flex items-center gap-6 flex-1">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748]">Conversations</p>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748]">Intents</p>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] hidden sm:block">Engine</p>
              </div>
              <div className="w-20 flex-shrink-0" />
            </div>

            {/* Rows */}
            {runs.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                onLoad={handleLoadRun}
              />
            ))}
          </div>
        )}
      </PageFrame>
    </AppShell>
  );
}
