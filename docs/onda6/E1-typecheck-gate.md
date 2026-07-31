# Onda 6 — E1 · Gate de typecheck + status do `src_legacy`

## Gates rodados SEPARADAMENTE (item 9)

| Gate | Comando | Estado E1 |
|------|---------|-----------|
| Lint | `npm run lint` (ou escopado `eslint src/lib/v1 …`) | **verde** nos arquivos novos |
| Typecheck (canônico, ESTRITO) | `npm run typecheck` → `tsc -p tsconfig.v1.json --noEmit` | **verde (0 erros)** |
| Typecheck (legado, rastreio) | `npm run typecheck:legacy` → `tsc -p tsconfig.app.json --noEmit` | **vermelho: 34 erros pré-existentes** |
| Testes | `npm test` → `vitest run` | **verde: 19 arquivos / 86 testes** |
| Build | `npm run build` → `vite build` | **verde** (SWC não checa tipos) |

## Por que dois typechecks

O `vite build` usa SWC e **não** faz type-check — o app "buildava" com 34 erros de tipo latentes.
A E1 introduz um gate de tipo real, mas o `src` legado tem 34 erros **pré-existentes** (não
introduzidos pela E1). Rodar `tsc` sobre o projeto inteiro seria um gate permanentemente vermelho.

Decisão honesta:
- **`npm run typecheck`** = [`tsconfig.v1.json`](../../tsconfig.v1.json) — ESTRITO (`strict`,
  `noImplicitAny`, `strictNullChecks`, `noUnused*`), escopado à **camada canônica** (`src/lib/v1`),
  seus testes e fixtures. **Deve ficar verde** — é o gate da E1 e das etapas seguintes.
- **`npm run typecheck:legacy`** = `tsconfig.app.json` — projeto inteiro, nas configs FROUXAS já
  existentes (`strict:false`). Hoje **vermelho (34 erros)**; serve para **rastrear** a dívida, não
  como gate que passa.
- **Não** foi ligado `skipLibCheck` novo para esconder erros, **nem** afrouxada qualquer regra para
  mascarar; **nem** corrigido código legado (fora do escopo da E1).

## A dívida legada (34 erros, 14 arquivos) — `src_legacy`

Concentração no stack de **economics/decision** legado (o mesmo `getUsefulRate`/exports removidos
de `analysisAdapter` que derrubam `economicsRendering` — ver
[E1-baseline-quarantine.md](E1-baseline-quarantine.md)):

| Arquivo | Erros |
|---------|------:|
| `src/lib/economicsModel.ts` | 13 |
| `src/lib/decisionLayerModel.ts` | 5 |
| `src/lib/workspaces.ts` | 2 |
| `src/features/workspaces/WorkspacesPage.tsx` | 2 |
| `src/features/dashboard/interpretation/AIInterpretationPanel.tsx` | 2 |
| `src/adapters/analysisAdapter.ts` | 2 |
| `src/lib/dashboardModel.ts` | 1 |
| `src/features/launchpad/RecentRuns.tsx` | 1 |
| `src/features/history/RunDetailPage.tsx` | 1 |
| `src/components/dashboard-decision/EconomicsPanel.tsx` | 1 |
| `src/components/dashboard-decision/CoreMetricsRow.tsx` | 1 |
| `src/adapters/economicsAdapter.ts` | 1 |
| `src/test/homePageFlow.test.tsx` · `src/test/authFlows.test.tsx` | 1 + 1 (quarentena) |

**Dívida:** SENT-FE-E1-TC1 (sanear o stack economics/decision) e SENT-FE-E1-TC2 (elevar `src`
legado ao estrito por migração incremental, à medida que cada jornada passar para a camada
canônica). Nenhuma delas bloqueia a fundação da E1.

## Nota

`tsconfig.v1.json` inclui `src/vite-env.d.ts` para herdar a augmentação de `ImportMeta`
(`import.meta.env`) do próprio projeto — sem redefinir tipos de ambiente.
