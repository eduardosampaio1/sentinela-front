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

  return (
    <header
      className={`sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border/45 bg-card/62 px-4 py-3 backdrop-blur-lg transition-transform duration-300 sm:px-6 ${
        hideOnScroll ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-foreground md:hidden"
          aria-label={t("dashboard.mobileMenu")}
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0 space-y-1">
          <div className="text-[11px] font-medium tracking-[0.03em] text-primary">Sentinela ARGOS</div>
          <WorkspaceSelector compact showManageLink={false} />
          <div className="text-xs text-muted-foreground/90">{result ? sectionLabel : t("dashboard.firstRunBadge")}</div>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
        {result?._meta?.mode === "demo" ? (
          <Badge variant="outline" className="border-primary/30 text-primary">
            {t("dashboard.demoMode")}
          </Badge>
        ) : null}
      </div>
    </header>
  );
};

export default DashboardTopBar;
