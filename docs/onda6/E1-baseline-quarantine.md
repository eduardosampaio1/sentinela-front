# Onda 6 — E1 · Quarentena de baseline de testes

**Baseline:** sentinela-front `4255932` · worktree `onda6-e1-fundacao`
**Contexto:** o baseline já entregava **51 passed / 4 failed** ANTES de qualquer código da E1.
As 4 falhas são pré-existentes e **nenhuma** toca a camada canônica nova (`src/lib/v1/**`).

## Decisão

Quarentenar as 4 suítes legadas/dead-stack via `test.exclude` do vitest, para obter um
**baseline verde** que proteja o código novo — **sem** inventar fórmula de indicador, **sem**
consertar código legado (a E1 é proibida de tocar o cliente legado `lib/api` e telas legadas), e
**sem** esconder qualquer regressão introduzida pela E1.

- Fonte única: [`src/test/quarantine.ts`](../../src/test/quarantine.ts)
- Derivação do exclude: [`vitest.config.ts`](../../vitest.config.ts)
- Gate (dá dentes): [`src/test/v1/quarantine-gate.test.ts`](../../src/test/v1/quarantine-gate.test.ts)
  congela a lista em **exatamente 4** e exige que cada arquivo exista e **ainda contenha sua
  âncora** — consertar a suíte remove a âncora e o gate reprova, obrigando a retirada da quarentena.

## As 4 suítes

| # | Arquivo | Categoria | Causa-raiz (verificada) | Âncora | Dívida |
|---|---------|-----------|-------------------------|--------|--------|
| 1 | `src/test/authFlows.test.tsx` | dead-stack | Erro de coleção: importa `@/pages/Login` (removido; auth vivo em `features/auth/*`). `src/pages/` existe mas **não tem** `Login.tsx`. | `@/pages/Login` | SENT-FE-E1-Q1 |
| 2 | `src/test/homePageFlow.test.tsx` | dead-stack | Erro de coleção: importa `@/pages/HomePage` (substituído por `HomeWelcomePage`/`features/launchpad`). | `@/pages/HomePage` | SENT-FE-E1-Q2 |
| 3 | `src/test/economicsRendering.test.tsx` | dead-stack | `buildEconomicsPanelModel` (`@/lib/economicsModel`) quebra em runtime (`getUsefulRate is not a function`) e `CoreMetricsRow` exige `TooltipProvider` ausente. Indicador de economics legado fora de rota viva. | `buildEconomicsPanelModel` | SENT-FE-E1-Q3 |
| 4 | `src/test/apiErrorFormatting.test.ts` | legacy-contract | Fixa o formato de erro do cliente **legado** `lib/api`: espera `HTTP 500: Analysis backend authentication…` mas recebe `User session expired…` (session-expired mascara a msg de auth). A E1 é proibida de tocar o cliente legado; a substituição é a camada canônica `problem+json`. | `surfaces a readable backend auth configuration message` | SENT-FE-E1-Q4 |

## O que a E1 NÃO fez (de propósito)

- Não criou `@/pages/Login`/`@/pages/HomePage` para "passar" os testes 1–2 (seria ressuscitar
  telas mortas fora do escopo da fundação).
- Não corrigiu `getUsefulRate`/`economicsModel` inventando fórmula de indicador (proibido pela E1).
- Não mexeu no cliente legado `lib/api` (proibido pela E1) para "consertar" o teste 4.

## Saída da quarentena (E2+)

Cada ticket sai quando a jornada correspondente for migrada para a camada canônica ou a tela
legada for formalmente aposentada. Ao consertar/remover o arquivo, **retirar a entrada de
`src/test/quarantine.ts`** — o gate exige isso (a âncora deixa de existir).
