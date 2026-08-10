import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";

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

// AQUI FICAVA O SEGUNDO MENU DE USUARIO.
//
// A M31 mediu: o percurso de teclado da RES-01 lia "Menu do usuario" DUAS vezes seguidas, porque
// este gatilho duplicava o `UserMenu` do rodape da barra lateral. Ele ainda oferecia
// `/dashboard/settings` -- rota legada que a IA de shell decidida na M25 tirou da navegacao -- e
// os rotulos "Settings" e "Sign out" estavam cravados em ingles.
//
// Decisao de owner congelada em 2026-08-10: o unico menu canonico de usuario e o `UserMenu` da
// barra lateral. Isto NAO autoriza criar `/settings` nem uma segunda implementacao de Account
// Console; e remocao de duplicidade, encerrando a divida conhecida da M31.

// ─── TopBar ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function TopBar({ title, actions, className }: TopBarProps) {
  const contextLabel = useBreadcrumbs();

  const label = title ?? contextLabel ?? "Sentinela";

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


      </div>
    </header>
  );
}
