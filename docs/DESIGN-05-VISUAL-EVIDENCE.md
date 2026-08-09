# DESIGN 0.5 — Visual Evidence: teste adversarial do território T1

> **Documental e descartável.** Zero componente, zero página TO-BE, zero backend, zero contrato,
> zero deploy/push. Nenhuma dependência runtime instalada.
>
> **Objetivo:** não é moodboard nem catálogo de screenshots. É **tentar derrubar** T1 Bancada +
> marginália de evidência, e ver o que sobra.
>
> **Base:** `sentinela-front-e1` @ `01ba6d5` + as três correções do owner (§0).

---

## 0. As três correções do owner, aplicadas antes de qualquer pesquisa

| # | correção | onde foi aplicada |
|---|---|---|
| **1** | **D31 não está autorizada.** D23 continua sendo a autoridade de produto sobre tema. Light/Dark permanece como **proposta técnica** com custo/viabilidade provados | `DESIGN-0` §4 → **P31** (era D31), em 7 pontos do documento; nota em `DISCOVERY-0B` reescrita para dizer que **D23 não foi superseder** |
| **2** | **R2 não é candidato.** Supabase está **aposentado**; o que resta é **delta obrigatório de erradicação**, em frente própria | `DESIGN-0` §13.1, com escopo medido, critério de pronto e um alerta de sequenciamento: as duas rotas são caminho de auth **real** |
| **3** | **Escala enganosa**, não "eixo nunca truncado" | `DESIGN-0` §9.5 (novo), mais as linhas de T1, da matriz de referências e de Recharts |

> Sobre a correção 3, ela me parece objetivamente melhor do que a regra que eu tinha escrito: *"eixo
> nunca truncado"* proibiria ler corretamente uma série que varia 2 % em torno de 87 %, que é
> exatamente o caso de um indicador maduro. O que se proíbe é **enganar**, não **cortar**.

---

## 1. O que a pesquisa conseguiu — e o que não conseguiu

**Honestidade sobre o instrumento antes das conclusões** ([[feedback_prove_o_instrumento_antes_de_acusar_o_codigo]]):

| fonte pedida | resultado | detalhe |
|---|---|---|
| **Mobbin** | ❌ **inacessível** | `mobbin.com` devolveu **HTTP 403 Forbidden**. É detecção de bot. **Não contornei** — contornar bot-detection não está autorizado e não seria feito nem se estivesse |
| **Cosmos** | ❌ **inacessível sem sessão** | `cosmos.so` carrega o `<title>` e devolve `<body>` **vazio**; a árvore de acessibilidade lê "empty page". Conteúdo depende de login. **Não criei conta** |
| **Awwwards** | ⚠️ **acessível, mas fora do problema** | Carrega. O acervo é dominado por **site de agência e portfólio** — nenhum dos 13 problemas operacionais aparece. É o instrumento errado para 12 dos 13 |
| **Screenshots** | ❌ **indisponíveis** | O painel do navegador não está sendo exibido, então a página não compõe frames: `Screenshot timed out after 5s`. Zero screenshot capturado — **e por isso nenhum foi versionado nem guardado no scratchpad** |

**O pivô, e por que ele é melhor evidência.** Sem moodboard, fui atrás do que se pode **medir**:
produtos públicos, do nosso domínio, inspecionados no DOM e no CSS computado. Isso troca *"olhei e
achei bonito"* por número. Um moodboard não teria produzido nada do que está em §2.

---

## 2. Evidência medida

### 2.1 Linear — a rampa de elevação, com luminância calculada

`linear.app` · lida do `:root`, luminância relativa WCAG calculada no próprio navegador.

| token | valor | luminância |
|---|---|---|
| `--color-bg-level-0` | `#08090a` | **0,0027** |
| `--color-bg-level-1` | `#0f1011` | **0,0051** |
| `--color-bg-level-2` | `#141516` | **0,0074** |
| `--color-bg-level-3` | `#191a1b` | **0,0102** |

**Monotonicamente crescente**, em tema escuro, e com passos quase constantes em **luminância**
(~0,0025), não em hex. Elevação = mais perto da luz. Isto **confirma empiricamente** a regra de
`DESIGN-0` §9.2 — não é opinião minha, é um produto em produção.

Outros números do mesmo `:root`:

- **405** custom properties. Um vocabulário, não três.
- rampa de borda em **três degraus**: `border-primary #23252a` → `secondary #34343a` →
  `tertiary #3e3e44` — mais forte é **mais claro**;
- `--color-border-translucent: #ffffff0d` — no escuro, a borda é **luz adicionada**, não tinta;
- texto `#f7f8f8` sobre `#08090a` = **18,73:1**;
- `color-scheme: dark`, `Inter Variable`.

### 2.2 Grafana — o nosso domínio exato

`play.grafana.org` · observabilidade densa, pública.

- `body` `rgb(17,18,23)`, texto `rgb(204,204,220)` → **11,79:1**;
- `color-scheme: dark`; `Inter`;
- o texto **não é branco puro** e é levemente **azulado** — decisão deliberada de reduzir vibração
  em superfície escura.

### 2.3 Vercel — e o contraexemplo que derruba metade de uma regra minha

`vercel.com/geist/colors` · **467** custom properties, e o achado interessante é que são **dois
vocabulários vivos ao mesmo tempo**:

| namespace | vars | papel |
|---|---|---|
| `--ds-*` | **223** | sistema atual — 9 famílias de cor × 10 degraus + `gray-alpha` × 10 |
| `--geist-*` | **103** | sistema **legado**, ainda respirando |

Duas consequências, e a segunda é a que dói:

1. **Nem a Vercel unifica de uma vez.** Uma empresa cujo produto *é* o design system carrega dois
   vocabulários simultâneos. Isso não desculpa o nosso R1 — mas mata a fantasia de que unificação é
   evento único. É **migração com dois sistemas vivos**, e o que a torna sobrevivível é o novo ser
   **namespaced e dominante** (223 × 103).
2. 🔴 **`--geist-success-light: #3291ff`** — um token chamado *success* cujo valor é **azul**. E
   `--geist-error: red`, a palavra-chave CSS, não um valor do sistema. **Nome de token apodrece.**
   Um gate que só verifica *"existe token?"* aprova isto.

E o contraexemplo direto à minha redação de §9.2:

```
--ds-background-100 = hsla(0, 0%, 4%, 1)   <- superficie do app
--ds-background-200 = hsla(0, 0%, 0%, 1)   <- fundo atras dela
```

No tema escuro da Vercel, o número **maior** é **mais escuro** — direção **oposta** à do
`bg-level-N` do Linear. Dois sistemas de primeira linha discordam.

**Mas discordam no rótulo, não na física.** Nos dois casos a superfície de conteúdo é **mais clara**
que o vazio atrás dela. O que difere é que o Linear nomeia por **papel semântico** (`level`, que se
lê sozinho) e a Vercel por **índice de rampa** (que exige memorizar a direção). Ver alteração **A2**.

---

## 3. As 13 áreas — princípio extraído

Onde a evidência é medida, está marcada 📐. Onde é padrão consolidado sem medição nesta missão, 📎.
Nada aqui é screenshot, e nada é especificação visual.

| # | problema | padrão observado | problema que resolve | absorver como princípio | **NÃO** copiar | origem |
|---|---|---|---|---|---|---|
| 1 | **Navegação / sidebar** | 📐 hierarquia por **rampa de borda de 3 degraus**, não por sombra nem por caixa | separar zonas sem gastar contraste do conteúdo | separação é **borda e alinhamento**; borda tem escala, não é booleana | sidebar que colapsa e leva junto o "você está aqui" | Linear |
| 2 | **Home operacional** | 📎 a home responde *"o que precisa de mim"* | evitar vitrine de vaidade | Home nasce de **fila de ação**, não de KPI | grade de cards de métrica sem hierarquia | Linear, PagerDuty |
| 3 | **Resultado denso** | 📐 contraste de texto **18,7:1** (Linear) e **11,8:1** (Grafana) — muito acima do mínimo | densidade alta só é legível com contraste folgado | em superfície densa, mirar **bem acima** de 4.5:1; o mínimo legal é piso, não meta | branco puro no escuro — Grafana evita de propósito | Linear, Grafana |
| 4 | **Analytics** | 📐 Grafana usa **uma** família (Inter) para rótulo **e** número | ritmo tipográfico | **numerais tabulares**, não família mono | mono para tudo — ver **A1** | Grafana |
| 5 | **Comparação A×B** | 📎 diff com direção nomeada e base declarada | delta sem base é anedota | todo delta carrega **de quê para quê** | seta colorida sem valor nem base | consolidado |
| 6 | **Procedência / metodologia** | 📐 Grafana esconde a descrição do painel atrás de um **(i)** | não poluir a leitura | 🔶 **é o contraexemplo do nosso diferencial** — ver §4 | esconder procedência por padrão | Grafana |
| 7 | **Estados async** | 📎 estado por componente, não barra única | 4 eixos independentes já existem | nunca inventar porcentagem agregada | barra única fingindo saber o total | consolidado |
| 8 | **Ação necessária** | 📎 separar *"precisa de você"* de *"está andando"* | D15 / `needs_mapping` | fila com CTA por item | badge de contagem sem dizer o quê | consolidado |
| 9 | **Empty / error** | 📎 vazio é convite; erro é direção | ausência ≠ zero ≠ resolveu | *what + why + how to start* | ilustração fofa sem próximo passo | `/ux-copy` |
| 10 | **Configurações** | 📎 configuração por **escopo do objeto** | é D22 literal | uma superfície, três escopos | tela única com 40 toggles | consolidado |
| 11 | **Modal destrutivo** | 📎 digitar o nome do objeto | é D28 literal | confirmação por **correspondência exata** | "Tem certeza?" com OK/Cancelar | GitHub, Stripe |
| 12 | **Data-heavy mobile** | 📎 tabela vira lista com hierarquia | D32 | reflow, não zoom-out | tabela desktop espremida | consolidado |
| 13 | **Light / Dark** | 📐 Linear e Vercel: **direções de rampa opostas**, mesma física | tema não é inversão | direção **consistente** + nome que não se lê ao contrário | numerar rampa sem dizer o que o número significa — ver **A2** | Linear × Vercel |

---

## 4. O ataque mais forte contra T1: a marginália de evidência

Era a **assinatura** proposta — todo número carrega, ao lado, de onde veio e sobre quantos
registros. Três ataques, na ordem em que doem:

**Ataque 1 — nenhum produto medido faz isso, e o do nosso domínio faz o contrário.** O Grafana
esconde a descrição do painel atrás de um `(i)`. Se procedência ao lado do número fosse boa ideia,
alguém em observabilidade já teria feito.

**Ataque 2 — custa a coluna que o mobile não tem.** Marginália pressupõe margem. D32 exige aceite
em mobile. Numa coluna de 375 px, a marginália ou some (e a assinatura evapora exatamente onde é
mais difícil confiar) ou empurra o número (e destrói a densidade que T1 promete).

**Ataque 3 — pode virar ruído.** Se **todo** número carrega procedência, procedência vira papel de
parede e ninguém lê — o mesmo mecanismo que faz cor semântica em tudo não significar nada.

**Resposta, e por que a assinatura sobrevive assim mesmo:**

- contra o 1: *ninguém faz* não é *não funciona*. O Grafana esconde porque a procedência dele é
  **query**, que é detalhe de implementação. A nossa é **`record_count`, janela e `withheld`** — é
  o produto. Nós temos algo para mostrar que eles não têm;
- contra o 2: vira alteração obrigatória, não objeção fatal — **A3**;
- contra o 3: vira restrição de escopo — marginália é de **indicador publicado**, não de todo
  número na tela.

---

## 5. Skills aplicadas sobre o conjunto

| skill | veredicto sobre T1 |
|---|---|
| `/frontend-design` | ✅ T1 **não** cai em nenhum dos três defaults que a própria skill nomeia. Cobra uma coisa: *"gaste a ousadia em um lugar só"* — T1 obedece, e o lugar é a marginália |
| `/design-critique` | ⚠️ "painel, não cartão" só funciona com disciplina de espaçamento; sem escala curta vira sopa. A escala de `DESIGN-0` (4/8/12/16/24/32) atende |
| `/ux-heuristics` | ⚠️ densidade alta é inimiga do *"não me faça pensar"*. Exige **zonas fixas**: o olho precisa aprender onde as coisas moram |
| `/ux-copy` | ✅ marginália é copy, não enfeite — e cai no orçamento de +30 % PT-BR. Rótulo de procedência precisa caber nos dois idiomas |
| `/design-system` | 🔴 aponta o risco que a Vercel materializou: token cujo **nome apodreceu** (`success` azul). Gate tem de checar **valor contra significado**, não só existência |
| `accessibility-review` | ✅ contraste alvo confirmado pelos medidos (11,8 e 18,7). ⚠️ marginália é **texto pequeno** — não pode ficar abaixo de 4.5:1 "porque é secundária" |
| `web-design-guidelines` | ✅ `color-scheme` explícito no `<html>` — Linear e Grafana fazem, nós não fazemos. Item da Design 1 |
| `composition-patterns` | ⚠️ estado semântico como **string** vira ternário encadeado. Variantes explícitas, não modo por string |
| `react-best-practices` | ✅ nada em T1 conflita. As 10 regras `server-*` não se aplicam (SPA, sem SSR) |

---

## 6. Veredicto

# ✅ T1 APROVADO COM ALTERAÇÕES

T1 Bancada sobrevive, e sobrevive **melhor do que foi escrito**: a gramática que ele propõe — rampa
de elevação nomeada, separação por borda escalonada, contraste folgado, ausência de brilho e
vidro — é exatamente onde dois produtos densos e admirados **já chegaram**, medidos e não intuídos.

Quatro alterações obrigatórias. Nenhuma é cosmética; todas vieram de evidência ou de ataque.

### A1 — Numerais tabulares, não família mono

**Era:** *"mono para todo número"*.
**Vira:** **`font-variant-numeric: tabular-nums` obrigatório** em todo dado quantitativo, na mesma
família de texto. Família **mono** fica reservada a **identificador, hash, fingerprint e código** —
onde ela carrega significado (é literal, é copiável), não onde é só estilo.
**Por quê:** Grafana usa uma família só para rótulo e número, e é o produto mais denso que medi. O
que resolve número que dança entre estados é **largura tabular**, não serifa mono.

### A2 — Rampa nomeada por papel, nunca por índice

**Era:** *"elevação é sempre mais perto da luz"* — verdadeiro na física, ambíguo no rótulo.
**Vira:** a direção é **consistente** (superfície de conteúdo sempre mais clara que o vazio atrás,
nos dois temas) **e** o nome do token **não pode ser lido ao contrário**: `surface-base` /
`surface-raised` / `surface-overlay`, nunca `surface-100/200/300`.
**Por quê:** Linear (`level-N`, maior = mais claro) e Vercel (`background-N`, maior = mais escuro)
provam que índice numérico não se lê sozinho. Nome que exige memorizar a direção **vai** ser usado
ao contrário.

### A3 — Marginália precisa de comportamento mobile definido

**Vira regra:** em desktop, a procedência fica **ao lado** do indicador. Abaixo do breakpoint de
tablet, ela **colapsa numa disclosure presa ao próprio número** — nunca é removida, nunca vira
tooltip *hover-only* (não existe hover no toque), e o alvo respeita 44×44.
**Escopo:** marginália é de **indicador publicado**. Não é de todo número da tela.
**Por quê:** ataques 2 e 3 do §4. Assinatura que evapora no mobile não é assinatura.

### A4 — Escala honesta (já incorporada)

A correção 3 do owner passa a ser cláusula de T1: barra quantitativa parte de zero salvo exceção
explícita e marcada; série temporal pode ter domínio não-zero **com limites expostos**; delta usa
domínio simétrico. Biblioteca renderiza geometria e escala, **nunca** é dona de transformação ou
semântica analítica.

---

## 7. Princípios visuais congelados — princípio, não pixel

> Congelam-se **princípios**. Nenhum hex, nenhuma fonte, nenhum número de espaçamento é congelado
> aqui. E **P31 continua não autorizada**: nada abaixo depende de tema existir.

| # | princípio |
|---|---|
| **V1** | **Separação é borda e alinhamento, não sombra.** Borda tem **escala** (`default` → `strong`), não é booleana |
| **V2** | **Superfície de conteúdo é sempre mais clara que o vazio atrás dela**, nos dois temas. Elevação nunca escurece |
| **V3** | **Token de superfície é nomeado por papel** (`base`/`raised`/`overlay`), nunca por índice numérico |
| **V4** | **Contraste é folga, não mínimo.** Em superfície densa, mirar bem acima de 4.5:1. Texto secundário não é isento |
| **V5** | **Cor semântica é reservada.** Se tudo é colorido, nada é sinal |
| **V6** | **Estado nunca depende só de cor.** Sempre um segundo canal: forma, ícone ou rótulo |
| **V7** | **Numerais tabulares em todo dado quantitativo.** Mono só onde é literal (id, hash, código) |
| **V8** | **Escala honesta e exposta.** Nunca enganar, nunca implícito (§9.5 de `DESIGN-0`) |
| **V9** | **Todo indicador publicado carrega procedência visível** — a assinatura. Com comportamento mobile definido (A3) |
| **V10** | **Ausência é ausência.** Não é zero, não é "resolveu", e a linha não atravessa o buraco |
| **V11** | **Motion explica mudança.** Reduced motion preserva a informação e remove o deslocamento |
| **V12** | **Zonas fixas.** O olho aprende onde as coisas moram; densidade sem constância é ruído |

---

## 8. MISSÃO DESIGN 1 revisada — proposta, não executada

Revisada contra as três correções e contra o que a evidência mostrou. Mudanças em relação à versão
de `DESIGN-0` §15: **tema sai do escopo** (P31 não autorizada) e entram dois itens que vieram da
pesquisa.

| # | passo | critério de pronto |
|---|---|---|
| **1** | **Token único.** Três vocabulários → um. Deletar `src/index.css` e `src/App.css` (mortos — e um deles guarda a `.dark` fantasma). Resolver a colisão `--background`/`--primary` | um único namespace no `:root`; gate que falha se um segundo aparecer |
| **2** | **Nomear por papel** (V3): `surface-base/raised/overlay`, `border-default/strong`, `text-primary/secondary/muted` | zero token de superfície nomeado por índice |
| **3** | 🔶 **Light/Dark — SOMENTE SE AUTORIZADO.** Enquanto D23 valer, a Design 1 entrega **um** tema derivado do token único. A arquitetura fica **pronta para dois** sem que o segundo exista | se autorizado: dois temas com V2 e V4 provados. Se não: nada, e sem dívida escondida |
| **4** | **Primeiro primitive real:** o **chip de estado semântico** (`ready/partial/withheld/running/failed/pending`) | variantes explícitas (não modo por string); V6 provado em escala de cinza e em daltonismo simulado |
| **5** | **Primeiro pattern real:** o **par indicador + marginália de procedência** — é a assinatura, e é onde A3 se prova | desktop ao lado; abaixo de tablet, disclosure presa ao número, alvo 44×44, sem depender de hover |
| **6** | **`color-scheme` explícito no `<html>`** — Linear e Grafana fazem; nós não | scrollbar e controles nativos coerentes |
| **7** | **Tokens de motion** (5 durações, 4 curvas) + a tabela de reduced motion | a versão reduzida **preserva a informação** |
| **8** | **Gates por mutação** — nenhum gate entra sem uma mutação que o faça **falhar** | ver §8.1 |

### 8.1 Os gates, e a mutação que prova cada um

Nenhum destes entra verde sem antes ter ficado vermelho de propósito
([[feedback_teste_verde_por_motivo_errado]]).

| gate | mutação que precisa matá-lo |
|---|---|
| **um só vocabulário** | reintroduzir `--background` num segundo arquivo → deve falhar |
| **zero hex em componente** | trocar um token por `#4F5AE8` literal → deve falhar |
| **primitive não conhece domínio** | escrever `analysis` em `src/design/**` → deve falhar |
| **DS não acessa query** | importar `@tanstack/react-query` em `src/design/**` → deve falhar |
| **fixture não vaza** | importar `src/mocks/**` de um componente → deve falhar |
| **fixture × contrato** | remover um campo obrigatório da fixture → deve falhar na validação canônica |
| **V6 segundo canal** | remover o ícone do chip, deixando só cor → deve falhar |
| 🔴 **nome × valor do token** | apontar `--success` para um **azul** → **deve falhar**. Este gate existe por causa do `--geist-success-light: #3291ff` da Vercel: token cujo nome apodreceu e nenhum gate de existência pega |

### 8.2 Preservado sem alteração

**A arquitetura de mock de `DESIGN-0` §6 fica exatamente como está** — `UI → queries/view models →
lib/v1 → HTTP → MSW`, a estrutura `handlers/fixtures/scenarios`, e as quatro barreiras. Duas delas
já viraram gate acima (§8.1).

### 8.3 Fora do escopo da Design 1

Qualquer página TO-BE · Storybook · Recharts · Motion for React · React Hook Form · Zod ·
decomposição de `LandingPage`/`AionPage` · **e R2**, que é frente própria de erradicação.

---

## Anexo — o que esta missão NÃO fez

Não criou componente nem página TO-BE, não alterou backend, contrato ou infraestrutura, não instalou
dependência runtime, não capturou nem versionou screenshot de terceiros, não criou conta em
nenhum serviço, não contornou detecção de bot, não fez push, deploy, Railway nem Big Bang.

Instalou **duas skills de agente** — `composition-patterns` e `react-best-practices`
(`vercel-labs/agent-skills` @ `7c180d9`) — e **nenhuma outra**.
