# DOC-CLOSE · M46 — pagar a dívida que a M45 mediu

**Missão:** M46 · **Origem:** decisões do owner ao fechar a umbrella M45 · **Estado:** FECHADA
**Sem push · sem deploy · sem Railway.**

---

## 1. O mandato

A M45 terminou entregando um número: **159 nós de a11y** reprovados em WCAG AA, oito superfícies sem
`<main>`, uma dívida de cobertura declarada, três nomes divergentes e nove erros de lint. Tudo
contado, travado por catraca — e nada corrigido.

O owner escolheu **zerar os quatro focos**, pagar a dívida de cobertura e encaminhar dois herdados.
Esta missão faz isso.

---

## 2. A11y: 159 → 6, e quase tudo era TOKEN

| foco | antes | depois | o que era |
|---|---|---|---|
| `/aion` | **76** | 0 | **uma linha**: `A.muted = #64748B` |
| template legal (`/terms`+`/privacy`+`/security`) | 27 | 0 | **um template** servindo três documentos |
| landing | 43 | **6** | `C.ghost`+`C.subtle` (26) + status/acento (11) |
| `/profile`, `/error`, 404, `/login` | 13 | 0 | o mesmo `#475569` em três arquivos |
| **total** | **159** | **6** | |

O achado que barateou tudo: **os monólitos centralizam cor em objetos de token.** `/aion` tinha 76
nós num só valor — não eram 76 defeitos, era um token usado 76 vezes, medindo entre 3.32:1 e 3.97:1
contra os seis fundos da página. Trocado para `#8695AD` (5.22:1 no pior fundo), os 76 caíram juntos.

Os três documentos legais somavam 27 pela mesma razão: um `LegalPage.tsx` com `opacity: 0.7` sobre
o cinza (4.24:1), o acento como texto (4.15:1) e um `ghost` a 35% de alfa (3.15:1).

**Todas as 12 superfícies passaram a ter `<main>`.** Os oito landmarks ausentes viraram zero.

### 2.1 Os 6 que ficam, e por que ficam

- **3 · numeral-fantasma** dos cards de passo (`rgba(255,255,255,0.025)`, 72px). É textura: a 1.04:1
  ninguém o lê, e é esse o efeito. O mesmo número aparece legível logo abaixo em "Step N".
- **3 · monogramas de marca** dos fornecedores de LLM (`#1877F2` Meta, `#4E6EF2` DeepSeek,
  `#8B6CF7` Qwen). A **WCAG 1.4.3 isenta logotipo** de piso de contraste, e o nome do modelo está
  escrito ao lado.

Os dois grupos ganharam `aria-hidden` — mas **continuam contados**. `aria-hidden` não silencia o
`color-contrast` do axe, e está certo que não silencie: o texto segue visível para quem enxerga.
Isenção da norma não é motivo para parar de medir.

---

## 3. O defeito que só apareceu porque o `<main>` chegou

O gate de responsive varre `main *`. **Oito superfícies não tinham `<main>`** — para elas o laço
percorria zero elementos e o gate passava **por vacuidade**. Verde por não ter o que medir.

Com os landmarks no lugar, ele mediu pela primeira vez e achou um defeito real:

> **`/aion` rolava 226px na horizontal no celular.** Um item de flex sem `min-w-0` recusando-se a
> encolher abaixo de `/v1/chat/completions`.

Corrigido. O defeito existia desde sempre.

### 3.1 O gate também estava grosso demais

A landing acusou 2947px. **Não era defeito**: `document.scrollWidth - clientWidth` é **0** nas três
larguras. Era a esteira de modelos (`max-content`, animada dentro de um contêiner que recorta) e
orbes de blur posicionados de propósito para fora do card.

A saída **não** foi "ignorar quem tem ancestral que recorta" — isso reabriria o buraco que motivou
medir geometria (no `AppShell`, um `min-w-[2000px]` também tem ancestral que recorta). Foram duas
mudanças precisas:

1. **`overflow-x: auto|scroll` isenta; `hidden` não.** Com `auto` o conteúdo continua ALCANÇÁVEL —
   é o padrão certo para bloco de código. Com `hidden` ele é cortado em silêncio.
2. **`data-overflow-ok`**, marcador explícito para os dois casos intencionais, com catraca nominal
   lida do **código-fonte** (não do DOM: no DOM, o furo estaria justamente em quem não é visitado).

---

## 4. Cobertura, vocabulário e lint

- **`/analyses/compare/:a/:b`** entrou na matriz (**J35**). Era a única dívida de cobertura
  declarada pela M45.8, e o motivo dela — *"tem suíte própria"* — é exatamente o argumento que a
  M45.8 refutou. A dívida de cobertura é **zero**: 39 de 39 rotas.
- **Vocabulário único** ([src/test/v1/vocabulario-unico.test.ts](src/test/v1/vocabulario-unico.test.ts)):
  RES-01 alinhada a ANL-01 em três conceitos. O gate achou uma **quarta divergência que eu ia
  criar** — em PT a visão viva diz "Exportar", não "Export".
  **Nota de registro:** o DOC-CLOSE da M45.3 recomendava *não* alinhar. O owner decidiu o
  contrário, e esta missão segue a decisão dele.
- **Lint 9 erros → 0.** Oito corrigidos de verdade (um ternário-comando, quatro `any`, três
  `require()`); o nono virou um alias com nome, um `eslint-disable` e o motivo escrito.
  Catraca em [src/test/v1/lint-catraca.test.ts](src/test/v1/lint-catraca.test.ts).

---

## 5. A catraca anti-monólito recusou o meu próprio trabalho

As correções somavam ~44 linhas de comentário e wrapper aos dois monólitos. O gate reprovou:
*"monólito legado cresceu; a dívida só pode encolher"*.

Ele estava certo, e o caminho não era subir o teto. Os blocos de tokens saíram para `tokens.ts` ao
lado de cada página:

| arquivo | antes | depois |
|---|---|---|
| `LandingPage.tsx` | 1215 | **1182** |
| `AionPage.tsx` | 1180 | **1167** |

E o gate de cor literal provou que foi **mudança, não crescimento** — as somas conservam os números
exatos: landing 54 + 24 = **78** (era 78), aion 20 + 13 = **33** (era 33). Nenhum literal novo.

Os tetos desceram junto. E os tokens agora moram num arquivo de 60 linhas, onde dá para revisar —
que é o oposto de `#64748B` reprovando 76 nós no meio de 1200 linhas sem ninguém notar.

---

## 6. Um comentário que virou configuração

A catraca de lint precisava rodar o eslint fora do `jsdom`. Escrevi um parágrafo explicando **por
que não dava para usar o docblock de ambiente do vitest** — e citei o token literal.

O vitest procura esse token por regex no **arquivo inteiro, inclusive dentro de comentário**. A
minha explicação de por que aquilo não funcionaria **ligou** aquilo, e o erro que apareceu foi
exatamente o que o parágrafo descrevia.

Está registrado no próprio arquivo, com um aviso para o próximo.

---

## 7. Campanha de mutação — 6/6 mortas

[docs/m46/mutacoes_m46.py](docs/m46/mutacoes_m46.py)

| # | mutação | assassino real |
|---|---|---|
| 1 | `A.muted` volta a `#64748B` | G7 · J25 axe |
| 2 | `/aion` perde o `min-w-0` | G5 mobile |
| 3 | `AuthShell` perde o `<main>` | G1 · J23/J28/J29 (+49 por cascata) |
| 4 | `data-overflow-ok` se espalha | catraca nominal do marcador |
| 5 | RES-01 volta a divergir | vocabulário · "série temporal" |
| 6 | um `any` volta | catraca do lint |

---

## 8. Stack de qualidade

| gate | resultado |
|---|---|
| `npm run typecheck` | **APROVADO** — 6 projetos, **377** arquivos |
| `npx vitest run` | **121/121** arquivos · **1678/1678** testes |
| `npx playwright test` | **386/386** |
| matriz M45 isolada | **91/91** — **35 journeys** |
| cobertura do router | 39/39 rotas · dívida **zero** |
| `npm run lint` | **0 erros** (eram 9) · 14 warnings, com teto |
| mutação M46 | **6/6 mortas** |

---

## 9. O que fica aberto

1. **Os 6 nós isentos** — textura e logotipo, com motivo escrito e travados em `toBe(6)`.
2. **Os dois monólitos continuam monólitos** (1182 e 1167 linhas, régua da casa = 400). A M46
   encolheu os dois; decompor é missão própria (D17).
3. **Busca por identificador** e **a captura de Analytics retido que não sei explicar** — o owner
   optou por não encaminhar. Seguem registradas como **NÃO MEDIDO**, não como resolvidas.

---

`NÃO MEDIDO ≠ VERDE` · `NÃO CORRIGIDO ≠ NÃO CONTADO` · `NÃO OLHADO ≠ NÃO EXISTE`

E o que a M46 acrescenta: **contado é o que se consegue pagar.** Dos 159, 153 caíram — e a maior
parte porque a M45 tinha feito o trabalho chato de saber onde eles estavam.
