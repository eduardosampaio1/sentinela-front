import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";
import { AnalysisLauncher } from "./AnalysisLauncher";
import { RecentRuns } from "./RecentRuns";
import { ProcessingOverlay } from "./ProcessingOverlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function WorkspaceContextBanner() {
  const { workspace, project, environment } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-[#0D1525] border border-[rgba(255,255,255,0.06)] mb-6">
      <div className="flex items-center gap-6 min-w-0">
        {/* Workspace */}
        <div className="min-w-0">
          <p className="section-label mb-0.5">Workspace</p>
          <p className="text-sm font-medium text-[#F1F5F9] truncate">
            {workspace?.name ?? "—"}
          </p>
        </div>

        <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" aria-hidden="true" />

        {/* Project */}
        <div className="min-w-0">
          <p className="section-label mb-0.5">System</p>
          <p className="text-sm font-medium text-[#94A3B8] truncate">
            {project?.name ?? "—"}
          </p>
        </div>

        <div className="w-px h-8 bg-[rgba(255,255,255,0.06)] hidden sm:block" aria-hidden="true" />

        {/* Environment */}
        {environment && (
          <div className="hidden sm:block">
            <p className="section-label mb-0.5">Environment</p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.12)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" aria-hidden="true" />
              <span className="text-xs font-medium text-[#22D3EE]">{environment.name}</span>
            </span>
          </div>
        )}
      </div>

      <Button
        onClick={() => navigate("/workspaces")}
        variant="ghost"
        size="sm"
        className="rounded-xl text-[#475569] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] flex-shrink-0"
      >
        Manage
      </Button>
    </div>
  );
}

export function LaunchpadPage() {
  const { analysisCompleted, loading, loadingStep, loadingProgress } = useAnalysis();
  const navigate = useNavigate();

  return (
    <>
      <ProcessingOverlay
        visible={loading}
        stage={loadingStep}
        progress={loadingProgress}
      />

      <AppShell topBarTitle="Analysis Workspace">
        <PageFrame maxWidth="xl">
          <WorkspaceContextBanner />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#F1F5F9] mb-1">
                  Analyze your AI system
                </h1>
                <p className="text-sm text-[#475569] leading-relaxed max-w-lg">
                  Upload a conversation dataset and get instant diagnostics — behavior score, risk level, economic impact, and actionable recommendations.
                </p>
              </div>

              {analysisCompleted && (
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="rounded-xl bg-[rgba(34,211,238,0.12)] text-[#22D3EE] border border-[rgba(34,211,238,0.2)] hover:bg-[rgba(34,211,238,0.18)] flex-shrink-0"
                  size="sm"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z" />
                  </svg>
                  View last results
                </Button>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 gap-6">
            {/* Launcher */}
            <AnalysisLauncher />

            {/* Recent runs */}
            <RecentRuns maxRuns={5} />
          </div>

          {/* Info footer */}
          <div className="mt-8 flex items-start gap-3 px-4 py-3 rounded-xl bg-[rgba(34,211,238,0.04)] border border-[rgba(34,211,238,0.08)]">
            <svg className="w-4 h-4 text-[#22D3EE] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <div>
              <p className="text-xs font-medium text-[#22D3EE] mb-0.5">What you need</p>
              <p className="text-xs text-[#475569] leading-relaxed">
                A JSONL or JSON file containing your conversation records. Each record should include conversation turns with user and assistant messages. Minimum 2 conversations required for meaningful analysis.
              </p>
            </div>
          </div>
        </PageFrame>
      </AppShell>
    </>
  );
}
