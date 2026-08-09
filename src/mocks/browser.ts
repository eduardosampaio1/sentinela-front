// M16 — o MSW no BROWSER, ligado por env e por mais nada.
//
// ## O que a arquitetura exige
//
// `MSW OFF → Gateway`, **sem tocar em componente**. Nenhuma tela pode saber se o dado veio de um
// mock ou do backend: no instante em que uma UI pergunta isso, o mock deixa de ser andaime e vira
// caminho de produção com outro nome — e aí a demo funciona, o cliente fecha, e o defeito aparece
// quando alguém confere o número.
//
// ## Por que a base vem de `resolveGatewayBaseUrl()`
//
// É a MESMA função que `getV1Client()` usa. Se o worker montasse handlers numa base própria, ele
// interceptaria um endereço que o cliente não chama: o mock ficaria inerte, as requisições iriam
// para a rede, e a tela mostraria erro de conexão com o worker "ligado". Lendo da mesma fonte,
// divergir é impossível — não por disciplina, por construção.
//
// ## O cadeado
//
// Este módulo é `import()`-ado por `main.tsx` sob `import.meta.env.DEV`, que é o literal `false`
// em build de produção. O Rollup elimina o ramo, e nem este arquivo nem `msw` entram no bundle.
// A segunda condição, `VITE_SENTINELA_MOCK`, é a variável do DoD: ela e mais nada decide entre
// mock e Gateway.

import { makeJourneyHandlers } from "@/test/msw/journey";
import { resolveGatewayBaseUrl } from "@/lib/v1/defaultClient";

/** O valor que liga o mock. Qualquer outro — inclusive ausente — significa Gateway real. */
export const VALOR_LIGADO = "on";

/**
 * O mock está ligado?
 *
 * Fail-closed nos dois eixos: exige DEV **e** o valor exato. Uma variável mal escrita
 * (`VITE_SENTINELA_MOCK=true`) não liga o mock por engano — e é melhor assim, porque um mock que
 * liga sozinho é mais perigoso que um que não liga: o segundo você percebe na hora.
 */
export function mockLigado(): boolean {
  return (
    import.meta.env.DEV && String(import.meta.env.VITE_SENTINELA_MOCK ?? "") === VALOR_LIGADO
  );
}

/**
 * Monta o service worker sobre a base que o cliente canônico realmente usa.
 *
 * `onUnhandledRequest: "bypass"` — o worker intercepta o Gateway e deixa passar todo o resto
 * (HMR do Vite, fontes, o próprio Keycloak). `"error"` aqui derrubaria o dev server; no `node.ts`
 * dos testes o oposto é o certo, e é por isso que os dois lados não compartilham essa opção.
 */
export async function iniciarMockDoBrowser(): Promise<void> {
  const { setupWorker } = await import("msw/browser");
  const worker = setupWorker(...makeJourneyHandlers(resolveGatewayBaseUrl()));
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });
}
