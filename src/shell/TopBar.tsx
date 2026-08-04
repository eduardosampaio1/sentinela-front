import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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

// AQUI FICAVA `AnalysisFreshnessBadge` — o selo "Analysis · há N min" na barra superior.
//
// `if (!result) return null;` era a primeira linha, e `result` só nascia do cache do
// navegador. Sem o cache, o selo retornava `null` sempre. Componente inalcançável.

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
        "h-14 flex items-center justify-between px-6 border-b border-border bg-background flex-shrink-0",
        className
      )}
    >
      {/* Left: mobile hamburger + page label */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <MobileNav />
        <h2 className="text-sm font-semibold text-muted-foreground truncate">{label}</h2>
      </div>

      {/* Right: actions + badges + user */}
      <div className="flex items-center gap-3">
        {actions}


        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-foreground text-[10px] font-bold hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open user menu"
            >
              {userInitials(
                user?.user_metadata?.full_name as string | undefined,
                user?.email ?? undefined
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 bg-card border-border rounded-xl shadow-lg"
          >
            <DropdownMenuLabel className="text-muted-foreground font-normal py-3">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
              )}
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-muted" />

            <DropdownMenuItem
              onClick={() => navigate("/dashboard/settings")}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-muted" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
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
