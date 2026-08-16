// A porta de NAVEGAÇÃO MANUAL — só existe em dev, e só sob a marca do modo de navegação.
//
// ## O problema que ela resolve
//
// O bypass de autenticação (`src/e2e/bypass.ts`) exige `window.__SENTINELA_E2E_AUTH__ === true`
// **no instante do boot**, antes de `main.tsx` decidir qual caminho seguir. Um teste consegue isso
// com `addInitScript`; uma pessoa com o navegador aberto não consegue — o console do devtools roda
// depois que o módulo já executou, e um `reload` apaga a propriedade.
//
// Resultado prático: as onze superfícies públicas eram navegáveis à mão, e as vinte e quatro de
// produto não. Quem quisesse VER o produto tinha de rodar Playwright.
//
// ## Por que isto não afrouxa o cadeado
//
// O cadeado do bypass tem três condições, e as duas primeiras são a garantia de produção:
//
//   1. `import.meta.env.DEV` — literal `false` em build de produção;
//   2. `VITE_E2E === "true"` — marca explícita do dev server.
//
// A terceira (a bandeira no `window`) nunca foi uma barreira de segurança: é o opt-in POR TESTE,
// para que o mesmo dev server sirva o cenário autenticado e o não-autenticado. Este módulo dá a
// uma pessoa a mesma escolha que uma spec já tem — e repete as duas primeiras condições, de modo
// que em produção o corpo inteiro é eliminado pelo Rollup e nada aqui chega ao bundle.
//
// ## Como se usa
//
//   ?e2e=1   entra (grava a marca na sessão da aba e recarrega a decisão a cada navegação)
//   ?e2e=0   sai   (apaga a marca — `/login` volta a ser o caminho, no MESMO servidor)
//
// A marca vive em `sessionStorage`: morre ao fechar a aba, e não atravessa para outra. Fosse
// `localStorage`, uma sessão de validação de ontem decidiria o que você vê hoje.

const CHAVE = "sentinela:navegacao-manual";

if (import.meta.env.DEV && import.meta.env.VITE_E2E === "true") {
  try {
    const parametro = new URLSearchParams(window.location.search).get("e2e");
    if (parametro === "1") sessionStorage.setItem(CHAVE, "1");
    if (parametro === "0") sessionStorage.removeItem(CHAVE);

    if (sessionStorage.getItem(CHAVE) === "1") {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    }
  } catch {
    // `sessionStorage` pode lançar (modo privado, storage desabilitado). Falhar aqui significa
    // "não autenticado", que é o padrão correto: a porta é fail-closed como o cadeado que ela usa.
  }
}

export {};
