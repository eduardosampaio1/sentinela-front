import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BrainCircuit,
  Compass,
  FolderOpen,
  History,
  Home,
  LogOut,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildWorkspaceHomePath } from "@/lib/workspaceRouting";

interface DashboardSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

interface SidebarItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresHistory?: boolean;
}

const DashboardSidebar = ({ mobileOpen, onClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasHistory } = useAnalysis();
  const { t } = useLanguage();
  const { user, workspace } = useAuth();

  const homeUrl = workspace
    ? buildWorkspaceHomePath({
        email: user?.email,
        workspace,
      })
    : "/home/welcome";

  const navItems: SidebarItem[] = [
    { title: "Home", url: homeUrl, icon: Home },
    { title: "Dashboard", url: "/dashboard", icon: Compass, requiresHistory: true },
    { title: "History", url: "/dashboard/history", icon: History, requiresHistory: true },
    { title: "Diagnostics", url: "/dashboard/diagnostics", icon: Activity, requiresHistory: true },
    { title: "Guardrails", url: "/dashboard/guardrails", icon: ShieldAlert, requiresHistory: true },
    { title: "Optimization", url: "/dashboard/optimization", icon: BrainCircuit, requiresHistory: true },
    { title: "Manage Context", url: "/workspaces", icon: FolderOpen },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ];

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
        className={`fixed inset-y-0 left-0 z-40 flex min-h-screen w-72 max-w-[85vw] flex-col border-r border-sidebar-border/65 bg-sidebar/92 backdrop-blur-md transition-transform md:static md:z-auto md:w-60 md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center border-b border-sidebar-border/70 px-5">
          <span className="text-base font-bold text-sidebar-accent-foreground">Sentinela ARGOS</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {!hasHistory ? (
            <div className="mb-4 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/25 px-3 py-3 text-xs text-sidebar-foreground/80">
              Run your first analysis in this context to unlock full dashboard navigation.
            </div>
          ) : null}

          {navItems.map((item) => {
            const isDisabled = Boolean(item.requiresHistory && !hasHistory);
            const isActive =
              item.url === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(item.url);
            const itemClass = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isDisabled
                ? "cursor-not-allowed opacity-50"
                : isActive
                  ? "bg-sidebar-accent/70 font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            }`;

            if (isDisabled) {
              return (
                <div
                  key={item.url}
                  className={itemClass}
                  title="Run at least one analysis in this context to enable this view."
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </div>
              );
            }

            return (
              <RouterNavLink key={item.url} to={item.url} onClick={onClose} className={itemClass}>
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
