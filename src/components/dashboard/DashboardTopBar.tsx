import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useLanguage } from "@/contexts/LanguageContext";
import WorkspaceSelector from "@/components/dashboard/WorkspaceSelector";

interface DashboardTopBarProps {
  onOpenSidebar: () => void;
}

const sectionDescriptions: Record<string, string> = {
  dashboard: "Start with the executive layer, then go deeper only where the current run needs verification.",
  analysis: "Review semantic quality and efficiency signals to validate the engine's current behavior.",
  diagnostics: "Inspect drift, instability, collapse, and degeneration before you push more traffic.",
  guardrails: "Confirm policy and safety pressure points before they become escalation or trust incidents.",
  optimization: "Use optimization signals to decide what to tune next for quality and cost control.",
  history: "Compare recent runs and reopen the decision context that led to previous actions.",
  "manage-context": "Move across workspaces, projects, and environments without losing operational context.",
  settings: "Adjust workspace preferences and account controls for the current operating setup.",
};

function resolveSection(pathname: string) {
  if (pathname.startsWith("/dashboard/analysis")) return { key: "analysis", label: "Analysis" };
  if (pathname.startsWith("/dashboard/guardrails")) return { key: "guardrails", label: "Guardrails" };
  if (pathname.startsWith("/dashboard/diagnostics")) return { key: "diagnostics", label: "Diagnostics" };
  if (pathname.startsWith("/dashboard/optimization")) return { key: "optimization", label: "Optimization" };
  if (pathname.startsWith("/dashboard/history")) return { key: "history", label: "History" };
  if (
    pathname.startsWith("/dashboard/workspaces") ||
    pathname.startsWith("/dashboard/manage-context") ||
    pathname.startsWith("/manage-context") ||
    pathname.startsWith("/workspaces")
  ) {
    return { key: "manage-context", label: "Manage Context" };
  }
  if (pathname.startsWith("/dashboard/settings")) return { key: "settings", label: "Settings" };
  return { key: "dashboard", label: "Dashboard" };
}

const DashboardTopBar = ({ onOpenSidebar }: DashboardTopBarProps) => {
  const location = useLocation();
  const { result, hasHistory } = useAnalysis();
  const { t } = useLanguage();

  const section = resolveSection(location.pathname);

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="dashboard-panel overflow-hidden rounded-[30px] border-border/65 bg-background/72 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/45 text-foreground md:hidden"
              aria-label={t("dashboard.mobileMenu")}
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="dashboard-kicker">Decision workspace</p>
                {result?._meta?.mode === "demo" ? (
                  <Badge variant="outline" className="border-primary/25 bg-primary/8 text-primary">
                    {t("dashboard.demoMode")}
                  </Badge>
                ) : null}
                {!hasHistory ? (
                  <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-200">
                    Setup required
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-200">
                    Live context
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  {hasHistory ? section.label : t("dashboard.firstRunBadge")}
                </h2>
                {result?.analysis_run_id ? (
                  <span className="rounded-full border border-border/55 bg-background/35 px-3 py-1 text-xs text-muted-foreground">
                    Run {result.analysis_run_id}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {sectionDescriptions[section.key]}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[340px] xl:max-w-[400px]">
            <div className="rounded-[24px] border border-border/55 bg-background/38 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Advisory</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Use the executive layer first. Deep views are there to verify, not to overwhelm.
              </p>
            </div>
            <WorkspaceSelector compact showManageLink={false} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopBar;
