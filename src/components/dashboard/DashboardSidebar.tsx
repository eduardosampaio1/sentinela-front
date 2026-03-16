import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Radar,
  ShieldAlert,
  Activity,
  BrainCircuit,
  History,
  FolderOpen,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useLanguage } from "@/contexts/LanguageContext";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, availableWithoutResult: true },
  { title: "Analysis", url: "/dashboard/analysis", icon: Radar, availableWithoutResult: true },
  { title: "Guardrails", url: "/dashboard/guardrails", icon: ShieldAlert, availableWithoutResult: true },
  { title: "Diagnostics", url: "/dashboard/diagnostics", icon: Activity, availableWithoutResult: true },
  { title: "Optimization", url: "/dashboard/optimization", icon: BrainCircuit, availableWithoutResult: true },
  { title: "History", url: "/dashboard/history", icon: History, availableWithoutResult: true },
  { title: "Workspaces", url: "/dashboard/workspaces", icon: FolderOpen, availableWithoutResult: true },
  { title: "Settings", url: "/dashboard/settings", icon: Settings, availableWithoutResult: true },
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
      console.error("Sign out failed:", error);
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
        <span className="text-base font-bold text-sidebar-accent-foreground">Sentinela AI</span>
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
              {item.title}
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
