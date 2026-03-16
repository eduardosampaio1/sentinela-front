import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock3, Compass, FlaskConical, UploadCloud } from "lucide-react";
import AnalysisIngestionCard from "@/components/dashboard/AnalysisIngestionCard";
import AnalysisLoadingOverlay from "@/components/dashboard/AnalysisLoadingOverlay";
import { Button } from "@/components/ui/button";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getAnalysisRunById,
  listAnalysisRuns,
  type AnalysisRunSummary,
} from "@/lib/analysisRuns";
import type { AnalysisResult } from "@/lib/api";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeWorkspaceName(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "Workspace";
}

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { workspace, workspaces, workspaceLoading, createWorkspace } = useAuth();
  const {
    analysisCompleted,
    historyResolved,
    loading,
    loadingMessage,
    loadingProgress,
    result,
    handleFileUpload,
    handlePasteAnalysis,
    importAnalysisResult,
    loadStoredAnalysis,
  } = useAnalysis();

  const [recentRuns, setRecentRuns] = useState<AnalysisRunSummary[]>([]);
  const [loadingRecentRuns, setLoadingRecentRuns] = useState(false);
  const [recentRunsError, setRecentRunsError] = useState<string | null>(null);
  const [datasetModeOpen, setDatasetModeOpen] = useState(false);
  const [ensuringWorkspace, setEnsuringWorkspace] = useState(false);

  const startMode = searchParams.get("start");
  const workspaceDisplayName = useMemo(
    () => normalizeWorkspaceName(workspace?.name ?? "Workspace"),
    [workspace?.name],
  );

  const loadRecentRuns = useCallback(async () => {
    if (!workspace?.id) {
      setRecentRuns([]);
      setRecentRunsError(null);
      return;
    }

    setLoadingRecentRuns(true);
    setRecentRunsError(null);
    try {
      const runs = await listAnalysisRuns(workspace.id, 6);
      setRecentRuns(runs);
    } catch (error) {
      setRecentRunsError(error instanceof Error ? error.message : "Failed to load recent analyses.");
    } finally {
      setLoadingRecentRuns(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    void loadRecentRuns();
  }, [loadRecentRuns]);

  const ensureWorkspaceForDataset = useCallback(async () => {
    if (workspace?.id) return workspace.id;

    setEnsuringWorkspace(true);
    try {
      const workspaceNumber = Math.max(1, workspaces.length + 1);
      const defaultName = `Workspace ${workspaceNumber}`;
      const created = await createWorkspace(defaultName);
      if (!created) {
        throw new Error("Could not create workspace.");
      }

      toast({
        title: "Workspace created",
        description: `${defaultName} is ready for your first analysis.`,
      });
      return created.id;
    } finally {
      setEnsuringWorkspace(false);
    }
  }, [createWorkspace, toast, workspace?.id, workspaces.length]);

  const openDatasetFlow = useCallback(async () => {
    try {
      await ensureWorkspaceForDataset();
      setDatasetModeOpen(true);
    } catch (error) {
      toast({
        title: "Workspace setup failed",
        description: error instanceof Error ? error.message : "Could not initialize workspace.",
        variant: "destructive",
      });
    }
  }, [ensureWorkspaceForDataset, toast]);

  useEffect(() => {
    if (startMode !== "dataset") return;
    void openDatasetFlow();
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("start");
      return next;
    }, { replace: true });
  }, [openDatasetFlow, setSearchParams, startMode]);

  async function handleOpenRun(run: AnalysisRunSummary) {
    try {
      const runPayload =
        run.raw_result && typeof run.raw_result === "object"
          ? run.raw_result
          : (await getAnalysisRunById(run.id))?.raw_result;

      if (!runPayload || typeof runPayload !== "object") {
        throw new Error("Selected analysis has no payload.");
      }

      loadStoredAnalysis(runPayload as AnalysisResult);
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Failed to open analysis",
        description: error instanceof Error ? error.message : "Could not load selected analysis.",
        variant: "destructive",
      });
    }
  }

  if (workspaceLoading || !historyResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading home...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnalysisLoadingOverlay open={loading} message={loadingMessage} progress={loadingProgress} />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm sm:p-8">
          <p className="text-xs uppercase tracking-[0.14em] text-primary">Sentinela Home</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Understand your AI behavior before incidents scale</h1>
          <p className="mt-3 max-w-4xl text-sm text-muted-foreground">
            Sentinela analyzes AI conversations to detect drift, structural instability and
            operational risk in production systems.
          </p>
          <p className="mt-2 max-w-4xl text-sm text-muted-foreground">
            Run a quick scan or upload a dataset to understand how your AI assistant behaves.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Button className="w-full justify-start" onClick={() => navigate("/quick-scan")}>
              <FlaskConical className="mr-2 h-4 w-4" />
              Quick Scan
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => void openDatasetFlow()}
              disabled={ensuringWorkspace}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {ensuringWorkspace ? "Preparing workspace..." : "Create New Analysis"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/dashboard")}
              disabled={!analysisCompleted}
            >
              <Compass className="mr-2 h-4 w-4" />
              Open Dashboard
            </Button>
          </div>

          {!analysisCompleted ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Dashboard unlocks after your first completed analysis.
            </p>
          ) : null}

          <p className="mt-4 text-xs text-muted-foreground">
            Active workspace: <span className="text-foreground">{workspaceDisplayName}</span>
          </p>
        </section>

        {datasetModeOpen ? (
          <AnalysisIngestionCard
            loading={loading}
            hasResult={Boolean(result)}
            onFileUpload={handleFileUpload}
            onRunFromPaste={handlePasteAnalysis}
            onImportResult={importAnalysisResult}
          />
        ) : null}

        <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Analyses</h2>
            <p className="text-sm text-muted-foreground">
              Open a previous run or start a new one from this workspace.
            </p>
          </div>

          {loadingRecentRuns ? (
            <p className="text-sm text-muted-foreground">Loading recent analyses...</p>
          ) : null}

          {!loadingRecentRuns && recentRunsError ? (
            <p className="text-sm text-red-400">{recentRunsError}</p>
          ) : null}

          {!loadingRecentRuns && !recentRunsError && recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No analysis runs found yet. Start with Quick Scan or create a new analysis.
            </p>
          ) : null}

          <div className="space-y-3">
            {recentRuns.map((run) => (
              <article
                key={run.id}
                className="rounded-2xl border border-border/70 bg-background/50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      {formatDate(run.created_at)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Conversations: {run.n_conversations ?? 0} | Intents: {run.n_intents ?? 0}
                      {run.risk_level ? ` | Risk: ${run.risk_level}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void handleOpenRun(run)}>
                    Open Analysis
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
