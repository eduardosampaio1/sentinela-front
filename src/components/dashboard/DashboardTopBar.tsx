import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardTopBarProps {
  onOpenSidebar: () => void;
}

const DashboardTopBar = ({ onOpenSidebar }: DashboardTopBarProps) => {
  const { workspace } = useAuth();
  const { result } = useAnalysis();
  const { t } = useLanguage();

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
        <div>
          <div className="text-sm font-medium text-foreground">
            {workspace?.name ?? t("dashboard.workspaceFallback")}
          </div>
          <div className="text-xs text-muted-foreground">{result ? t("common.overview") : t("dashboard.firstRunBadge")}</div>
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
