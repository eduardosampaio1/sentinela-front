# FREEZE · ESTADOS V1 — o inventário congelado do Front

**Data:** 2026-08-16 · **Repo:** `sentinela-front-e1` · **Branch:** `develop`
**Sem push · sem deploy · sem Railway.**

**Base medida:** `4c47194` (fecho da M47). O commit deste freeze acrescenta **apenas** o gate de
vocabulário e este documento — nenhuma linha de produto. Os números da §5 foram medidos sobre
`4c47194`; os da §1 valem a partir daqui, porque o gate que os sustenta nasce neste commit.

---

## 0. O que este documento é

Um freeze neste programa não é uma promessa: é um **par** — um número escrito aqui e um gate que
reprova quando ele muda. Um documento sozinho envelhece em silêncio, que é exatamente o defeito que
a M45 passou oito tranches perseguindo.

Cada linha das tabelas abaixo aponta para o gate que a sustenta. O que não tem gate está na §6,
declarado como **NÃO CONGELADO** — porque "não medido" e "congelado" não podem ser a mesma coluna.

---

## 1. O vocabulário de estados — congelado nesta missão

O programa gira em torno de estados. As lições mais caras são todas sobre eles: `ausência ≠
indisponibilidade ≠ não medido`, `503 não vira "não existe"`, `retenção por privacidade ≠ falha`,
`vazio ≠ erro ≠ carregando`.

E o vocabulário — **quais estados existem** — não tinha gate. Ele mora em três uniões de tipo, e
tipo não reprova: acrescentar `"paused"` compila, passa em tudo, e cai no `default` de um `switch`
renderizando a tela errada. Foi assim que a M14 achou `needs_mapping` no `default` do `AnalysisPage`.

### 1.1 `EstadoPublico` — o ciclo de vida da análise (8)

`preparing` · `receiving` · `queued` · `running` · `recovering` · `needs_mapping` · `completed` ·
`failed`

### 1.2 `EstadoDeEixo` — os quatro eixos de progresso (10)

`pending` · `running` · `ready` · `partial` · `withheld` · `failed` · `unknown` · `unavailable` ·
`preparing` · `expired`

### 1.3 `AnalyticsComponentStatus` — do CONTRATO, não do Design System (5)

`ready` · `partial` · `withheld` · `failed` · `unknown`

> `unknown` carrega a distinção mais cara do programa: **nada está sendo afirmado** não é
> **falhou**. `unavailable` ≠ `unknown` ≠ `withheld` pela mesma razão.

**Gate:** [src/test/v1/freeze-estados.test.ts](src/test/v1/freeze-estados.test.ts) — lê as uniões do
arquivo de origem (não uma cópia), compara com o inventário, e reprova nos **dois** sentidos.
Inclui piso de instrumento: extrator cego devolveria lista vazia, e `[] === []` aprovaria qualquer
vocabulário.

**Também congelado:** os três vocabulários só compartilham `preparing`, `running` e `failed`. Um
nome novo em dois deles é ou redundância, ou duas coisas com o mesmo nome — e aí a tela mente.

---

## 2. Superfícies e cobertura

| invariante | valor | gate |
|---|---|---|
| rotas no router | **39** | `matriz-cobre-o-router.test.ts` |
| rotas com journey ou motivo escrito | **39 / 39** | idem |
| dívida de cobertura declarada | **0** | idem |
| journeys na matriz transversal | **35** | `e2e/m45-matriz.spec.ts` |
| superfícies sem `<main>` | **0** | matriz · G1 + G5 |

---

## 3. Acessibilidade

| invariante | valor | gate |
|---|---|---|
| nós reprovados em WCAG 2 AA | **6** | matriz · G7 + G1-bis (`toBe(6)`) |
| — textura (numeral-fantasma, 1.04:1) | 3 | isenção escrita |
| — logotipo de fornecedor (WCAG 1.4.3) | 3 | isenção escrita |
| marcadores `data-overflow-ok` | **2**, nominais | matriz · catraca do marcador |

Os 6 são isenções **contadas**, não silenciadas: `aria-hidden` não zera o `color-contrast` do axe, e
está certo que não zere — o texto segue visível para quem enxerga.

---

## 4. Estrutura e dívida técnica

| invariante | valor | gate |
|---|---|---|
| entradas na baseline anti-monólito | **1** (`massasV2.ts`, 1035L) | `anti-monolito.test.ts` |
| maior arquivo de página | **236L** (`secoes-problema.tsx`) | idem |
| cor literal declarada · landing | **54** (7 arquivos) | `hardcodeDeclarado.ts` |
| cor literal declarada · aion | **20** (5 arquivos) | idem |
| timing literal declarado | **6** (3 arquivos) | `motion-tokens.test.tsx` |
| erros de eslint | **0** | `lint-catraca.test.ts` |
| warnings de eslint | **≤ 14** | idem |
| vocabulário RES-01 × ANL-01 | **unificado** | `vocabulario-unico.test.ts` |

---

## 5. O estado das provas, no HEAD congelado

| | |
|---|---|
| `npm run typecheck` | **APROVADO** — 6 projetos, 394 arquivos |
| `npx vitest run` | **1683 / 1683** em 122 arquivos |
| `npx playwright test` | **390 / 390** em 34 specs |
| capturas versionadas | **103** — nenhuma duplicata (`evidencia-sem-duplicata`) |
| campanhas de mutação | **13** drivers, todas com 100% de morte |
| DOC-CLOSEs | **13** |

---

## 6. NÃO CONGELADO — o que este freeze deliberadamente não cobre

Congelar o que não está medido seria transformar ignorância em garantia. Estes itens seguem
abertos, e **é assim que devem ser lidos**:

1. **A renderização de cada estado, um a um.** O vocabulário está congelado; a cobertura de
   renderização é dos gates de jornada, da matriz e das capturas — que cobrem os estados
   principais, não a matriz completa de 8 × 10 × 5 combinações. Ninguém afirmou que ela é completa.
2. **A busca por identificador.** Não existe no produto. Levantada na M45.2, decisão do owner foi
   não encaminhar.
3. **A captura de Analytics retido de RES-01** que renderiza idêntica em `ready` e `withheld`. Duas
   causas testadas, nenhuma explicou. Estado **NÃO MEDIDO**, com a pergunta aberta.
4. **A decomposição dos demais arquivos acima de 400 linhas** — 20 deles, quase todos massa de
   teste e contrato gerado. A régua do gate é 1000, não 400; a diferença entre as duas é dívida
   conhecida e não endereçada.
5. **`massasV2.ts`** (1035L) — a última entrada da baseline, massa de teste do `analysis-result-v2`.

---

## 7. Como retomar

1. Ler este documento e o [DOC-CLOSE da M47](docs/m47/DOC-CLOSE-M47.md), nessa ordem.
2. Rodar a pilha com `SENTINELA_CONTRACT_ORIGIN=../sentinela-facts/docs/contracts` — **sem ela, 14
   testes falham e 11 pulam**, e pulado não é passou.
3. Qualquer número desta página que divergir do medido: **o número está errado ou o produto
   regrediu**, e os dois exigem alguém olhar. Nenhum deles se resolve editando esta tabela.

---

`NÃO MEDIDO ≠ VERDE` · `NÃO CORRIGIDO ≠ NÃO CONTADO` · `NÃO OLHADO ≠ NÃO EXISTE`

E o que o freeze acrescenta: **congelado é o que tem gate.** O resto é a §6.
