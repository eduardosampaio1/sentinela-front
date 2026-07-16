import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";
import { AnalysisLauncher } from "./AnalysisLauncher";
import { RecentRuns } from "./RecentRuns";
import { ProcessingOverlay } from "./ProcessingOverlay";
import { Button } from "@/components/ui/button";

// ─── Active context strip ────────────────────────────────────────────────────

function ContextStrip() {
  const { workspace, project, environment } = useAuth();
  const navigate = useNavigate();


  const hasContext = workspace || project || environment;
  const isComplete = workspace && project && environment;

  if (!hasContext) return null;

  return (
    <div
      className={`flex items-center justify-between px-5 py-3 rounded-xl border mb-6 ${
        isComplete
          ? "bg-[#0D1525] border-[rgba(255,255,255,0.06)]"
          : "bg-[rgba(252,211,77,0.04)] border-[rgba(252,211,77,0.12)]"
      }`}
    >
      <div className="flex items-center gap-6 min-w-0 flex-1">
        {workspace && (
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] mb-0.5">Workspace</p>
            <p className="text-sm font-semibold text-[#F1F5F9] truncate">{workspace.name}</p>
          </div>
        )}

        {workspace && project && (
          <div className="w-px h-7 bg-[rgba(255,255,255,0.06)] flex-shrink-0" aria-hidden="true" />
        )}

        {project && (
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] mb-0.5">System</p>
            <p className="text-sm font-medium text-[#94A3B8] truncate">{project.name}</p>
          </div>
        )}

        {project && environment && (
          <div className="w-px h-7 bg-[rgba(255,255,255,0.06)] hidden sm:block flex-shrink-0" aria-hidden="true" />
        )}

        {environment && (
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] mb-0.5">Environment</p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(79,90,232,0.08)] border border-[rgba(79,90,232,0.12)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F5AE8]" aria-hidden="true" />
              <span className="text-xs font-medium text-[#4F5AE8]">{environment.name}</span>
            </span>
          </div>
        )}

        {!isComplete && (
          <p className="text-xs text-[#FCD34D] ml-2">
            Context incomplete — results will not be saved to history
          </p>
        )}
      </div>

      <Button
        onClick={() => navigate("/workspaces")}
        variant="ghost"
        size="sm"
        className="rounded-xl text-[#94A3B8] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] flex-shrink-0 ml-4"
      >
        Change
      </Button>
    </div>
  );
}

// ─── LaunchpadPage ─────────────────────────────────────────────────────────────

export function LaunchpadPage() {
  const { analysisCompleted, loading, loadingStep, loadingProgress, result } = useAnalysis();
  const navigate = useNavigate();

  // Navigate to dashboard when a fresh analysis finishes successfully.
  // We watch the loading cycle (true → false) instead of `analysisCompleted`
  // because `analysisCompleted` may already be true (hasHistory) before the run
  // starts, making the false→true edge never fire for repeat users.
  // We also capture the result at load-start so we can detect whether a NEW
  // result was produced (vs a failed run that leaves the old result in place).
  const prevLoading = useRef(loading);
  const resultAtLoadStart = useRef<typeof result | undefined>(undefined);
  useEffect(() => {
    if (loading && !prevLoading.current) {
      // Loading just started — snapshot the current result to compare later.
      resultAtLoadStart.current = result;
    }
    if (!loading && prevLoading.current) {
      // Loading just ended — navigate only if a new result was produced.
      if (result !== null && result !== resultAtLoadStart.current) {
        navigate("/dashboard");
      }
      resultAtLoadStart.current = undefined;
    }
    prevLoading.current = loading;
  }, [loading, navigate, result]);

  return (
    <>
      <ProcessingOverlay
        visible={loading}
        stage={loadingStep}
        progress={loadingProgress}
      />

      <AppShell topBarTitle="Launchpad">
        <PageFrame maxWidth="xl">

          {/* Context confirmation */}
          <ContextStrip />

          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[#F1F5F9] mb-1.5">
                  Analyze your AI system
                </h1>
                <p className="text-sm text-[#94A3B8] leading-relaxed max-w-xl">
                  Upload a conversation dataset to produce a full diagnostic report —
                  behavior score, risk classification, economic impact, and prioritized
                  recommendations. Results are saved to your workspace history.
                </p>
              </div>

              {analysisCompleted && (
                <Button
                  onClick={() => navigate("/dashboard")}
                  size="sm"
                  className="rounded-xl bg-[rgba(79,90,232,0.10)] text-[#4F5AE8] border border-[rgba(79,90,232,0.18)] hover:bg-[rgba(79,90,232,0.16)] flex-shrink-0"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                  </svg>
                  View last results
                </Button>
              )}
            </div>
          </div>

          {/* Main layout */}
          <div className="space-y-6">
            <AnalysisLauncher />
            <RecentRuns maxRuns={5} />
          </div>

          {/* Format guidance */}
          <div className="mt-8 flex items-start gap-3 px-5 py-4 rounded-xl bg-[rgba(79,90,232,0.04)] border border-[rgba(79,90,232,0.08)]">
            <svg className="w-4 h-4 text-[#4F5AE8] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-[#4F5AE8] mb-1">Dataset format</p>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Accepts <span className="text-[#94A3B8] font-mono">.json</span> or{" "}
                <span className="text-[#94A3B8] font-mono">.jsonl</span> files containing conversation records.
                Each record must include user and assistant turns. A minimum of 2 conversations
                is required for statistical validity. Larger datasets produce more reliable scores.
              </p>
            </div>
          </div>

        </PageFrame>
      </AppShell>
    </>
  );
}
