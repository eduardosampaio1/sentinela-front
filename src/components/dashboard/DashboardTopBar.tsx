import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useLanguage } from "@/contexts/LanguageContext";
import WorkspaceSelector from "@/components/dashboard/WorkspaceSelector";

interface DashboardTopBarProps {
  onOpenSidebar: () => void;
}

const DashboardTopBar = ({ onOpenSidebar }: DashboardTopBarProps) => {
  const location = useLocation();
  const { result } = useAnalysis();
  const { t } = useLanguage();
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY || 0;
      const delta = currentY - lastScrollY.current;

      if (currentY < 24) {
        setHideOnScroll(false);
        lastScrollY.current = currentY;
        return;
      }

      if (delta > 8) {
        setHideOnScroll(true);
      } else if (delta < -8) {
        setHideOnScroll(false);
      }

      lastScrollY.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sectionLabel = (() => {
    if (location.pathname.startsWith("/dashboard/analysis")) return "Analysis";
    if (location.pathname.startsWith("/dashboard/guardrails")) return "Guardrails";
    if (location.pathname.startsWith("/dashboard/diagnostics")) return "Diagnostics";
    if (location.pathname.startsWith("/dashboard/optimization")) return "Optimization";
    if (location.pathname.startsWith("/dashboard/history")) return "History";
    if (location.pathname.startsWith("/dashboard/workspaces")) return "Manage Context";
    if (location.pathname.startsWith("/dashboard/manage-context")) return "Manage Context";
    if (location.pathname.startsWith("/manage-context")) return "Manage Context";
    if (location.pathname.startsWith("/workspaces")) return "Manage Context";
    if (location.pathname.startsWith("/dashboard/settings")) return "Settings";
    return "Dashboard";
  })();

  const sectionDescription = (() => {
    if (location.pathname.startsWith("/dashboard/analysis")) return "Inspect the raw signal surfaces behind quality and cost.";
    if (location.pathname.startsWith("/dashboard/guardrails")) return "Review policy, safety, and intervention pressure.";
    if (location.pathname.startsWith("/dashboard/diagnostics")) return "Track instability, drift, and system degradation.";
    if (location.pathname.startsWith("/dashboard/optimization")) return "Tune for clarity, efficiency, and long-term stability.";
    if (location.pathname.startsWith("/dashboard/history")) return "Compare run evolution before changing prompts or policy.";
    if (location.pathname.startsWith("/dashboard/settings")) return "Adjust the dashboard environment and preferences.";
    return "Start from the executive layer, then drill down only where the system needs explanation.";
  })();

  return (
    <header
      className={`sticky top-0 z-30 px-4 pt-4 backdrop-blur-xl transition-transform duration-300 sm:px-6 lg:px-8 ${
        hideOnScroll ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="rounded-[30px] border border-border/70 bg-background/75 px-4 py-4 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/70 text-foreground md:hidden"
              aria-label={t("dashboard.mobileMenu")}
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                {result ? "Decision workspace" : "Setup required"}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{sectionLabel}</h1>
                <Badge variant="outline" className="border-border/70 bg-card/60 text-muted-foreground">
                  {result ? "Live context" : t("dashboard.firstRunBadge")}
                </Badge>
                {result?._meta?.mode === "demo" ? (
                  <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">
                    {t("dashboard.demoMode")}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{sectionDescription}</p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <div className="rounded-[20px] border border-border/70 bg-card/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
              Use the executive layer first. Deep views are there to verify, not to overwhelm.
            </div>
            <WorkspaceSelector compact showManageLink={false} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopBar;
