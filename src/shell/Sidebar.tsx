import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { guardarRecolhida, lerRecolhida } from "./larguraDaBarra";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { SentinelaMark } from "@/components/brand/SentinelaMark";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { UserMenu } from "./UserMenu";
import { PRIMARY_NAV, type NavItem } from "./navegacao";

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

// ─── Single nav item ──────────────────────────────────────────────────────────

// `analysisCompleted` SAIU dos parâmetros, e com ele o item desabilitado.
//
// Ele vinha de `hasHistory || Boolean(result)` — autorização INDIRETA: "o workspace já teve
// análise" não é "existe resultado para mostrar agora". Desabilitar o Dashboard por esse
// critério errava nos dois sentidos: bloqueava quem tinha resultado e liberava quem não tinha.
//
// `/dashboard` agora é rota de compatibilidade: ela mesma pergunta ao backend e decide entre
// redirecionar e mostrar estado vazio. Não há o que desabilitar.
function SidebarNavItem({
  item,
  recolhida = false,
}: {
  item: NavItem;
  readonly recolhida?: boolean;
}) {
  const location = useLocation();
  const { t } = useLanguage();

  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);

  // O ramo "desabilitado" (com o selo `needs run`) saiu junto com `analysisCompleted`. Todo
  // item de navegação é um link agora; quem decide se há o que mostrar é o destino, com base
  // no backend.
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      title={recolhida ? t(`shell.nav.${item.labelSuffix}`) : undefined}
      className={cn(
        // `min-h-11` = 44px, a régua de alvo de toque desta casa — a mesma que a barra de
        // portas já usa. Medido antes: estes itens tinham **36px**, e o do usuário 40px.
        "flex min-h-11 items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150",
        recolhida && "justify-center",
        // M31 — o RÓTULO do item ativo não é mais `text-primary`. O axe-core mediu 3,44:1
        // (`#4f59e8` sobre `#0d1328`) contra os 4,5:1 que a AA exige para texto normal: o item
        // que marca "você está aqui" era o menos legível da barra. O identificador de ativo não
        // dependia da cor do texto — continua no fundo, no anel, no ícone e no ponto à direita,
        // que são quatro canais, nenhum deles texto. Nada do tema foi reaberto (D23).
        isActive
          ? "bg-primary/10 text-foreground ring-1 ring-inset ring-primary/[0.12]"
          : "text-muted-foreground hover:text-muted-foreground hover:bg-muted/60"
      )}
    >
      <Icon
        path={item.icon}
        className={isActive ? "text-primary" : "text-current"}
      />
      {/* Recolhido, o rótulo sai da TELA e não da ÁRVORE: `sr-only` mantém o nome para leitor
          de tela, e o link continua tendo nome acessível. Removê-lo deixaria um link só com
          ícone — o "mystery meat" que a régua desta casa proíbe. */}
      <span className={recolhida ? "sr-only" : "text-sm font-medium truncate"}>
        {t(`shell.nav.${item.labelSuffix}`)}
      </span>
      {isActive && !recolhida && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
    </NavLink>
  );
}

// ─── Blocos extraídos ──────────────────────────────────────────────────────────
//
// `ContextBlock` e `UserBlock` viviam aqui e saíram na M25, cada um por um motivo próprio.
//
// O `ContextBlock` imprimia `{workspace.role}` sob o nome do workspace — o papel como TEXTO na
// tela, que é exatamente o que a D3 proíbe ("não mostrar 'Admin' em badge, chip, seletor ou
// texto"). E o que ele oferecia como troca de escopo era um `navigate("/workspaces")`: mudar de
// página, não trocar de tenant. Virou `WorkspaceSwitcher`, que troca de verdade e alcança o seam
// de descarte de cache que até aqui não tinha chamador de produção.
//
// O `UserBlock` mostrava nome, e-mail e um botão de sair — e nenhuma saída para a conta, apesar
// de a capacidade existir desde a M02. Virou `UserMenu`, com o link do Account Console (D19).
//
// AQUI FICAVA TAMBÉM `AnalysisStatusPill` — o selo "Analysis active". Ele só aparecia com
// `result` preenchido, e `result` só era preenchido pelo cache do navegador: UI inalcançável.

// ─── Sidebar inner content (shared between desktop + mobile drawer) ────────────

export function SidebarContent({
  onNavClick,
  recolhida = false,
}: {
  onNavClick?: () => void;
  /** No desktop recolhido só os ícones ficam. O drawer do mobile nunca recolhe. */
  readonly recolhida?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Logo */}
      <div
        className={`h-14 flex items-center border-b border-border flex-shrink-0 ${
          recolhida ? "justify-center px-0" : "px-5"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <SentinelaMark size={26} className="text-primary flex-shrink-0" />
          {/* O símbolo fica; o nome sai da tela. `sr-only` e não removido — o cabeçalho continua
              precisando dizer de que produto se trata. */}
          <span
            className={
              recolhida ? "sr-only" : "text-sm font-semibold tracking-tight text-foreground"
            }
          >
            Sentinela
          </span>
        </div>
      </div>

      {/* Escopo de tenant — SEMPRE visível, inclusive quando não há workspace ativo. */}
      {/* O seletor de workspace é TEXTO por natureza — o nome do tenant. Recolhido ele não tem
          forma de ícone que não minta sobre qual workspace está ativo, então sai. Quem precisa
          trocar de escopo expande a barra, e o gatilho está sempre visível. */}
      {recolhida ? null : <WorkspaceSwitcher onNavigate={onNavClick} />}

      <nav
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto min-h-0"
        aria-label={t("shell.nav.primary")}
        onClick={onNavClick}
      >
        {PRIMARY_NAV.map((item) => (
          <SidebarNavItem key={item.to} item={item} recolhida={recolhida} />
        ))}
      </nav>

      <UserMenu recolhida={recolhida} />
    </div>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function Sidebar() {
  const { t } = useLanguage();
  const [recolhida, setRecolhida] = useState(lerRecolhida);

  function alternar() {
    setRecolhida((v) => {
      const proxima = !v;
      guardarRecolhida(proxima);
      return proxima;
    });
  }

  return (
    // RECOLHER, e não esconder: a barra encolhe para os ícones em vez de sumir. Uma barra que
    // some leva junto o gatilho de voltar, e a pessoa fica sem saber que ela existe — que é o
    // mesmo defeito das telas de Conta e Perfil, alcançáveis só por endereço digitado.
    <aside
      data-recolhida={recolhida ? "true" : "false"}
      className={`${
        recolhida ? "w-[60px]" : "w-[220px]"
      } flex-shrink-0 h-screen sticky top-0 hidden md:flex flex-col border-r border-border transition-[width] duration-200`}
    >
      <SidebarContent recolhida={recolhida} />
      {/* O gatilho fica no PÉ e sempre visível, aberta ou recolhida. No topo ele disputaria com
          a marca; escondido atrás de hover, sumiria para quem navega por teclado. */}
      <button
        type="button"
        onClick={alternar}
        aria-expanded={!recolhida}
        aria-label={recolhida ? t("shell.sidebar.expand") : t("shell.sidebar.collapse")}
        title={recolhida ? t("shell.sidebar.expand") : t("shell.sidebar.collapse")}
        // `min-h-11`: alvo de toque abaixo de 44px já reprovou nesta casa.
        className="flex min-h-11 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true" className="text-xs">
          {recolhida ? "››" : "‹‹"}
        </span>
      </button>
    </aside>
  );
}
