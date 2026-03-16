import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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

  const sectionLabel = (() => {
    if (location.pathname.startsWith("/dashboard/analysis")) return "Analysis";
    if (location.pathname.startsWith("/dashboard/guardrails")) return "Guardrails";
    if (location.pathname.startsWith("/dashboard/diagnostics")) return "Diagnostics";
    if (location.pathname.startsWith("/dashboard/optimization")) return "Optimization";
    if (location.pathname.startsWith("/dashboard/history")) return "History";
    if (location.pathname.startsWith("/dashboard/workspaces")) return "Workspaces";
    if (location.pathname.startsWith("/dashboard/settings")) return "Settings";
    return "Dashboard";
  })();

  return (
    <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground md:hidden"
          aria-label={t("dashboard.mobileMenu")}
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <WorkspaceSelector />
          <div className="text-xs text-muted-foreground">{result ? sectionLabel : t("dashboard.firstRunBadge")}</div>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
        {result?._meta?.mode === "demo" ? (
          <Badge variant="outline" className="border-primary/30 text-primary">
            {t("dashboard.demoMode")}
          </Badge>
        ) : null}
        <LanguageSwitcher />
      </div>
    </header>
  );
};

export default DashboardTopBar;
