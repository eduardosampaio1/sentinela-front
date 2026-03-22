import type { ComponentType } from "react";
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
  description: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  requiresHistory?: boolean;
  section: "launch" | "executive" | "analysis" | "admin";
}

const sectionLabels: Record<SidebarItem["section"], string> = {
  launch: "Launch",
  executive: "Executive",
  analysis: "Analysis modules",
  admin: "Administration",
};

const DashboardSidebar = ({ mobileOpen, onClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasHistory, result } = useAnalysis();
  const { t } = useLanguage();
  const { user, workspace } = useAuth();

  const homeUrl = workspace
    ? buildWorkspaceHomePath({
        email: user?.email,
        workspace,
      })
    : "/home/welcome";

  const navItems: SidebarItem[] = [
    {
      title: "Home",
      description: "Return to the launchpad and open a new analysis flow.",
      url: homeUrl,
      icon: Home,
      section: "launch",
    },
    {
      title: "Dashboard",
      description: "Executive command layer for health, drift, trust, and cost.",
      url: "/dashboard",
      icon: Compass,
      requiresHistory: true,
      section: "executive",
    },
    {
      title: "History",
      description: "Review previous runs and reopen prior operational states.",
      url: "/dashboard/history",
      icon: History,
      requiresHistory: true,
      section: "executive",
    },
    {
      title: "Analysis",
      description: "Inspect semantic and efficiency signals from the current run.",
      url: "/dashboard/analysis",
      icon: Radar,
      requiresHistory: true,
      section: "analysis",
    },
    {
      title: "Diagnostics",
      description: "Validate drift, instability, collapse, and degradation patterns.",
      url: "/dashboard/diagnostics",
      icon: Activity,
      requiresHistory: true,
      section: "analysis",
    },
    {
      title: "Guardrails",
      description: "Review safety, policy pressure, and intervention thresholds.",
      url: "/dashboard/guardrails",
      icon: ShieldAlert,
      requiresHistory: true,
      section: "analysis",
    },
    {
      title: "Optimization",
      description: "Find stability and cost levers for the next iteration.",
      url: "/dashboard/optimization",
      icon: BrainCircuit,
      requiresHistory: true,
      section: "analysis",
    },
    {
      title: "Manage Context",
      description: "Switch workspaces, projects, and environments.",
      url: "/workspaces",
      icon: FolderOpen,
      section: "admin",
    },
    {
      title: "Settings",
      description: "Adjust workspace-level preferences and account controls.",
      url: "/dashboard/settings",
      icon: Settings,
      section: "admin",
    },
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
        className={`fixed inset-0 z-30 bg-black/55 transition-opacity md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex min-h-screen w-[320px] max-w-[90vw] flex-col border-r border-sidebar-border/60 bg-[linear-gradient(180deg,rgba(8,13,25,0.98),rgba(8,14,28,0.94))] backdrop-blur-xl transition-transform md:static md:z-auto md:w-[300px] md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-sidebar-border/65 px-5 py-5">
          <div className="dashboard-panel-strong overflow-hidden rounded-[28px] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="dashboard-kicker">Command deck</p>
                <p className="font-display text-xl font-semibold text-foreground">Sentinela ARGOS</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/25 bg-background/35 text-primary">
                <Compass className="h-4 w-4" />
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Navigate from executive triage to deep analysis without losing the current decision context.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-[20px] border border-border/55 bg-background/35 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Mode</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {hasHistory ? "Operational dashboard" : "Awaiting first run"}
                </p>
              </article>
              <article className="rounded-[20px] border border-border/55 bg-background/35 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Current run</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {result?.analysis_run_id ?? "No active dashboard payload"}
                </p>
              </article>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {!hasHistory ? (
            <div className="rounded-[22px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
              Run your first analysis in this context to unlock the executive dashboard and deep modules.
            </div>
          ) : null}

          {(["launch", "executive", "analysis", "admin"] as const).map((section) => {
            const sectionItems = navItems.filter((item) => item.section === section);
            return (
              <div key={section} className="space-y-2">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {sectionLabels[section]}
                </p>

                <div className="space-y-2">
                  {sectionItems.map((item) => {
                    const isDisabled = Boolean(item.requiresHistory && !hasHistory);
                    const isActive =
                      item.url === "/dashboard"
                        ? location.pathname === "/dashboard"
                        : location.pathname.startsWith(item.url);

                    const itemClass = `group flex items-start gap-3 rounded-[22px] border px-3.5 py-3 transition-all ${
                      isDisabled
                        ? "cursor-not-allowed border-border/40 bg-background/20 opacity-50"
                        : isActive
                          ? "border-primary/30 bg-primary/10 shadow-[0_20px_48px_-36px_rgba(34,211,238,0.9)]"
                          : "border-border/45 bg-background/20 hover:border-primary/20 hover:bg-background/35"
                    }`;

                    const itemContent = (
                      <>
                        <span
                          className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                            isActive
                              ? "border-primary/30 bg-primary/12 text-primary"
                              : "border-border/50 bg-background/40 text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
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
                          {itemContent}
                        </div>
                      );
                    }

                    return (
                      <RouterNavLink key={item.url} to={item.url} onClick={onClose} className={itemClass}>
                        {itemContent}
                      </RouterNavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border/65 p-4">
          <div className="mb-3 rounded-[22px] border border-border/50 bg-background/25 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Session</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {hasHistory
                ? "Dashboard is fully unlocked for this context."
                : "Complete one run to unlock the full decision stack."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[18px] border border-border/45 bg-background/15 px-3.5 py-3 text-sm text-sidebar-foreground transition-colors hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-200"
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
