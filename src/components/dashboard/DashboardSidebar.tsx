import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BrainCircuit,
  Compass,
  FolderOpen,
  History,
  Home,
  LogOut,
  Radar,
  Settings,
  ShieldAlert,
} from "lucide-react";
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
  description: string;
  section: "launch" | "executive" | "analysis" | "admin";
  requiresHistory?: boolean;
}

const DashboardSidebar = ({ mobileOpen, onClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasHistory, result } = useAnalysis();
  const { t } = useLanguage();
  const { user, workspace, signOut } = useAuth();

  const homeUrl = workspace
    ? buildWorkspaceHomePath({
        email: user?.email,
        workspace,
      })
    : "/home/welcome";

  const navItems: SidebarItem[] = [
    { title: "Home", url: homeUrl, icon: Home, description: "Return to the launchpad", section: "launch" },
    { title: "Dashboard", url: "/dashboard", icon: Compass, description: "Executive overview", section: "executive", requiresHistory: true },
    { title: "History", url: "/dashboard/history", icon: History, description: "Compare run movement", section: "executive", requiresHistory: true },
    { title: "Analysis", url: "/dashboard/analysis", icon: Radar, description: "Core quality signals", section: "analysis", requiresHistory: true },
    { title: "Diagnostics", url: "/dashboard/diagnostics", icon: Activity, description: "Behavior shifts and failure modes", section: "analysis", requiresHistory: true },
    { title: "Guardrails", url: "/dashboard/guardrails", icon: ShieldAlert, description: "Policy and risk containment", section: "analysis", requiresHistory: true },
    { title: "Optimization", url: "/dashboard/optimization", icon: BrainCircuit, description: "Efficiency and long-term tuning", section: "analysis", requiresHistory: true },
    { title: "Manage Context", url: "/workspaces", icon: FolderOpen, description: "Workspace and system scope", section: "admin" },
    { title: "Settings", url: "/dashboard/settings", icon: Settings, description: "Preferences and controls", section: "admin" },
  ];

  const groupedNav = [
    { id: "launch", label: "Launch", items: navItems.filter((item) => item.section === "launch") },
    { id: "executive", label: "Executive", items: navItems.filter((item) => item.section === "executive") },
    { id: "analysis", label: "Analysis modules", items: navItems.filter((item) => item.section === "analysis") },
    { id: "admin", label: "Administration", items: navItems.filter((item) => item.section === "admin") },
  ];

  async function handleLogout() {
    try {
      // No modo keycloak isto redireciona ao end-session do Keycloak; no supabase limpa a sessão.
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex min-h-screen w-[320px] max-w-[90vw] flex-col border-r border-sidebar-border/80 bg-[linear-gradient(180deg,rgba(11,18,32,0.98),rgba(8,13,24,0.99))] transition-transform md:static md:z-auto md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-sidebar-border/80 px-5 py-5">
          <div className="rounded-[28px] border border-sidebar-border/75 bg-white/[0.03] p-5 shadow-[0_22px_50px_-36px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                  Command deck
                </div>
                <div className="mt-1 text-xl font-semibold text-sidebar-accent-foreground">
                  Sentinela ARGOS
                </div>
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.14em] text-primary">
                Live
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-sidebar-foreground/80">
              Operational command center for trust, drift, cost, and action priority.
            </p>

            <div className="mt-4 grid gap-3">
              <div className="rounded-[20px] border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">Mode</p>
                <p className="mt-2 text-sm font-medium text-sidebar-accent-foreground">
                  {hasHistory ? "Operational dashboard" : "Awaiting first run"}
                </p>
              </div>
              <div className="rounded-[20px] border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">Current run</p>
                <p className="mt-2 break-all text-sm font-medium text-sidebar-accent-foreground">
                  {result?.analysis_run_id ?? "No active dashboard payload"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {!hasHistory ? (
            <div className="mb-5 rounded-[22px] border border-sidebar-border/75 bg-sidebar-accent/40 px-4 py-3 text-xs leading-5 text-sidebar-foreground/80">
              Run your first analysis in this context to unlock dashboard views.
            </div>
          ) : null}

          <div className="space-y-5">
            {groupedNav.map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/50">
                  {group.label}
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isDisabled = Boolean(item.requiresHistory && !hasHistory);
                    const isActive =
                      item.url === "/dashboard"
                        ? location.pathname === "/dashboard"
                        : location.pathname.startsWith(item.url);
                    const itemClass = `flex items-start gap-3 rounded-[20px] border px-4 py-3 text-sm transition-all ${
                      isDisabled
                        ? "cursor-not-allowed border-transparent opacity-45"
                        : isActive
                          ? "border-primary/25 bg-primary/12 text-sidebar-accent-foreground shadow-[0_18px_38px_-28px_rgba(34,211,238,0.7)]"
                          : "border-transparent text-sidebar-foreground/80 hover:border-sidebar-border/70 hover:bg-white/[0.03] hover:text-sidebar-accent-foreground"
                    }`;

                    const content = (
                      <>
                        <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium">{item.title}</div>
                          <div className="mt-0.5 text-xs leading-5 text-sidebar-foreground/55">
                            {item.description}
                          </div>
                        </div>
                      </>
                    );

                    if (isDisabled) {
                      return (
                        <div
                          key={item.url}
                          className={itemClass}
                          title="Run at least one analysis in this context to enable this view."
                        >
                          {content}
                        </div>
                      );
                    }

                    return (
                      <RouterNavLink key={item.url} to={item.url} onClick={onClose} className={itemClass}>
                        {content}
                      </RouterNavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-sidebar-border/80 px-4 py-4">
          <div className="mb-3 rounded-[22px] border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">Session</p>
            <p className="mt-2 text-sm text-sidebar-accent-foreground">
              {hasHistory ? "Dashboard is fully unlocked for this context." : "Complete one run to unlock the full stack."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[18px] border border-transparent px-4 py-3 text-sm text-sidebar-foreground/80 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
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
