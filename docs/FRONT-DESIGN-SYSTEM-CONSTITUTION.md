# FRONT DESIGN SYSTEM — CONSTITUIÇÃO

> **Autoridade VISUAL e de COMPONENTIZAÇÃO.** Direção, tokens, camadas, motion, acessibilidade,
> data visualization. Não contém decisão de produto (→ `PRODUCT-EXPERIENCE-FREEZE-V1.md`), mapa de
> superfícies (→ `EXPERIENCE-BLUEPRINT-V1.md`) nem regra de engenharia/mock
> (→ `FRONT-ARCHITECTURE-AND-MOCK-CONTRACT.md`).
>
> **Roteador:** `INDICE-DE-AUTORIDADE-V1.md`

## Como ler esta Constituição

Cada regra carrega **um** de três selos:

| selo | significado |
|---|---|
| 🔒 **FROZEN RULE** | congelada. Alterar exige contradição objetiva |
| 🔶 **PROVISIONAL UNTIL FIRST REAL SURFACES** | vale agora e **só congela** depois de sobreviver às primeiras superfícies reais |
| 🔷 **PROPOSAL** | **não é requisito.** Só vira regra com autorização explícita do owner |

> ⚠️ **Esta Constituição NÃO é Regra de Ouro permanente ainda.** A prova que falta está em §12.

---

## 1. Direção visual — T1 Bancada + marginália de evidência

🔶 **PROVISIONAL** — aprovado com alterações no `DESIGN-05` (`77641c8`).

**Personalidade:** calibrado, sóbrio, exato. A tela é um **instrumento**, não um relatório nem um
painel. **Assinatura:** a **marginália de procedência** — todo indicador publicado carrega, ao
lado, de onde veio e sobre quantos registros.

| eixo | direção |
|---|---|
| tipografia | grotesca neutra de alta legibilidade; **numerais tabulares** em todo dado quantitativo |
| densidade | alta, com ritmo vertical constante e escala curta |
| superfície | painel, não cartão; hierarquia por **régua e alinhamento** |
| contraste | alto no dado, baixo na moldura |
| cor | neutro dominante + **um** acento; cor semântica é **reservada** |
| gráficos | linha e barra finas, grid discreto, **escala honesta e exposta** |
| iconografia | linear, peso único, sempre com rótulo |
| motion | curto e preciso — o movimento é *assentar*, não *entrar* |

**Recusados como default:** dashboard SaaS genérico · visual de template · estética hacker ·
preto + neon + glow · glassmorphism gratuito · animação gratuita · excesso de cards sem hierarquia.
**E os três defaults de IA** que a skill `frontend-design` nomeia: creme + serifa + terracota;
quase-preto com acento ácido; broadsheet com fio de cabelo e raio zero.

### As quatro alterações obrigatórias (A1–A4)

| # | alteração | origem |
|---|---|---|
| 🔒 **A1** | **Numerais tabulares, não família mono.** `font-variant-numeric: tabular-nums` em todo dado quantitativo, na família de texto. **Mono** fica reservada a identificador, hash, fingerprint e código — onde é literal e copiável | Grafana usa **uma** família para rótulo e número, e é o produto mais denso medido |
| 🔒 **A2** | **Rampa nomeada por papel, nunca por índice.** `surface-base` / `surface-raised` / `surface-overlay`, jamais `surface-100/200/300` | Linear (`level-N`, maior = mais claro) e Vercel (`background-N`, maior = mais escuro) provam que índice não se lê sozinho |
| 🔒 **A3** | **Marginália com comportamento mobile definido.** Desktop: persistente ao lado. Abaixo do breakpoint de tablet: **disclosure presa ao próprio dado**. Nunca some, nunca depende só de hover, alvo ≥ 44×44. **Escopo: indicador publicado**, não todo número | ataque 2 e 3 do `DESIGN-05` §4 |
| 🔒 **A4** | **Escala honesta** (§7) | correção do owner |

---

## 2. Os doze princípios (V1–V12)

🔒 **FROZEN RULE.** Princípio, **nenhum pixel**.

| # | princípio |
|---|---|
| **V1** | **Separação é borda e alinhamento, não sombra.** Borda tem **escala** (`default` → `strong`), não é booleana |
| **V2** | **Superfície de conteúdo é sempre mais clara que o vazio atrás dela**, nos dois temas. Elevação nunca escurece |
| **V3** | **Token de superfície é nomeado por papel**, nunca por índice numérico |
| **V4** | **Contraste é folga, não mínimo.** Em superfície densa, mirar bem acima de 4.5:1. Texto secundário não é isento |
| **V5** | **Cor semântica é reservada.** Se tudo é colorido, nada é sinal |
| **V6** | **Estado nunca depende só de cor.** Sempre um segundo canal: forma, ícone ou rótulo |
| **V7** | **Numerais tabulares em todo dado quantitativo.** Mono só onde é literal |
| **V8** | **Escala honesta e exposta.** Nunca enganar, nunca implícito |
| **V9** | **Todo indicador publicado carrega procedência visível** — a assinatura, com A3 |
| **V10** | **Ausência é ausência.** Não é zero, não é "resolveu", e a linha não atravessa o buraco |
| **V11** | **Motion explica mudança.** Reduced motion preserva a informação e remove o deslocamento |
| **V12** | **Zonas fixas.** O olho aprende onde as coisas moram; densidade sem constância é ruído |

**Evidência medida** (`DESIGN-05` §2): Linear — rampa `level-0..3` com luminância
`0,0027 → 0,0051 → 0,0074 → 0,0102`, crescente e com passo constante em **luminância**, não em
hex; texto a **18,73:1**; borda translúcida `#ffffff0d` (no escuro, borda é **luz adicionada**).
Grafana — **11,79:1**, texto não-branco levemente azulado.

---

## 3. Camadas e componentização

🔒 **FROZEN RULE**

```
TOKENS              valor bruto e semantico; zero React
   |
PRIMITIVES          nao conhecem Analise/Instancia/Workspace
   |
PATTERNS            EmptyState, ErrorState, ConfirmDestructive, ProvenanceMargin ...
   |
PRODUCT COMPONENTS  conhecem dominio, recebem VIEW MODEL
   |
PAGE COMPOSITION    compoe; nao interpreta payload bruto
```

### Fronteiras de dependência

| camada | pasta | **não** pode importar |
|---|---|---|
| TOKENS | `src/design/tokens/` | tudo |
| PRIMITIVES | `src/design/primitives/` | domínio, queries, i18n de produto |
| PATTERNS | `src/design/patterns/` | domínio, queries |
| PRODUCT | `src/features/*/components/` | `lib/v1` direto, fixtures |
| PAGES | `src/features/*/ui/` | payload bruto, adapters, fixtures |

**D33 — component-first** 🔒: página **compõe**; página **não cria linguagem visual local**. Se uma
página precisou inventar um visual, ou ele vira componente, ou não existe.

**D35 — tokens são a fonte única visual** 🔒: cor, tipografia, spacing, radius, shadow, border e
motion **não nascem dentro das páginas**. Valor literal em componente é **defeito**, não estilo.

**Regras que viram gate:** o DS **não acessa backend nem query** · biblioteca externa **nunca vira
API pública da página** · **estado visual canônico existe uma vez** (é a defesa contra
`HomeStatus`/`InstanceStatus`/`AnalysisStatus` com três linguagens).

### Critério para promover uma variante ao DS

🔒 **A terceira ocorrência do mesmo ajuste vira token ou variante CVA.** Duas podem ser
coincidência; três são um padrão que alguém vai copiar errado na quarta.

Promoção exige: nome no vocabulário do sistema (não da tela que a originou) · estados e variantes
declarados · as **8 combinações** de D37 · prova de que nenhuma página perdeu expressividade.

**Composição, não booleano** 🔒: variantes **explícitas** em vez de modo por string ou proliferação
de props booleanas (`composition-patterns`).

---

## 4. Tokens semânticos

🔒 **FROZEN RULE** — vocabulário mínimo:

```
surface-base      surface-raised     surface-overlay
text-primary      text-secondary     text-muted
border-default    border-strong
accent
success   warning   danger   info
state-running     state-partial      state-withheld
chart-1..n     chart-grid     chart-axis     chart-emphasis
```

**O componente consome semântica, nunca `#hex` de tema.** Derivação por **rampa de luminância**,
nunca por inversão — inverter troca a direção da elevação (V2).

### Implementado na M08 — o namespace `--ds-` e o que ele resolve

A fonte canônica é **`src/design/tokens/tokens.css`**, e é o **único** arquivo do repositório onde
um token pode ter valor literal. Todo o resto é apelido `var(--ds-…)`, com gate.

O prefixo não é enfeite: o `--accent` do shadcn é uma **superfície de item selecionado**, e o
`accent` desta Constituição é a **cor de ação da marca**. Dois papéis, um nome — e num `:root`
compartilhado a última declaração vence em silêncio. O namespace torna a colisão **impossível por
construção** em vez de improvável por disciplina. É o desenho medido na Vercel em §2.3 do
`DESIGN-05`, com uma diferença: lá o legado ainda tem valor próprio (e um `success` azul); aqui a
camada legada é **proibida** de ter valor.

**Papéis desta Constituição que ainda NÃO têm valor**: `border-strong`, `info`,
`state-running|partial|withheld` e `chart-*`.

### Decidido na M11: `state-*` NÃO recebeu valor, e a razão é evidência

A M11 construiu o `StatusBadge` — o componente que consumiria esses tokens — e a conclusão foi que
**eles não são necessários**. O produto já havia materializado a decisão em código: `Retido.tsx`
desenha retenção com `border-border bg-card text-muted-foreground` (**neutro**), e `notices.tsx`
reserva `destructive` para `isError`, usando spinner neutro no indeterminado.

Inventar `state-running`, `state-partial` e `state-withheld` teria **contrariado decisão já em
produção** e violado V5: se cada um dos dezoito estados tivesse cor própria, nenhuma seria sinal.
Os dezoito mapeiam para **quatro tons que já existiam**, e quem os distingue é a **forma** — que é
o que V6 sempre exigiu.

`border-strong`, `info` e `chart-*` seguem sem valor pela razão original: nenhum consumidor.

### Achado medido na M11, ABERTO

`--ds-success` e `--ds-warning` estão a **1,14:1** um do outro — em escala de cinza, praticamente a
mesma mancha. Os valores vieram da paleta viva e foram **preservados** pela M08; alterá-los seria
regressão visual em todo consumidor. A consequência **não** é que a tela mente: nenhum par de
estados depende só desses tons, porque a forma os separa, e há gate provando. Fica como candidato
à revisão da primeira superfície real.

**Alvos verificáveis:** texto **≥ 4.5:1** · UI e não-texto **≥ 3:1** · séries adjacentes de
gráfico **≥ 3:1** entre si.

> 🔴 **Gate obrigatório: nome × valor do token.** Apontar `--success` para um azul **deve falhar**.
> Existe por causa de `--geist-success-light: #3291ff` — um token *success* **azul** encontrado na
> Vercel. Nome de token apodrece, e gate de existência não pega.

### 🔷 P31 — Light/Dark (PROPOSAL, não requisito)

**D23 continua sendo a autoridade sobre tema.** P31 é proposta técnica com custo medido, e **só
vira decisão com autorização explícita do owner**.

Custo medido (`DESIGN-0` §2.1): **três vocabulários de token concorrentes**; `src/index.css` e
`src/App.css` **mortos** — e a **única regra `.dark` do repo mora no arquivo morto**;
`--background`/`--primary` definidos **duas vezes com valores diferentes**; `next-themes`
instalado com **zero uso**.

**Conclusão:** viável, e o caminho é conhecido — mas exige **unificar três vocabulários antes** de
qualquer tema existir. **O token único vale por si**, independente de tema, e é o que a Design 1
entrega.

Se autorizado: preferência **System | Light | Dark**, `System` default; persistência **não pode
violar os privacy gates**; se exigir contrato inexistente, **registrar delta, não criar hack**.

---

## 5. Motion

🔒 **FROZEN RULE** — cinco durações, quatro curvas. Não mais.

```
duration-instant     0ms      troca sem deslocamento
duration-fast      120ms      microinteracao
duration-base      200ms      transicao de estado
duration-slow      320ms      overlay, mudanca de rota
duration-deliberate 480ms     so onde a demora COMUNICA

easing-standard    cubic-bezier(0.2, 0, 0, 1)
easing-enter       cubic-bezier(0, 0, 0.2, 1)
easing-exit        cubic-bezier(0.4, 0, 1, 1)
easing-emphasis    cubic-bezier(0.2, 0, 0, 1.2)     um unico overshoot, raro
spring-direct      manipulacao direta apenas
```

**Categorias:** `enter` · `exit` (sempre mais rápido que entrar) · `move` (identidade preservada) ·
`emphasis` (uma vez, sem repetir) · `state`.

**Regras:** anima **valor**, nunca eixo — eixo que se mexe mente sobre a escala · comparação entra
com os dois lados **juntos**, nunca em cascata · erro **não treme** · esqueleto **não pulsa mais
rápido que 1 Hz**.

### D34 — reduced motion 🔒

**Preserva a informação, remove o deslocamento** — não é "desligar tudo".

| normal | reduced |
|---|---|
| desliza para a posição | aparece na posição, `opacity` em `fast` |
| esqueleto pulsa | estático, com rótulo textual |
| barra cresce até o valor | já no valor final |
| transição de rota com continuidade | corte seco |
| `emphasis` com overshoot | cor/borda sem movimento |

---

## 6. Acessibilidade

🔒 **FROZEN RULE**

| escopo | mínimo |
|---|---|
| **todos** | teclado completo · foco visível (`:focus-visible`) · nome/papel/valor · texto ≥ 4.5:1 · não-texto ≥ 3:1 · alvo ≥ 44×44 · `prefers-reduced-motion` · **informação nunca só por cor** |
| estado semântico | cor **+** ícone/forma **+** rótulo; `role="status"` quando muda ao vivo |
| progresso | `aria-live="polite"`; nunca `assertive` — não é emergência |
| marginália | `<button aria-expanded>` + `aria-controls`; **jamais** só hover |
| confirmação destrutiva | foco preso, `aria-describedby` nas consequências, CTA desabilitado até correspondência exata |
| tabela | cabeçalhos associados; no modo stacked, cada campo mantém seu rótulo |
| gráfico | alternativa textual com os mesmos números; séries distinguíveis em **escala de cinza** e sob **deuteranopia** |
| erro | anunciado; foco movido para a mensagem |

---

## 7. Data visualization

🔒 **FROZEN RULE**

**Biblioteca é renderer, nunca owner semântico.** Pode desenhar geometria, eixos e escalas.
**Não pode** ser dona de **transformação ou semântica analítica** — binning, agregação,
estatística, interpolação de faltantes ou escolha de domínio. Se a API não permitir separar,
**não adotamos**.

**Nenhuma agregação nova no Front. Nenhuma inferência de drift.**

### Escala honesta

| tipo | domínio | condição |
|---|---|---|
| **barra quantitativa** | **parte de zero** | exceção **explícita e marcada na peça**. Barra compara **área**; cortar a base multiplica a diferença percebida |
| **série temporal** | **pode** ser não-zero | **limites expostos** — eixo rotulado com mín/máx reais |
| **delta A×B** | **simétrico** em torno de zero | senão "subiu 2" e "caiu 2" ganham tamanhos diferentes |

**Três regras de apoio:** o domínio chega **decidido** pelo view model — domínio automático é
decisão analítica disfarçada de default · eixo cortado é **declarado, não deduzido** · **nada de
interpolação sobre buraco** — ponto ausente é ausência, e a lacuna é visível (V10).

**Quebra de `result_schema_version` ou `indicator_registry_version` interrompe a comparabilidade
numérica** (D26).

---

## 8. Responsive

🔒 **D32 — responsive by default.** Desktop, tablet e mobile fazem parte do **aceite**. Não é
retrofit. Superfície provada só em desktop **não está pronta**.

| pattern | mobile | **não** pode perder |
|---|---|---|
| tabela | **stacked list** com hierarquia | coluna que carregue decisão |
| comparação lado a lado | **blocos sequenciais** | a **base** do delta em cada bloco |
| marginália | **disclosure presa ao dado** | a procedência |
| sidebar | navegação compacta | o "você está aqui" |
| ações | primária visível, resto em menu | a **prioridade** |
| progresso | empilhado | os **4 eixos** — nunca vira barra única |

> **O mobile nunca perde informação relevante só porque não coube. Ele reorganiza.**

⚠️ D32 vale para superfície **nova**. Hoje só **24 de 96** arquivos usam breakpoint — o legado
converge por missão, sem promessa global.

---

## 9. i18n

🔒 PT-BR e EN em **todo** componente. Nenhum texto hardcoded fora da solução canônica. Orçamento de
**+30 %** EN→PT-BR; nenhum componente com largura fixa de rótulo. **Tema não entra como requisito**
enquanto D23 vigorar.

---

## 10. D37 — as oito combinações

🔒 `{ pt-BR, en } × { light, dark } × { mobile, desktop }` são **estados de teste do componente**,
não tarefas finais de QA. Componente sem prova nessas dimensões está **incompleto**.

> Enquanto P31 não for autorizada, o eixo de tema tem **um** valor — a matriz é `2 × 1 × 2 = 4`.
> A estrutura já prevê os dois; o segundo tema não existe.

---

## 11. D36 — mock é transporte, não domínio

🔒 Detalhe completo em `FRONT-ARCHITECTURE-AND-MOCK-CONTRACT.md`. Aqui vale a consequência visual:
**nenhum componente do DS conhece fixture, scenario ou flag de mock.**

---

## 12. O que falta para esta Constituição virar Regra de Ouro

Ela **não é permanente ainda**. A prova que falta:

| # | prova |
|---|---|
| 1 | **um vocabulário de token** existir de fato, com mutação de duplicidade falhando |
| 2 | **um primitive real** (chip de estado semântico) sobrevivendo às combinações de D37, com V6 provado em escala de cinza e daltonismo |
| 3 | **um pattern real** — indicador + marginália — com A3 provado no mobile |
| 4 | **RES-01** construída inteira sob estas regras sem que nenhuma precise ser dobrada |
| 5 | **crítica adversarial do território** aplicada a superfície real, não a componente isolado |
| 6 | os gates de fronteira de §3 falhando por mutação |

Enquanto isso, o selo geral é 🔶 **PROVISIONAL UNTIL FIRST REAL SURFACES**, exceto onde marcado 🔒.
