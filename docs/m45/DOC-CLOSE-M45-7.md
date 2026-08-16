# DOC-CLOSE · M45.7 — superfícies públicas, entrada e sessão

**Tranche:** M45.7 (P1) · **Umbrella:** M45 — Two-View Hardening
**Estado:** FECHADA · **Escopo:** `/`, `/terms`, `/privacy`, `/login`, `/session-expired`
**Sem push · sem deploy · sem Railway.**

---

## 1. A pergunta desta tranche

As missões do programa mediram o produto **depois da porta**. A discovery da M45 marcou E13/E14
como **NO CREDIT** por um motivo simples: as telas que qualquer pessoa vê *primeiro* — a landing, os
documentos legais, a entrada, a sessão expirada — nunca foram atravessadas por gate nenhum.

Não é que elas passassem. É que **ninguém tinha perguntado**.

---

## 2. O que a primeira medição encontrou

| journey | rota | `<main>` | axe (nós) |
|---|---|---|---|
| J21 landing pública | `/` | **não** | **43** color-contrast |
| J22 termos de uso | `/terms` | sim | **8** color-contrast |
| J23 entrada | `/login` | **não** | **3** (2 contraste + 1 `link-in-text-block`) |
| J24 sessão expirada | `/session-expired` | **não** | 0 |

**54 nós reprovados em WCAG 2 AA**, e três superfícies sem landmark principal — quem usa leitor de
tela não tem "pular para o conteúdo" em nenhuma delas.

Exemplos medidos: `#52525b` sobre `#0b0b0d` = **2.54:1** na landing; `rgba(255,255,255,0.35)` na
data dos termos = **3.15:1**; e o "Create one" da entrada com **2.06:1** contra o texto ao redor —
um link que só se distingue por cor some para quem não distingue essa cor.

---

## 3. O achado de comportamento: duas telas que só existem sem sessão

Montadas como as outras 20 journeys, `/login` e `/session-expired` renderizavam a **Home**.

Isso está **certo**: quem já entrou não deve ver a porta. Mas significa que as duas journeys, como
eu as tinha escrito, mediam uma tela que não era a delas — dois nomes, uma superfície, exatamente a
classe de defeito que o gate de evidência da M45.6 pegou em `docs/`.

Corrigido com `semSessao`, que desfaz a bandeira de auth num `addInitScript` posterior. O achado
virou gate: a mutação 3 prova que a matriz reprova se a sessão deixar de ser desfeita.

---

## 4. O que foi entregue: uma catraca, não uma correção

Corrigir 43 violações de contraste **cravadas em hex** na landing é redesenho, e o Product
Experience Freeze não autoriza. A entrega é outra, e é a honesta: **a dívida passa a ser contada.**

Dois campos novos em `Journey` ([e2e/m45-matriz.spec.ts](e2e/m45-matriz.spec.ts)):

- `regiao?: "main" | "body"` — o padrão é `main` **e é a exigência**. Cair para `body` é uma
  declaração explícita de que a superfície não tem landmark.
- `axeConhecido?: number` — as violações pré-existentes, afirmadas com **`toBe`**.

`toBe`, e não `toBeLessThanOrEqual`: o número não pode crescer **nem encolher em silêncio**. Quem
corrigir contraste é obrigado a baixar o número no mesmo commit, e o diff passa a exibir a correção.
Com `<=` eu teria escrito um gate que **não pode falhar por melhora** — e o programa já pagou por um
desses (`feedback_gate_que_nao_pode_falhar`).

### 4.1 A catraca da catraca (G1-bis)

`regiao: "body"` e `axeConhecido` são escapes. Sem guarda, a próxima journey quebrada seria aceita
desde que a pessoa escrevesse o número da própria quebra.

G1-bis trava **nominalmente** quem os usa (`["J21","J23","J24"]` e `["J21","J22","J23"]`) e trava o
**total agregado em 54** — o que impede a dívida de migrar entre superfícies sem aparecer.

---

## 5. Campanha de mutação — 4/4 mortas

[docs/m45/mutacoes_m45_7.py](docs/m45/mutacoes_m45_7.py)

| # | mutação | assassino real |
|---|---|---|
| 1 | dívida da landing 43 → 44 | G7 · J21 axe **+** G1-bis |
| 2 | teto total 54 → 55 | G1-bis |
| 3 | `semSessao` vira no-op | G1 · J23 entrada **+** G7 · J23 |
| 4 | J21 volta a declarar `main` | G1 · J21 landing **+** G1-bis |

### 5.1 Errata do instrumento, corrigida durante a campanha

A primeira versão do extrator pegava a primeira linha com `›` — e o `--reporter=line` imprime a
**lista de progresso** com o mesmo caractere. Ele anunciou como assassino o teste `[1/68]`, que
tinha apenas *começado*. Três das quatro mutações receberam crédito errado.

Corrigido para ler só o bloco posterior a `N failed`. A campanha foi **repetida inteira** com o
instrumento corrigido, e é essa a tabela acima. Registrar *quem* matou, e não só *que* morreu.

As mutações 3 e 4 mataram também G5 e G6 por cascata (o laço de responsive reusa uma página). O
assassino **esperado** está presente em todas as quatro; a cascata é ruído, não crédito.

---

## 6. Evidência

[e2e/m457-shots.spec.ts](e2e/m457-shots.spec.ts) → `docs/m45-7/` — **6 capturas**, cada uma com
âncora do estado que o nome promete, montadas sem sessão (que é como as telas são realmente
alcançadas). Todas passam no gate de duplicata da M45.6.

As imagens documentam o estado atual **incluindo os defeitos não corrigidos** — é o que permitirá
comparar quando forem.

---

## 7. Stack de qualidade

| gate | resultado |
|---|---|
| `npm run typecheck` | **APROVADO** — 6 projetos, 371 arquivos, cobertura completa |
| `npx vitest run` | **118/118** arquivos · **1665/1665** testes |
| `npx playwright test` | **358/358** |
| matriz M45 isolada | **68/68** (24 journeys) |
| mutação M45.7 | **4/4 mortas** |

### 7.1 Errata herdada

`npm run lint` mantém os **9 erros pré-existentes** já registrados nos DOC-CLOSEs da M45.2 e M45.3
(`AionPage.tsx`, `tailwind.config.ts`, três arquivos de teste). Esta tranche **não os aumentou nem
os corrigiu** — não são dela, e corrigi-los sem gate seria a mesma dívida em outro lugar.

---

## 8. O que fica aberto (decisão do owner)

1. **As 43 violações de contraste da landing.** Cravadas em hex e em `style=` inline — a landing foi
   construída fora do design system. Corrigi-las é trabalho de tokens, não de patch.
2. **Os três `<main>` ausentes.** Correção de a11y barata em esforço, mas toca a raiz de três
   componentes que esta tranche não tinha mandato para reescrever.
3. **`link-in-text-block` na entrada.** O "Create one" precisa de sublinhado ou peso, não só de cor.

Nenhum é regressão: **todos os três já existiam antes da M45.7**. A diferença é que agora estão
medidos, contados e travados.

---

## 9. Fecho

A M45.7 não deixou o produto público mais bonito. Deixou-o **medido** — e transformou 54 defeitos
invisíveis em 54 defeitos que não podem crescer sem reprovar a suíte.

`NÃO MEDIDO ≠ VERDE` — e, a partir desta tranche, `NÃO CORRIGIDO ≠ NÃO CONTADO`.
