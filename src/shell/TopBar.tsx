import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";
import { formatRelativeTime } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Breadcrumb label map ─────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  "/home": "Launchpad",
  "/dashboard": "Dashboard",
  "/dashboard/analysis": "Analysis",
  "/dashboard/diagnostics": "Diagnostics",
  "/dashboard/guardrails": "Guardrails",
  "/dashboard/optimization": "Optimization",
  "/dashboard/history": "History",
  "/dashboard/settings": "Settings",
  "/workspaces": "Workspaces",
  "/profile": "Profile",
};

function useBreadcrumbs() {
  const location = useLocation();
  const label = ROUTE_LABELS[location.pathname] ?? null;
  return label;
}

// ─── Analysis freshness badge ─────────────────────────────────────────────────

function AnalysisFreshnessBadge() {
  const { result, dataSource } = useAnalysis();
  const navigate = useNavigate();

  if (!result) return null;

  const analyzedAt = result.analyzed_at;
  const relativeTime = analyzedAt ? formatRelativeTime(analyzedAt) : null;

  return (
    <button
      onClick={() => navigate("/dashboard")}
      className={cn(
        "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors",
        dataSource === "cached"
          ? "bg-[rgba(79,90,232,0.06)] border-[rgba(79,90,232,0.12)] text-[#4F5AE8] hover:bg-[rgba(79,90,232,0.10)]"
          : "bg-[rgba(52,211,153,0.06)] border-[rgba(52,211,153,0.12)] text-[#34D399] hover:bg-[rgba(52,211,153,0.10)]"
      )}
      title="View active analysis results"
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          dataSource === "cached" ? "bg-[#4F5AE8]" : "bg-[#34D399] animate-pulse"
        )}
        aria-hidden="true"
      />
      {relativeTime ? `Analysis · ${relativeTime}` : "Analysis active"}
    </button>
  );
}

// ─── User initials ────────────────────────────────────────────────────────────

function userInitials(name?: string, email?: string): string {
  const text = name ?? email ?? "?";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return text.slice(0, 2).toUpperCase();
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function TopBar({ title, actions, className }: TopBarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const contextLabel = useBreadcrumbs();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    "User";

  const label = title ?? contextLabel ?? "Sentinela";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header
      className={cn(
        "h-14 flex items-center justify-between px-6 border-b border-[rgba(255,255,255,0.06)] bg-[#070C18] flex-shrink-0",
        className
      )}
    >
      {/* Left: mobile hamburger + page label */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <MobileNav />
        <h2 className="text-sm font-semibold text-[#94A3B8] truncate">{label}</h2>
      </div>

      {/* Right: actions + badges + user */}
      <div className="flex items-center gap-3">
        {actions}

        <AnalysisFreshnessBadge />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-8 h-8 rounded-full bg-[rgba(79,90,232,0.10)] border border-[rgba(79,90,232,0.18)] flex items-center justify-center text-[#4F5AE8] text-[10px] font-bold hover:bg-[rgba(79,90,232,0.18)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F5AE8]/40"
              aria-label="Open user menu"
            >
              {userInitials(
                user?.user_metadata?.full_name as string | undefined,
                user?.email
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 bg-[#0D1525] border-[rgba(255,255,255,0.08)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            <DropdownMenuLabel className="text-[#94A3B8] font-normal py-3">
              <p className="text-sm font-semibold text-[#F1F5F9] truncate">{displayName}</p>
              {user?.email && (
                <p className="text-xs text-[#94A3B8] truncate mt-0.5">{user.email}</p>
              )}
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.06)]" />

            <DropdownMenuItem
              onClick={() => navigate("/dashboard/settings")}
              className="text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.06)] rounded-lg cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.06)]" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-[#F87171] hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.08)] rounded-lg cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
              </svg>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
