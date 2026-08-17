import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";

// ─── Breadcrumb label map ─────────────────────────────────────────────────────

// AQUI FICAVA `ROUTE_LABELS` — nove rótulos de rota cravados em inglês, e o `useBreadcrumbs` que
// os lia.
//
// ## Por que sair em vez de traduzir
//
// A troca do registro desta faixa para caixa alta puxou o olho para eles, e eu ia traduzir as nove
// entradas. Fui conferir contra o router primeiro, e nenhuma era alcançável:
//
//   `/dashboard/analysis`, `/diagnostics`, `/guardrails`, `/optimization`, `/history`
//       são `<Navigate>`. O rótulo não pode aparecer, porque ninguém fica na rota.
//
//   `/home`, `/profile`, `/workspaces`, `/dashboard`
//       as quatro páginas passam `topBarTitle` do dicionário. O mapa ficava na sombra delas.
//
// Nove entradas, zero alcançáveis. Traduzir teria produzido copy órfã em dois idiomas — o mesmo
// defeito de `account.workspaces`, que esta sessão já apagou por não ter consumidor.
//
// ## O defeito de verdade estava em OUTRO lugar
//
// Quatro usos de `AppShell` caíam através do mapa sem estar nele: `/instances` e
// `/instances/:id`. Eles chegavam ao último fallback e a faixa deles dizia **"Sentinela"** em vez
// de "Instâncias" — em qualquer idioma. As duas páginas passaram a declarar `shell.nav.instances`,
// que é o MESMO rótulo da barra lateral: um ato, um nome.
//
// O fallback final continua "Sentinela", e ele não é string cravada no sentido da regra: é o nome
// da marca, e marca não se traduz.

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
  // Só duas fontes agora: o título que a página declara, ou o nome da marca. O intermediário
  // (`ROUTE_LABELS`) era inalcançável — ver a nota no topo do arquivo.
  const label = title ?? "Sentinela";

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
        {/* O REGISTRO da faixa passa a ser o do prototipo: mono, caixa alta, entrelinha aberta.
              Vem do papel `micro` do sistema — a classe nao e escrita aqui, senao a proxima tela
              faria diferente e a densidade voltaria a divergir por superficie.

              O que NAO entrou: o losango de marca que o prototipo tinha antes do nome. A barra
              lateral ja carrega a marca e o nome "Sentinela"; um segundo losango a tres centimetros
              do primeiro e identidade repetida, nao hierarquia.

              `truncate` fica: rotulo de rota longa em 375px empurrava as acoes para fora. */}
          <h2 className="truncate font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </h2>
      </div>

      {/* Right: actions + badges + user */}
      <div className="flex items-center gap-3">
        {actions}


      </div>
    </header>
  );
}
