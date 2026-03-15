import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  MessageSquare,
  Target,
  BarChart3,
  FileText,
  Settings,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useLanguage } from "@/contexts/LanguageContext";

const navItems = [
  { titleKey: "common.overview", url: "/dashboard", icon: LayoutDashboard, availableWithoutResult: true },
  { titleKey: "common.history", url: "/dashboard/history", icon: History },
  { titleKey: "common.conversations", url: "/dashboard/conversations", icon: MessageSquare },
  { titleKey: "common.intents", url: "/dashboard/intents", icon: Target },
  { titleKey: "common.metrics", url: "/dashboard/metrics", icon: BarChart3 },
  { titleKey: "common.alerts", url: "/dashboard/alerts", icon: AlertTriangle },
  { titleKey: "common.reports", url: "/dashboard/reports", icon: FileText },
  { titleKey: "common.settings", url: "/dashboard/settings", icon: Settings, availableWithoutResult: true },
];

interface DashboardSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const DashboardSidebar = ({ mobileOpen, onClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasHistory } = useAnalysis();
  const { t } = useLanguage();
  const visibleItems = navItems.filter((item) => hasHistory || item.availableWithoutResult);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex min-h-screen w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar transition-transform md:static md:z-auto md:w-60 md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <span className="text-base font-bold text-sidebar-accent-foreground">Sentinela</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {!hasHistory ? (
          <div className="mb-4 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/30 px-3 py-3 text-xs text-sidebar-foreground/80">
            {t("dashboard.firstRunSidebar")}
          </div>
        ) : null}

        {visibleItems.map((item) => {
          const isActive =
            item.url === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.url);

          return (
            <RouterNavLink
              key={item.url}
              to={item.url}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {t(item.titleKey)}
            </RouterNavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut className="h-4 w-4" />
          {t("common.logout")}
        </button>
      </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
