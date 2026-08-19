# DESIGN 06 — a paleta da V4 vira o padrão do site

> **Emenda à `FRONT-DESIGN-SYSTEM-CONSTITUTION.md` §1.** A direção visual está marcada
> 🔶 PROVISIONAL desde o `DESIGN-05` (`77641c8`), e é essa marca que torna esta troca uma emenda
> e não uma violação. **D23 continua vigente:** um tema só. Nada aqui reabre Light/Dark.
>
> Decisão de owner, 2026-08-19.

---

## 1. O que mudou, e o que não mudou

O protótipo aprovado em 17/08 — ardósia `#12161D` + índigo `#7C8CFF` — sai. Entra a **V4 do
Molde**: azul-noite `#050814` + roxo `#8B5CF6`.

O **mecanismo é o mesmo**, e é o que aquela troca estabeleceu e provou: os valores entram em
`src/design/tokens/tokens.css`, uma vez, e as 21 rotas mudam de cara porque consomem estes
tokens. `src/styles/globals.css` continua sendo adaptador puro — toda entrada dele é
`var(--ds-*)`, nenhuma tem valor próprio. **Nenhum `#hex` foi para dentro de componente**, e o
gate `design-tokens-unico.test.ts` continua provando isso.

| eixo | 17/08 (sai) | V4 (entra) |
|---|---|---|
| base | `#12161D` — L 9%, S 23% | `#050814` — **L 5%, S 60%** |
| acento | índigo `#7C8CFF` | roxo `#8B5CF6` |
| acento-tinta | *o mesmo do acento* | roxo claro `#C084FC` — **volta a divergir** |
| separação | tom + borda 1,51:1 | tom + sombra; borda **1,23:1** |
| tinta de apoio | `#7A8697` — reprovava AA sobre `overlay` | `#76859B` — **passa nas quatro** |

O que **não** mudou: a escada de elevação continua curta e por tom; forma, motion, durações e
curvas ficam intactas (§5 está 🔒 FROZEN); o vocabulário de papéis é o mesmo — 19 tokens de cor,
nenhum criado, nenhum removido.

---

## 2. As medições, antes de escrever

### 2.1 A escada de elevação SOBE

A regra do próprio `tokens.css`: *"superfície de conteúdo é sempre mais clara que o vazio atrás
dela. Elevação nunca escurece."*

| papel | hex | luminância | |
|---|---|---:|---|
| `surface-base` | `#050814` | 0,0026 | — |
| `surface-raised` | `#0C1220` | 0,0062 | sobe |
| `surface-sunken` / `muted` | `#0E1525` | 0,0076 | sobe |
| `surface-overlay` | `#101826` | 0,0090 | sobe |
| `surface-selected` | `#141C2E` | 0,0118 | sobe |

### 2.2 Texto sobre cada superfície de conteúdo

AA pede 4,5:1 para texto pequeno.

| tinta | base | raised | overlay | muted |
|---|---:|---:|---:|---:|
| `text-primary` `#EAF0FA` | 17,45 | 16,33 | 15,54 | 15,91 |
| `text-secondary` `#A9B6CC` | 9,75 | 9,13 | 8,68 | 8,89 |
| `text-muted` `#76859B` | 5,33 | 4,99 | **4,74** | 4,86 |

### 2.3 Acento e sinais como tinta sobre a base

| papel | hex | contraste |
|---|---|---:|
| `accent` | `#8B5CF6` | 4,72 |
| `accent-ink` | `#C084FC` | 7,56 |
| `success` | `#4ADE80` | 11,46 |
| `warning` | `#FBBF24` | 11,97 |
| `danger` | `#FB7185` | 7,42 |

### 2.4 Tinta sobre a superfície de ação

| tinta | roxo | verde | âmbar | rosa |
|---|---:|---:|---:|---:|
| branco | **4,23** ❌ | 1,74 ❌ | 1,67 ❌ | 2,69 ❌ |
| base `#050814` | **4,72** ✅ | 11,46 ✅ | 11,97 ✅ | 7,42 ✅ |

---

## 3. As quatro decisões que a conversão mudou

### 3.1 O balão da V4 escurecia ao subir — corrigido

O protótipo pinta o balão de ajuda com `#0B1120`, **L 0,0058**, sobre um painel de **L 0,0062**.
A camada sobreposta ficava mais escura que o conteúdo. Entrou o `--sup3` `#101826` da própria V4,
que é o degrau acima.

### 3.2 Texto branco no botão primário reprova — vai escuro

Branco sobre `#8B5CF6` dá **4,23**, abaixo dos 4,5. A tinta escura passa nas quatro superfícies de
sinal, e é a mesma conclusão a que a paleta anterior tinha chegado.

**O 4,72 do roxo é a menor folga desta paleta** — 22 centésimos acima do mínimo. Escurecer o
acento um grau resolveria com sobra; não foi feito porque o roxo é a identidade da troca, e mexer
nele é decisão de owner. Fica medido e escrito: **botão primário com texto pequeno é o único
lugar desta paleta sem folga.**

### 3.3 `border-strong` não sai de um hex da V4

As bordas da V4 são mais fracas que as anteriores — 1,23 contra 1,51 — porque ela separa por
**tom e sombra**, não por linha. Para moldura, é escolha de direção e vale.

Mas `border-strong` não é moldura: é **desenho** — o contorno tracejado de NÃO MEDIDO e a hachura
de AUSENTE, que precisam sobreviver à escala de cinza. A ardósia da V4 no degrau mais forte (.38)
daria 1,76, abaixo do 1,95 que a hachura já provou precisar. Entra **.46 → `#3A455E`**: 2,09 sobre
base e 1,95 sobre raised, igualando o par provado.

É o único valor desta troca que não sai direto de um hex da V4 — e sai por medição contra um
requisito que já existia.

### 3.4 A tinta de apoio é o `--t4`, e quem decidiu foi o gate

A V4 tem **quatro** degraus de tinta; este vocabulário tem três. A primeira escolha foi o `--t3`
`#8D9BB2`, por folga: 6,32 no pior caso contra 4,74 do `--t4`.

**`contraste-de-estado.test.ts` reprovou**, e o achado é melhor que o critério: com o `--t3`, o tom
**neutro** e o tom **negativo** ficam a **1,05** de separação em escala de cinza. Erro e não-estado
viravam a mesma mancha para quem não distingue cor.

| par | com `--t3` | com `--t4` |
|---|---:|---:|
| negativo × neutro | **1,05** ❌ | **1,39** ✅ |
| positivo × neutro | 1,61 | 2,15 |
| atenção × neutro | 1,69 | 2,25 |

Fica o `--t4`. A folga extra do `--t3` não valia apagar a distinção de um estado crítico.

### ✅ E um achado antigo fechou de graça

`--ds-text-muted` reprovava AA sobre `overlay` e `muted` (**4,17:1**) desde a M11, e a correção
óbvia estava fechada — clarear a tinta a empurrava para a luminância do `danger`. Com a base em
5% de luminância o mesmo papel mede **4,74** no pior caso. **A restrição de uso cai.**

---

## 4. O que NÃO entrou, e o que falta decidir

### 4.1 O ciano — dois acentos, e a prova não fecha

A V4 usa **roxo como ação e ciano como quantidade**: gradiente de barra, traço da sparkline, valor
de Pareto. A Constituição §1 pede **um acento só**, e a §7 exige ≥3:1 entre séries adjacentes.

**Roxo × ciano dão 2,34.** Abaixo do piso.

O roxo entrou nesta troca. O ciano fica pendente de **emenda à §4**, com consumidor e prova — que
é exatamente a regra que o rodapé do `tokens.css` enuncia: *"o valor nasce com o componente que o
consome"*. `--ds-chart-*` continua declarado e sem valor.

**Consequência prática, hoje:** onde a V4 desenha `linear-gradient(90deg, roxo, ciano)`, o sistema
tem só o roxo. As barras vão sair monocromáticas até a emenda.

### 4.2 A restrição que sobreviveu

`success` × `warning` ficam a **1,04** em escala de cinza — a paleta anterior tinha 1,05. Verde e
âmbar continuam sendo o mesmo tom em cinza. **Nenhum par `success`/`warning` pode carregar
significado sem rótulo, ícone ou forma.** V6 já proíbe cor como canal único; a restrição segue
escrita porque continua fácil de violar sem perceber.

---

## 5. O que esta emenda NÃO autoriza

- **Não reabre D23.** Um tema só. P31 (Light/Dark) segue proposta.
- **Não abre dialeto por página.** A regra "design system é fonte única" foi suspensa *para a
  troca*, como em 17/08 — não para permitir cor local.
- **Não toca §5 (motion).** Cinco durações, quatro curvas, 🔒 FROZEN.
- **Não muda comportamento.** O `PRODUCT-EXPERIENCE-FREEZE-V1.md` é a autoridade de
  comportamento, e nada aqui o alcança.

---

## 6. Gates

| gate | resultado |
|---|---|
| `design-tokens-unico.test.ts` | ✅ uma fonte canônica, todo token com prefixo `--ds-`, zero cor literal fora dela |
| `design-tokens.test.ts` | ✅ todo token do `tailwind.config` existe; superfícies consolidadas sem hex |
| `contraste-de-estado.test.ts` | ✅ ícone ≥3:1 sobre os dois fundos; nenhum par indistinguível compartilha forma |
