import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Clock3,
  Compass,
  FlaskConical,
  History,
  LogOut,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import AnalysisIngestionCard from "@/components/dashboard/AnalysisIngestionCard";
import AnalysisLoadingOverlay from "@/components/dashboard/AnalysisLoadingOverlay";
import WorkspaceSelector from "@/components/dashboard/WorkspaceSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getAnalysisRunById,
  hasUserAnalysisRuns,
  listAnalysisRuns,
  type AnalysisRunSummary,
} from "@/lib/analysisRuns";
import type { AnalysisResult } from "@/lib/api";
import { listProjectEnvironments, listWorkspaceProjects } from "@/lib/systemRegistry";
import { buildWorkspaceHomePath, workspaceSlug } from "@/lib/workspaceRouting";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeLabel(name: string, fallback: string) {
  const trimmed = String(name || "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toHealthStatus(riskLevel: string | null | undefined): "Healthy" | "Attention" | "Critical" {
  const normalized = String(riskLevel || "").trim().toLowerCase();
  if (normalized === "high" || normalized === "critical") return "Critical";
  if (normalized === "medium") return "Attention";
  return "Healthy";
}

function statusBadgeClass(status: "Healthy" | "Attention" | "Critical") {
  if (status === "Critical") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "Attention") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function extractInsight(run: AnalysisRunSummary) {
  if (!run.raw_result || typeof run.raw_result !== "object") return "";
  const executiveSummary = String((run.raw_result as Record<string, unknown>).executive_summary ?? "").trim();
  if (executiveSummary) return executiveSummary;
  const argosV2 = (run.raw_result as Record<string, unknown>).argos_v2;
  if (typeof argosV2 !== "object" || !argosV2) return "";
  return String((argosV2 as Record<string, unknown>).executive_summary ?? "").trim();
}

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ projectsSlug?: string; workspaceSlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const {
    workspace,
    workspaces,
    project,
    environment,
    workspaceLoading,
    contextLoading,
    createWorkspace,
    refreshContext,
    signOut,
    user,
    switchWorkspace,
  } = useAuth();
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
  const [openComposerSignal, setOpenComposerSignal] = useState(0);
  const [ensuringContext, setEnsuringContext] = useState(false);
  const [checkingUsage, setCheckingUsage] = useState(true);
  const [hasAnyUsage, setHasAnyUsage] = useState(false);
  const ingestionCardRef = useRef<HTMLDivElement | null>(null);
  const quickScanButtonClass = "bg-[#01BBF6] text-white hover:bg-[#00a8de]";
  const newAnalysisButtonClass = "bg-[#0186AF] text-white hover:bg-[#01779c]";

  const startMode = searchParams.get("start");
  const workspaceDisplayName = useMemo(
    () => normalizeLabel(workspace?.name ?? "", "Workspace"),
    [workspace?.name],
  );
  const projectDisplayName = useMemo(
    () => normalizeLabel(project?.name ?? "", "System"),
    [project?.name],
  );
  const environmentDisplayName = useMemo(
    () => normalizeLabel(environment?.name ?? "", "Environment"),
    [environment?.name],
  );
  const canonicalHomePath = useMemo(
    () =>
      buildWorkspaceHomePath({
        email: user?.email,
        workspace,
      }),
    [user?.email, workspace],
  );
  const routeWorkspaceSlug = useMemo(
    () => String(params.workspaceSlug ?? "").trim().toLowerCase(),
    [params.workspaceSlug],
  );
  const activeWorkspaceSlug = useMemo(
    () => workspaceSlug(workspace).trim().toLowerCase(),
    [workspace],
  );
  const workspaceSlugMismatch = Boolean(
    routeWorkspaceSlug &&
      workspace &&
      activeWorkspaceSlug &&
      activeWorkspaceSlug !== routeWorkspaceSlug,
  );

  const hasRecentRuns = recentRuns.length > 0;
  const canOpenDashboard = Boolean(result) || analysisCompleted || hasRecentRuns;
  const showOperationalMode = hasRecentRuns;
  const latestRun = hasRecentRuns ? recentRuns[0] : null;
  const latestRunStatus = latestRun ? toHealthStatus(latestRun.risk_level) : null;

  const loadRecentRuns = useCallback(async () => {
    if (!workspace?.id || !project?.id || !environment?.id) {
      setRecentRuns([]);
      setRecentRunsError(null);
      return;
    }

    setLoadingRecentRuns(true);
    setRecentRunsError(null);
    try {
      const runs = await listAnalysisRuns(workspace.id, project.id, environment.id, 6);
      setRecentRuns(runs);
    } catch (error) {
      setRecentRunsError(error instanceof Error ? error.message : "Failed to load recent analyses.");
    } finally {
      setLoadingRecentRuns(false);
    }
  }, [environment?.id, project?.id, workspace?.id]);

  useEffect(() => {
    void loadRecentRuns();
  }, [loadRecentRuns]);

  useEffect(() => {
    if (!user?.id) {
      setCheckingUsage(false);
      setHasAnyUsage(false);
      return;
    }

    let active = true;
    setCheckingUsage(true);
    void hasUserAnalysisRuns(user.id)
      .then((hasUsage) => {
        if (!active) return;
        setHasAnyUsage(hasUsage);
      })
      .catch(() => {
        if (!active) return;
        setHasAnyUsage(false);
      })
      .finally(() => {
        if (active) {
          setCheckingUsage(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!routeWorkspaceSlug || workspaceLoading || workspaces.length === 0) return;
    const matched = workspaces.find(
      (item) => workspaceSlug(item).trim().toLowerCase() === routeWorkspaceSlug,
    );
    if (!matched || matched.id === workspace?.id) return;
    void switchWorkspace(matched.id);
  }, [routeWorkspaceSlug, switchWorkspace, workspace?.id, workspaceLoading, workspaces]);

  useEffect(() => {
    if (!workspace || workspaceLoading) return;
    if (workspaceSlugMismatch) return;
    if (location.pathname === canonicalHomePath) return;
    const next = `${canonicalHomePath}${location.search || ""}`;
    navigate(next, { replace: true });
  }, [
    canonicalHomePath,
    location.pathname,
    location.search,
    navigate,
    workspace,
    workspaceLoading,
    workspaceSlugMismatch,
  ]);

  const ensureContextForAnalysis = useCallback(async () => {
    setEnsuringContext(true);
    try {
      let resolvedWorkspaceId = workspace?.id ?? null;
      if (!workspace?.id) {
        const workspaceNumber = Math.max(1, workspaces.length + 1);
        const defaultName = `Workspace ${workspaceNumber}`;
        const created = await createWorkspace(defaultName);
        if (!created) {
          throw new Error("Could not create workspace.");
        }
        resolvedWorkspaceId = created.id;
      }

      await refreshContext();

      if (!resolvedWorkspaceId) {
        return { hasDeepContext: false };
      }

      const workspaceProjects = await listWorkspaceProjects(resolvedWorkspaceId);
      if (workspaceProjects.length === 0) {
        return { hasDeepContext: false };
      }

      const selectedProject =
        (project?.id ? workspaceProjects.find((item) => item.id === project.id) : null) ??
        workspaceProjects[0];
      if (!selectedProject) {
        return { hasDeepContext: false };
      }

      const projectEnvironments = await listProjectEnvironments(selectedProject.id);
      return { hasDeepContext: projectEnvironments.length > 0 };
    } finally {
      setEnsuringContext(false);
    }
  }, [createWorkspace, project?.id, refreshContext, workspace?.id, workspaces.length]);

  const openQuickScan = useCallback(async () => {
    navigate("/quick-scan");
  }, [navigate]);

  const openDatasetFlow = useCallback(async () => {
    try {
      const ensured = await ensureContextForAnalysis();
      if (!ensured.hasDeepContext) {
        navigate("/home/deep");
        toast({
          title: "Complete analysis context first",
          description: "Create or select project, system, and environment to run a deep analysis.",
        });
        return;
      }
      setDatasetModeOpen(true);
      setOpenComposerSignal((current) => current + 1);
      toast({
        title: "Analysis input is ready",
        description: "Upload a dataset file or paste conversation data to start analysis.",
      });
    } catch (error) {
      toast({
        title: "Context setup failed",
        description: error instanceof Error ? error.message : "Could not initialize context.",
        variant: "destructive",
      });
    }
  }, [ensureContextForAnalysis, navigate, toast]);

  useEffect(() => {
    if (!datasetModeOpen) return;
    const timer = window.setTimeout(() => {
      ingestionCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 70);
    return () => window.clearTimeout(timer);
  }, [datasetModeOpen, openComposerSignal]);

  useEffect(() => {
    if (startMode !== "dataset") return;
    void openDatasetFlow();
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("start");
      return next;
    }, { replace: true });
  }, [openDatasetFlow, setSearchParams, startMode]);

  useEffect(() => {
    if (checkingUsage) return;
    if (hasAnyUsage) return;
    if (location.pathname === "/home/welcome") return;
    navigate("/home/welcome", { replace: true });
  }, [checkingUsage, hasAnyUsage, location.pathname, navigate]);

  async function handleOpenRun(run: AnalysisRunSummary) {
    try {
      const runPayload =
        run.raw_result && typeof run.raw_result === "object"
          ? run.raw_result
          : (
              await getAnalysisRunById(run.id, {
                workspaceId: workspace?.id,
                projectId: project?.id,
                environmentId: environment?.id,
              })
            )?.raw_result;

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

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  if (workspaceLoading || contextLoading || !historyResolved || checkingUsage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          Preparing your analysis context...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnalysisLoadingOverlay open={loading} message={loadingMessage} progress={loadingProgress} />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <header className="rounded-3xl border border-border bg-card/75 px-5 py-4 shadow-sm sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.14em] text-primary">Sentinela ARGOS</p>
              <h1 className="text-lg font-semibold text-foreground">AI Observability Home</h1>
              <p className="text-xs text-muted-foreground">
                Active context: {workspaceDisplayName} / {projectDisplayName} / {environmentDisplayName}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <WorkspaceSelector compact />
              <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm sm:p-8">
          <div className="max-w-4xl space-y-3">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {showOperationalMode ? "Operational Entry" : "Context Entry"}
            </Badge>
            <h2 className="text-3xl font-semibold text-foreground">
              Understand your AI behavior before incidents scale
            </h2>
            <p className="text-sm text-muted-foreground">
              Sentinela analyzes AI conversations to detect drift, inconsistency, instability, and
              operational risk across your AI systems.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              className={`w-full justify-start ${quickScanButtonClass}`}
              onClick={() => void openQuickScan()}
              disabled={ensuringContext}
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              {ensuringContext ? "Preparing context..." : "Quick Scan"}
            </Button>
            <Button
              className={`w-full justify-start ${newAnalysisButtonClass}`}
              onClick={() => void openDatasetFlow()}
              disabled={ensuringContext}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              New Analysis
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/dashboard")}
              disabled={!canOpenDashboard}
            >
              <Compass className="mr-2 h-4 w-4" />
              Open Dashboard
            </Button>
            {hasRecentRuns ? (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => navigate("/dashboard/history")}
              >
                <History className="mr-2 h-4 w-4" />
                View History
              </Button>
            ) : (
              <div className="flex items-center rounded-md border border-dashed border-border/70 px-3 text-xs text-muted-foreground">
                History appears after your first completed run.
              </div>
            )}
          </div>

          {!canOpenDashboard ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Complete your first analysis in this context to unlock dashboard and history insights.
            </p>
          ) : null}
        </section>

        {showOperationalMode ? (
          <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Context Snapshot</h3>
                <p className="text-sm text-muted-foreground">
                  Recent behavior in the current workspace/system/environment scope.
                </p>
              </div>
              {latestRunStatus ? (
                <Badge variant="outline" className={statusBadgeClass(latestRunStatus)}>
                  {latestRunStatus}
                </Badge>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-border/70 bg-background/50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Latest analysis</p>
                <p className="mt-2 text-sm text-foreground">
                  {latestRun ? formatDate(latestRun.created_at) : "No runs in this context yet"}
                </p>
              </article>
              <article className="rounded-2xl border border-border/70 bg-background/50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Conversations analyzed</p>
                <p className="mt-2 text-sm text-foreground">{latestRun?.n_conversations ?? 0}</p>
              </article>
              <article className="rounded-2xl border border-border/70 bg-background/50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Intents observed</p>
                <p className="mt-2 text-sm text-foreground">{latestRun?.n_intents ?? 0}</p>
              </article>
            </div>

            {latestRun ? (
              <div className="mt-4 rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Main insight</p>
                <p className="mt-2 text-sm text-foreground">
                  {extractInsight(latestRun) || "Open the latest dashboard run to inspect detailed findings."}
                </p>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Get your first AI health signal quickly</h3>
                <p className="text-sm text-muted-foreground">
                  Start with Quick Scan for a rapid signal, then run a full analysis to unlock
                  diagnostics, history, and recommendations in dashboard.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className={quickScanButtonClass}
                    onClick={() => void openQuickScan()}
                    disabled={ensuringContext}
                  >
                    Start Quick Scan
                  </Button>
                  <Button
                    size="sm"
                    className={newAnalysisButtonClass}
                    onClick={() => void openDatasetFlow()}
                    disabled={ensuringContext}
                  >
                    Start Full Analysis
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {datasetModeOpen ? (
          <div ref={ingestionCardRef}>
            <AnalysisIngestionCard
              loading={loading}
              hasResult={Boolean(result)}
              openComposerSignal={openComposerSignal}
              onFileUpload={handleFileUpload}
              onRunFromPaste={handlePasteAnalysis}
              onImportResult={importAnalysisResult}
            />
          </div>
        ) : null}

        <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Recent Analyses</h3>
              <p className="text-sm text-muted-foreground">
                Analyses for the active workspace/system/environment only.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/history")} disabled={!hasRecentRuns}>
              Open full history
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {loadingRecentRuns ? (
            <p className="text-sm text-muted-foreground">Loading analysis feed...</p>
          ) : null}

          {!loadingRecentRuns && recentRunsError ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {recentRunsError}
            </p>
          ) : null}

          {!loadingRecentRuns && !recentRunsError && recentRuns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/40 p-5">
              <div className="flex items-start gap-3">
                <Activity className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    No analyses in this context yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Run Quick Scan for a fast health preview or start a full analysis to generate
                    dashboard diagnostics for this system and environment.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className={quickScanButtonClass}
                      onClick={() => void openQuickScan()}
                      disabled={ensuringContext}
                    >
                      Quick Scan
                    </Button>
                    <Button
                      size="sm"
                      className={newAnalysisButtonClass}
                      onClick={() => void openDatasetFlow()}
                      disabled={ensuringContext}
                    >
                      New Analysis
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {recentRuns.map((run) => {
              const status = toHealthStatus(run.risk_level);
              return (
                <article key={run.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-sm text-foreground">
                          <Clock3 className="h-4 w-4 text-muted-foreground" />
                          {formatDate(run.created_at)}
                        </span>
                        <Badge variant="outline" className={statusBadgeClass(status)}>
                          {status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Conversations: {run.n_conversations ?? 0} | Intents: {run.n_intents ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {extractInsight(run) || "Open this run for detailed findings and recommendations."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void handleOpenRun(run)}>
                        Open
                      </Button>
                      <Button size="sm" onClick={() => navigate("/dashboard")}>
                        Dashboard
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
