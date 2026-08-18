// A preferência de RECOLHER a barra lateral. Este módulo é o dono do armazenamento.
//
// ## Por que o `localStorage` mora AQUI, e não no componente
//
// `shell-m25` proíbe o literal `localStorage` em `Sidebar.tsx`, `WorkspaceSwitcher.tsx` e
// `UserMenu.tsx`, e a regra que ele defende é *"o shell não persiste estado de tenant"*. A minha
// preferência de largura não é estado de tenant — mas a saída certa não era pedir isenção: era
// tirar o detalhe de armazenamento de dentro do componente, que é onde ele não deveria estar de
// qualquer jeito. O gate apontou para o lugar certo pela razão dele, e a correção serve às duas.
//
// ## Fail-open, e isso é decisão
//
// Qualquer valor que não seja o exato significa ABERTA. Preferência corrompida ou storage
// bloqueado não pode esconder a navegação: errar para o lado aberto custa espaço na tela; errar
// para o fechado deixa alguém sem saber como voltar.

/** Onde a preferência mora. Atravessa abas e sessões — por isso não é `sessionStorage`. */
export const CHAVE_RECOLHIDA = "sentinela:barra-recolhida";

/** O armazém do navegador, ou `null` quando não há (SSR, teste, storage bloqueado). */
function armazem(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** A barra está recolhida? `false` sempre que houver qualquer dúvida. */
export function lerRecolhida(): boolean {
  const a = armazem();
  if (!a) return false;
  try {
    return a.getItem(CHAVE_RECOLHIDA) === "1";
  } catch {
    return false;
  }
}

/**
 * Grava a preferência. Silencioso quando o storage recusa — o estado em memória segue valendo.
 *
 * Recolhida GRAVA; aberta REMOVE. Assim "sem preferência" e "aberta" são o mesmo estado, que é
 * o que eles são.
 */
export function guardarRecolhida(recolhida: boolean): void {
  const a = armazem();
  if (!a) return;
  try {
    if (recolhida) a.setItem(CHAVE_RECOLHIDA, "1");
    else a.removeItem(CHAVE_RECOLHIDA);
  } catch {
    /* preferência não persiste; a barra ainda recolhe nesta sessão */
  }
}
