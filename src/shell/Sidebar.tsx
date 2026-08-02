import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";
import { SentinelaMark } from "@/components/brand/SentinelaMark";

// ─── Icon primitives ───────────────────────────────────────────────────────────

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={cn("w-4 h-4", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

// ─── Nav items config ──────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: string;
  requiresAnalysis?: boolean;
  exact?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  {
    to: "/home",
    label: "Launchpad",
    icon: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
    exact: true,
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
    requiresAnalysis: true,
  },
  {
    to: "/dashboard/history",
    label: "History",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  {
    to: "/workspaces",
    label: "Workspaces",
    icon: "M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v3.75a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6",
  },
];

const BOTTOM_NAV: NavItem[] = [
  {
    to: "/dashboard/settings",
    label: "Settings",
    icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  },
];

// ─── Single nav item ──────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  analysisCompleted,
}: {
  item: NavItem;
  analysisCompleted: boolean;
}) {
  const location = useLocation();
  const isDisabled = item.requiresAnalysis && !analysisCompleted;

  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);

  if (isDisabled) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground cursor-not-allowed select-none"
        aria-disabled="true"
        title="Run an analysis first to access this view"
      >
        <Icon path={item.icon} />
        <span className="text-sm font-medium truncate">{item.label}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide font-semibold text-muted-foreground bg-muted/40 border border-border px-1.5 py-0.5 rounded-full">
          needs run
        </span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.exact}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150",
        isActive
          ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/[0.12]"
          : "text-muted-foreground hover:text-muted-foreground hover:bg-muted/60"
      )}
    >
      <Icon
        path={item.icon}
        className={isActive ? "text-primary" : "text-current"}
      />
      <span className="text-sm font-medium truncate">{item.label}</span>
      {isActive && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
    </NavLink>
  );
}

// ─── Context block ─────────────────────────────────────────────────────────────

function ContextBlock() {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  if (!workspace) return null;

  return (
    <button
      onClick={() => navigate("/workspaces")}
      className="w-full text-left px-4 py-3 border-b border-border hover:bg-muted/40 transition-colors group"
      title="Change active context"
    >
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
        Active context
      </p>
      {/* Contexto ativo = workspace, e so. `project`/`environment` sairam da identidade: nunca
          foram autoridade de tenant, e o eixo que os usava (analise inline) foi removido. */}
      <p className="text-xs font-semibold text-muted-foreground truncate leading-tight">
        {workspace.name}
      </p>
      {/* `text-primary` sobre `bg-primary/[0.08]` da 3,69:1 — abaixo de AA (4,5:1). O gate de
          contraste no DOM vivo pegou. A mesma cor do rotulo acima passa, entao o papel usa ela. */}
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-1.5">
        {workspace.role}
      </p>
    </button>
  );
}

// ─── Analysis status pill ──────────────────────────────────────────────────────

function AnalysisStatusPill() {
  const { analysisCompleted, result } = useAnalysis();
  const navigate = useNavigate();

  if (!analysisCompleted || !result) return null;

  return (
    <button
      onClick={() => navigate("/dashboard")}
      className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-success/[0.06] border border-success/[0.12] hover:bg-success/10 transition-colors"
      title="View active analysis results"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" aria-hidden="true" />
      <span className="text-[11px] font-medium text-success truncate flex-1">
        Analysis active
      </span>
      <Icon
        path="M8.25 4.5l7.5 7.5-7.5 7.5"
        className="w-3 h-3 text-success flex-shrink-0"
      />
    </button>
  );
}

// ─── User profile block ────────────────────────────────────────────────────────

function UserBlock() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    "User";

  const initials = (() => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  })();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="px-3 py-3 border-t border-border">
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-muted/60 transition-colors group">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-primary/[0.12] border border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-foreground">{initials}</span>
        </div>

        {/* Name / email */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground truncate leading-tight">
            {displayName}
          </p>
          {user?.email && displayName !== user.email && (
            <p className="text-[10px] text-muted-foreground truncate leading-tight">
              {user.email}
            </p>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Sign out"
          title="Sign out"
        >
          <Icon
            path="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
            className="w-3.5 h-3.5"
          />
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar inner content (shared between desktop + mobile drawer) ────────────

export function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { analysisCompleted } = useAnalysis();

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <SentinelaMark size={26} className="text-primary flex-shrink-0" />
          <span className="text-sm font-semibold tracking-tight text-foreground">Sentinela</span>
        </div>
      </div>

      {/* Context indicator */}
      <div onClick={onNavClick}>
        <ContextBlock />
      </div>

      {/* Primary nav */}
      <nav
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto min-h-0"
        aria-label="Primary navigation"
        onClick={onNavClick}
      >
        {PRIMARY_NAV.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            analysisCompleted={analysisCompleted}
          />
        ))}
      </nav>

      {/* Analysis active pill */}
      <div onClick={onNavClick}>
        <AnalysisStatusPill />
      </div>

      {/* Bottom nav */}
      <div className="px-3 pb-1 space-y-0.5" onClick={onNavClick}>
        {BOTTOM_NAV.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            analysisCompleted={true}
          />
        ))}
      </div>

      {/* User block */}
      <UserBlock />
    </div>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <aside className="w-[220px] flex-shrink-0 h-screen sticky top-0 hidden md:flex flex-col border-r border-border">
      <SidebarContent />
    </aside>
  );
}
