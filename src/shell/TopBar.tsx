import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
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

// M31 - `/dashboard/settings` saiu daqui junto com o item de menu que levava ate la. A rota
// continua registrada no router (superficie legada), mas nenhuma UI a oferece nem a nomeia.
const ROUTE_LABELS: Record<string, string> = {
  "/home": "Launchpad",
  "/dashboard": "Dashboard",
  "/dashboard/analysis": "Analysis",
  "/dashboard/diagnostics": "Diagnostics",
  "/dashboard/guardrails": "Guardrails",
  "/dashboard/optimization": "Optimization",
  "/dashboard/history": "History",
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
  const { t } = useLanguage();
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
              // M31 — o rótulo estava cravado em inglês, e o percurso de teclado numa tela em
              // PT-BR lia "Menu do usuário" seguido de "Open user menu". Só o nome foi traduzido:
              // este gatilho DUPLICA o menu do rodapé da barra lateral (M25), e resolver a
              // duplicação é decisão de IA do shell, reportada e não tomada aqui.
              aria-label={t("shell.user.menu")}
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
              onClick={handleSignOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
              </svg>
              {t("shell.user.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
