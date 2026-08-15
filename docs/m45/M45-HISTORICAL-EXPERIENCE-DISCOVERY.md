# M45.1 · HISTORICAL EXPERIENCE DISCOVERY — M01–M40

Discovery documental sobre `c95a4eb`. **Zero código de produto.** Nenhum hardening executado: este
documento produz o mapa que os torna executáveis.

---

## 0. Realinhamento da umbrella — o que `c95a4eb` é, e o que não é

O checkpoint anterior escreveu **"M45 · 18 UI GATES — CLOSED"**. Aquilo **não é apagado**, e
descrevia corretamente o que foi medido: os 18 gates, sobre as **superfícies que a matriz alcançou**.

O que ele **não** era é fechamento global da umbrella. A própria campanha provou o motivo: features
individualmente verdes formaram experiência transversal defeituosa, e o mesmo raciocínio se aplica
às 40 missões que fecharam antes de os gates atuais existirem.

| item | estado |
|---|---|
| **M45.0 · RECENT / CROSS-FEATURE HARDENING** | **CLOSED** — 17 PASS · G12 N/A · heurísticas 9,3 |
| **M45 · umbrella** | **OPEN** |
| **M46** | **NOT READY** |

---

---

## ⚠️ ERRATA — esta Discovery está INCOMPLETA, e a lacuna é minha

**Escrita em 2026-08-15, logo após o commit `d7c636b`.**

O Passo 0 desta missão mandava começar por **Vault INDEX**, **Golden Rules**, **Architecture
INDEX** e **Blueprint vault**. **Eu não abri o vault.** Pior: listei *"Blueprint vault"* na seção
"Autoridades lidas" abaixo — uma afirmação falsa, no mesmo documento que existe para separar o que
foi medido do que foi presumido.

**O que a leitura tardia do vault (`Documents\Obsidian\Sentinela OS`, 352 notas) mostrou:**

1. **O `INDEX.md` me absolve numa parte:** *"para os documentos mutáveis do Front que também
   existem no repositório, a cópia viva e autoritativa é a do repo. O vault não concorre com ela."*
   Usar Blueprint e PLAN do repo estava **certo**.

2. **E me condena na outra:** o vault é o **router**, e carrega o que o repo não tem —
   `REGRA DE OURO ZERO` (que se declara *"primeira leitura obrigatória de QUALQUER sessão"*),
   `02 - Arquitetura/Owners e Fronteiras`, `04 - Decisões` (35 notas) e **`07 - Validações`**
   (mais de 150 notas).

3. **Existem registros de fechamento do Front**, organizados por **Onda/Fase** e não por número de
   missão — que é exatamente por que minha busca por `DOC-CLOSE*.md` no repo não achou nada:
   `VAL - Onda 6 E1 Fundação canônica` · `E2-E3 jornada prepare-upload-submit-track` ·
   `E4-E6 listagem, retomada, retry` · **`E5-E7 Resultado canônico e consolidação visual`** ·
   `ENCERRAMENTO OFICIAL` · `Front V1 Fase 2 e 3 (M18-M21, BD07, BD08)`.

4. **E `docs/onda6/` existe DENTRO do repo** — `E1-baseline-quarantine`, `E5-microdiscovery-
   resultado`, `E5-massa-sintetica-proveniencia`, `E7-consolidacao-visual`. Eu listei a pasta no
   início da missão e não abri um arquivo sequer.

### O que isso invalida

| seção | afirmação | estado |
|---|---|---|
| **§2** | *"não existe DOC-CLOSE para M01–M41; o fechamento está inline no PLAN"* | **FALSA como conclusão.** O artefato existe, com outro nome (`VAL -`), noutro lugar (vault) e noutro eixo (Onda/Fase). O que é verdade é só a parte literal: não há `DOC-CLOSE*.md` no repo para elas |
| **§6** | Resultado · ARGOS · Analytics · Comparação = **NO CREDIT** | **NÃO SUSTENTADA.** `VAL - Onda 6 E5/E7` registra, para a superfície de Resultado: contraste medido no DOM vivo (5 reprovações achadas e corrigidas), tokens fantasma + gate permanente, responsividade em 3 viewports, i18n 94/94 EN↔PT e axe sem violações |
| **§9** | prioridade P0 de M45.3 e M45.4 | **SUSPEITA** — foi derivada do crédito acima |
| **§8** | riscos históricos de a11y/i18n/responsive | **provavelmente superestimados** para as superfícies da Onda 6 |

### O que continua de pé

O ledger das 40 (§3), o mapa de rotas e alcançabilidade (§4), o mapa de invariantes (§5) e a
medição de **17 superfícies sem scenario** (§7) — inclusive `ARG-01` e `ANL-01` como rotas vivas
sem massa. Nada disso dependia do vault.

### Reentrada exata

**M45.1 precisa de uma segunda passada** que: leia `REGRA DE OURO ZERO`, `Owners e Fronteiras` e o
`INDEX - Arquitetura`; cruze as **VAL notes de Onda 6 e Fase 2/3** contra as missões M16–M40;
releia `docs/onda6/*`; e **re-derive o crédito e a prioridade das tranches** a partir disso.

Até lá, o **TRANCHE PLAN abaixo não deve ser executado** — a ordem das P0 pode mudar.

---

## 1. Autoridades lidas

PLAN vivo (`FRONT-V1-IMPLEMENTATION-PLAN.md`) · Blueprint vivo (`EXPERIENCE-BLUEPRINT-V1.md`, §3.1
IA, §4 superfícies, §11 catálogo, §19 gates, §20 matriz) · Product Freeze · Design System
Constitution · Front Architecture & Mock · divergence registry (`divergenciaDeclarada.ts`) ·
catálogo de scenarios (código, autoridade operativa) · router vivo · `M45-IMPLEMENTATION-AUTHORITY`
· `docs/m45/DOC-CLOSE.md` (M45.0) · DOC-CLOSE de M42 e M44.

**Regra aplicada:** a cadeia viva decide; documento histórico não vence decisão posterior válida.

---

## 2. Um achado que muda o método: **não existe DOC-CLOSE para M01–M41**

Medido: `docs/**/DOC-CLOSE*.md` existe **apenas** para **M42, M44 e M45**.

O fechamento de M01–M40 está **inline no PLAN**, em marcadores (`— EXECUTADA`, `— CONCLUÍDA`) e nos
blocos de evidência de cada entrada. Não é ausência de prova — é **outro formato de prova**, e ele
não carrega o que um DOC-CLOSE carrega: achados, correções, instrumento, dívida e hash.

**Consequência para o plano:** para M01–M40 a pergunta *"foi pente-fino?"* **não pode** ser
respondida pelo artefato de fechamento, porque ele não existe nesse formato. Ela só pode ser
respondida por **reexecução dirigida**, e é isso que as tranches abaixo organizam.

Classificação do status documental das 40: **DOC-CLOSE = NO (formato próprio) · PLAN = YES**.

---

## 3. Entregável A — LEDGER M01–M40

`A` surface · `B` journey · `C` invariant · `D` infrastructure · `E` proof · `F` superseded ·
`G` legacy/removed · `H` debt only.

| M | título | fase | Pré (literal) | classe | vive? | onde vive hoje | authority posterior | tranche |
|---|---|---|---|---|---|---|---|---|
| M01 | Cadeia Keycloak provada | 0 | autorização (dec. 5) | **E** | sim, como regra | fluxo OIDC | M02 | T6 |
| M02 | Erradicação do Supabase Auth | 0 | M01 fechada | **C** | sim | `supabase-zero.identidade.gate` | — | T6 |
| M03 | Remoção de dependências mortas | 0 | nenhuma | **D** | sim | árvore | M07 | — |
| M04 | Fronteira: DS não conhece domínio | 0 | nenhuma | **C** | sim | `design-boundary` | — | T5 |
| M05 | Fronteira: mock não vaza | 0 | — | **C** | sim | `mock-boundary` | — | T5 |
| M06 | Fronteira: biblioteca ≠ API de página | 0 | — | **C** | sim | `biblioteca-boundary` | — | T5 |
| M07 | Gate anti-monólito | 0 | — | **C** | sim | `anti-monolito` | M44 (extração) | T5 |
| M08 | Vocabulário único de tokens | 1 | M03 | **C** | sim | `design-tokens-unico` | — | T5 |
| M09 | Tokens de motion + reduced motion | 1 | — | **C** | sim | `motion-tokens` | — | T5 |
| M10 | Primitives | 1 | M08, M04 | **D** | sim | `components/ui` | — | T5 |
| M11 | `StatusBadge` — semântica única | 1 | M08, M10 | **C** | sim | badge + G17 | — | T1 |
| M12 | `ProvenanceMargin` | 1 | — | **A** | sim | RES-01, Instância | — | T1 |
| M13 | Patterns fundamentais | 1 | M10, M11 | **D** | sim | `design/patterns` | M42 (`ErrorState`) | T5 |
| M14 | i18n — infra e paridade | 1 | — | **C** | sim | `i18n-paridade` | M41 (conta manda) | T6 |
| M15 | Storybook + infra visual | 1 | — | **D** | sim | `storybook-fonte-unica` | — | — |
| M16 | MSW no browser | 2 | — | **D** | sim | `mocks/browser` | — | — |
| M17 | Fixtures presas ao schema | 2 | — | **C** | sim | `fixtures-presas-ao-schema` | BD07/WS-A | T5 |
| M18 | Catálogo dos 27 scenarios | 2 | — | **C** | sim | catálogo (62) | **M45.0** (invariante ≠ contagem) | — |
| M19 | Gates de import do mock | 2 | — | **C** | sim | `mock-import-gates` | — | T5 |
| M20 | Cliente `/progress` | 3 | BD07 | **D** | sim | `progress-client` | — | T2 |
| M21 | Cliente `/analytics` | 3 | — | **D** | sim | `AnalyticsView` | BD08 | T3 |
| M22 | Cliente `/export/download` | 3 | — | **D** | sim | export em RES-01 | — | T2 |
| M23 | Cliente `/timeline` | 3 | — | **D** | sim | `timeline-client` | — | T2 |
| M24 | Rotas públicas e redirects | 4 | M02 | **A** | sim | `/`, `/login`, legais | — | **T6** |
| M25 | Shell, workspace context, menu | 4 | — | **A** | sim | `AppShell`, Sidebar | **M45.0** (IA: `/instances`) | **T6** |
| M26 | RES-01 — composição e atenção | 5 | M11–M13, M21 | **A** | sim | `/analyses/:id/result` | M39 (Two-View) | **T2** |
| M27 | RES-01 — analytics, partial/withheld | 5 | M21, M26 | **A** | sim | idem | BD08 | **T3** |
| M28 | RES-01 — Trust e timeline | 5 | M21, M23, M12 | **A** | sim | idem | — | T2 |
| M29 | RES-01 — export | 5 | M22 | **B** | sim | idem | — | T2 |
| M30 | RES-01 — comparação com a anterior | 5 | M26 | **B** | **F** parcial | superseda por EVO-02 v3 | **M39** | T4 |
| M31 | RES-01 — hardening | 5 | M26–M30 | **C** | sim | contraste da nav | **M45.0** (mesma classe) | T2 |
| M32 | HOME-01 | 6 | M25, M20, M31 | **A** | sim | `/home` | — | **T1** |
| M33 | AN-01 — nova análise e upload | 7 | M25, M13 | **B** | sim | `/analyses/new` | M37 (contexto) | **T1** |
| M34 | AN-03 — processamento e recovery | 7 | M20, M33 | **B** | sim | `/analyses/:id` | — | **T1** |
| M35 | AN-04 — falhas terminais | 7 | M33 | **B** | sim | idem | M44 (reentrada) | **T1** |
| M36 | INST-01/03 — visão e histórico | 9 | BD02 congelada | **A** | sim | `/instances`, `/instances/:id` | M42, **M45.0** (IA) | **T4** |
| M37 | INST-04 — nova análise da Instância | 9 | M36 | **B** | sim | CTA na Instância | — | **T4** |
| M38 | EVO-01 — histórico cronológico | 10 | — | **A** | sim | `/analyses` | — | **T1** |
| M39 | EVO-02 — comparação ARGOS A×B | 10 | — | **A** | sim | `/analyses/compare/:a/:b` | realinhada (escopo reduzido) | **T3** |
| M40 | INST-05 — baseline explícito | 10 | — | **A** | sim | régua na Instância | — | **T4** |

**Nenhuma missão omitida · 40 linhas · nenhuma classificada `G` (removida).**

Contagem: **A** 12 · **B** 6 · **C** 12 · **D** 8 · **E** 1 · **F** 1 (M30, parcial) · **G** 0 ·
**H** 0.

---

## 4. Entregável B — LIVE EXPERIENCE MAP

**39 rotas** declaradas. Recorte por alcançabilidade:

| # | experiência | rota | origem | scenarios | alcançável por | risco |
|---|---|---|---|---|---|---|
| E1 | Home | `/home` | M32 | `needs-mapping`(parcial), `list-pagination` | shell | **P0** |
| E2 | Lista de análises | `/analyses` | M38 | `list-pagination` | shell | P1 |
| E3 | Nova análise | `/analyses/new` | M33 | `analysis-uploading`, `upload-*` | CTA | **P0** |
| E4 | Análise (ciclo de vida) | `/analyses/:id` | M34, M35 | `engine-*`, `analytics-*`, `both-failed` | CTA, **deep link M44** | **P0** |
| E5 | Resultado | `/analyses/:id/result` | M26–M31 | 11 scenarios | CTA | **P0** |
| E6 | ARGOS | `/analyses/:id/argos` | M39/Two-View | **NENHUM** | CTA | **P0** |
| E7 | Analytics | `/analyses/:id/analytics` | M21, M27 | **NENHUM** | CTA | **P0** |
| E8 | Comparação | `/analyses/compare/:a/:b` | M39 | 4 scenarios | CTA | P1 |
| E9 | Instâncias | `/instances` | M36 | `instance-present` | **shell (M45.0)** | P1 |
| E10 | Instância + baseline | `/instances/:id` | M36, M37, M40 | `instance-history`, `baseline-*` | shell, CTA | P1 |
| E11 | Configurações | `/dashboard/settings` | pré-M41 → M41/42/44 | 12 scenarios | menu do usuário | **coberto** |
| E12 | Workspaces | `/workspaces` | M25 | `workspace-empty` | shell | **coberto** |
| E13 | Público/legal | `/`, `/terms`, `/privacy`, `/security` | M24 | — | direto | P1 |
| E14 | Auth/reentrada | `/login`, `/auth/callback`, `/session-expired` | M01, M02, M24 | `session-expired` | fluxo | **P0** |

**Rotas de compatibilidade** (não são IA pública): `/dashboard`, `/dashboard/history{,/:id}`,
`/dashboard/analysis`, `/dashboard/workspaces`, `/canonical/analyses{,/*}`, `/manage-context`,
`/profile`. **Rota fora do freeze:** `/aion`. **Nenhuma rota morta** identificada.

### Lacuna de alcançabilidade

Nenhuma, após a M45.0 ter entrado `/instances` na navegação. **`Configurações` continua fora do
menu principal** apesar de o Blueprint §3.1 a listar lá — registrado na M45.0 como T5, e é decisão
de produto, não hardening.

---

## 5. Entregável C — INVARIANT MAP

| ID | invariante | origem | instrumento | reprovar na M45? |
|---|---|---|---|---|
| I1 | semântica ÚNICA de estado público | M11 | `StatusBadge` + G17 | **sim** — T1 |
| I2 | procedência colada ao dado | M12 | `ProvenanceMargin` | sim — T1 |
| I3 | DS não conhece domínio nem query | M04 | `design-boundary` | não — gate vivo |
| I4 | mock não vaza para produção | M05, M19 | `mock-boundary`, `mock-import-gates` | não |
| I5 | biblioteca externa ≠ API de página | M06 | `biblioteca-boundary` | não |
| I6 | anti-monólito (1000 linhas) | M07 | `anti-monolito` | não — pegou a M44 |
| I7 | vocabulário único de tokens | M08 | `design-tokens-unico` | não |
| I8 | zero `#hex` em componente | M08/E7 | `hardcodeDeclarado` | não |
| I9 | paridade i18n + orçamento +30 % | M14 | `i18n-paridade` | não |
| I10 | fixture presa ao schema publicado | M17 | `fixtures-presas-ao-schema` | não |
| I11 | scenario reproduzível **por nome** | M18 | `scenarios-catalogo` G2 | **feito na M45.0** |
| I12 | backend-first: front não recalcula ausência | M26–M28 | parcial | **sim** — T2 |
| I13 | `partial`/`withheld` ≠ `failed` | M27 | `res01-*` | **sim** — T3 |
| I14 | anti-oracle: causas colapsadas não se separam | M35, BD02 | por missão + G11 | **sim** — T1 |
| I15 | rota canônica; `/canonical/*` é interna | M24, M39 | `rotas-publicas`, RG3 | sim — T6 |
| I16 | identidade estável: rename ≠ recreate | M36 | M42 | coberto |
| I17 | comparabilidade: vocabulário mudou ⇒ não compara | M39 | `evo02-m39-freeze` | **sim** — T3 |
| I18 | baseline é escolha explícita, nunca automática | M40 | `m40-massas-baseline` | **sim** — T4 |
| I19 | indisponível ≠ inexistente ≠ ausente | M35 → M42/M44 | G11 + por missão | **feito na M45.0** |

---

## 6. Entregável D — COVERAGE MAP (18 gates × experiências)

**Crédito do M45.0**, aplicado com critério — *"cobriu a experiência histórica ou apenas passou por
ela?"*:

| experiência | crédito | por quê |
|---|---|---|
| E11 Configurações | **FULL** | M41/42/44 + M45.0; copy, critique, heurísticas, axe, PT/EN, responsive |
| E12 Workspaces | **FULL** | i18n e contraste corrigidos na M45.0; axe e responsive medidos |
| E9/E10 Instâncias | **PARTIAL** | J3/J4 na matriz cobriram navegabilidade, axe, responsive, PT/EN. **Não** cobriram baseline, histórico paginado, nem `/analyses/new` a partir dela |
| E2 Lista, E4 Análise | **PARTIAL** | J1/J2 cobriram terminal, axe, responsive, os três estados. **Não** cobriram upload, recovery, progressão |
| E1 Home | **INCIDENTAL** | J7 só provou estado terminal e axe |
| E5 Resultado, E6 ARGOS, E7 Analytics, E8 Comparação | **NO CREDIT** | **a matriz nunca visitou estas rotas** |
| E13 público, E14 auth | **NO CREDIT** | fora da matriz |

> **A suíte integral passar (288/288) não dá crédito.** Ela prova ausência de regressão, não
> pente-fino de experiência. Os dois são registrados separadamente: **REGRESSION COVERED** ≠
> **EXPERIENCE HARDENED**.

**Gate 12: `N/A · CONDITION FALSE` globalmente**, por decisão de owner. Não reaberto.

---

## 7. Lacunas medidas (não corrigidas)

**17 superfícies sem scenario**, derivado das 38 do Blueprint contra o catálogo:

`ANL-01` · `ARG-01` · `AUTH-01` · `AUTH-02` · `AUTH-03` · `AUTH-05` · `AUTH-06` · `ERR-401` ·
`ERR-409` · `ERR-422` · `EVO-03` · `INST-02` · `INST-06` · `INST-07` · `WS-02` · `WS-03` · `WS-04`

> **O §20 do Blueprint dizia 8, e nunca foi uma derivação completa** — ele contava apenas as que
> alguém listara à mão, e nunca incluiu `ARG-01`, `ANL-01`, as `AUTH-*` nem as `ERR-*`. A correção
> que fiz no checkpoint de autoridade (8 → 5) corrigiu **a lista dele**, não o universo. Este é o
> primeiro cruzamento completo.

**Separando por causa:**

- **falta de PRODUTOR** (não é cronograma): `INST-02`, `INST-06`, `INST-07`
- **APPROVED DELTA** (fora da V1 viva): `EVO-03`, `WS-02`, `WS-04`
- **FUTURE**: `AUTH-06`
- **transversais, cobertas por estado e não por scenario próprio**: `ERR-401/409/422`
- **🔴 rotas VIVAS sem scenario nenhum**: **`ARG-01` e `ANL-01`** — e são exatamente as duas que o
  M45.0 **não visitou**. É a lacuna mais séria desta Discovery
- **auth**: `AUTH-01/02/03/05` — fluxo real, coberto por `rotas-publicas` e pelo bypass, sem
  scenario nomeado

**Catálogo remedido: 62 entradas · 57 disponíveis · 3 parciais · 2 bloqueadas.** O invariante
(reprodutibilidade por nome) passa — 97/97 no gate.

**CTA sem operação (M01–M40): 3** — `AN-02` "Confirmar interpretação", `WS-02` "Criar Workspace",
`EVO-03` "Definir baseline". Distinto de **operação sem consumidor** (B1), que é a inversa.

**B1 · `POST /v1/instances`**: publicada pela **BD02** em bloco com as demais de Instance. Produtor
existe. **Nenhuma missão M01–M40 pretendia possuí-la** — o Discovery §9.1 tem o nó *"Criar primeira
Instância"*, mas Blueprint não tem superfície e PLAN não tem missão. Permanece dívida **fora** da
umbrella M45.

---

## 8. Riscos históricos por eixo

| eixo | superfícies de maior risco | por quê |
|---|---|---|
| **instrumento** | E5, E6, E7, E8 (M26–M31, M39) | fecharam **antes** das regras atuais: `GATE_VAZIO`, âncora positiva, estado terminal, provador de captura, mutação com match |
| **i18n** | E1, E5, E6, E7 | nasceram antes de a **conta** mandar no idioma (M41). O padrão que a M45.0 achou em Workspaces — hardcode em inglês — é desta época |
| **a11y** | E1, E6, E7, E13, E14 | axe real só passou a ser rotina em M31 e depois M42/M44. Os dois achados de contraste da M44/M45.0 são desta família |
| **responsive** | E5, E6, E7, E8 | evidência parcial; o gate transversal só nasceu na M45.0 — **e ele não podia falhar** até ser corrigido |
| **copy** | E4, E5, E6 | vocabulário de estado anterior à normalização de voz da M45.0 |

---

## 9. Entregável E — TRANCHE PLAN

| tranche | escopo | origem | experiências | prioridade |
|---|---|---|---|---|
| **M45.2 · JORNADA DA ANÁLISE** | entrada → upload → processamento → falha terminal, e a Home que a inicia | M32–M35, M38, M11 | E1, E2, E3, E4 | **P0** |
| **M45.3 · RESULTADO** | RES-01 inteiro: composição, atenção, trust, timeline, export | M26–M31, M20, M22, M23 | E5 | **P0** |
| **M45.4 · TWO-VIEW** | ARGOS + Analytics + comparação — **as duas sem scenario nenhum** | M21, M27, M39 | E6, E7, E8 | **P0** |
| **M45.5 · INSTÂNCIA E BASELINE** | lista, histórico paginado, nova análise pela Instância, régua | M36, M37, M40 | E9, E10 | P1 |
| **M45.6 · FUNDAÇÃO E FRONTEIRAS** | invariantes sem tela própria: DS, tokens, mock, anti-monólito, fixtures | M03–M10, M13, M15–M19 | — | P2 |
| **M45.7 · PÚBLICO, AUTH E SHELL** | landing, legais, login, callback, sessão expirada, IA e navegação | M01, M02, M24, M25, M14 | E13, E14, shell | P1 |
| **M45.8 · CONSOLIDAÇÃO TRANSVERSAL** | integração ponta a ponta sobre o conjunto **completo**, com as tranches fechadas | todas | todas | **fecha a umbrella** |

**Sete tranches** (M45.2–M45.8), 3–4 experiências cada. **M45.8 é a final transversal** e é ela que
fecha a umbrella — não repete as verticais, prova costura: shell, continuidade de rota, PT/EN,
responsive, a11y, copy cruzada, erros, carregamento e as costuras de propriedade.

**Ordem recomendada:** M45.4 primeiro entre as P0 — é a única com **rota viva e zero scenario**, e
scenario ausente significa que nem massa existe para exercitar a experiência.

---

## 10. Condições para a M46

A M46 **não fica pronta** enquanto: as sete tranches não fecharem; `ARG-01`/`ANL-01` não tiverem
scenario; e o crédito **NO CREDIT** de E5–E8 e E13/E14 não virar cobertura real.

Dívidas que **não** bloqueiam: `CONTRACT AUTHORITY DISCOVERY` · B1 · as três de topologia de
release · as 3 falhas de backend (`NOT MEASURED HERE`) · lint baseline 23 (delta zero) · as 12
capturas EN-only da M40 (absorvidas: a evidência PT/EN atual sai na **M45.5**).

---

### ~~M45.1 · HISTORICAL EXPERIENCE DISCOVERY — PASS · TRANCHE PLAN READY~~

### **M45.1 · HISTORICAL EXPERIENCE DISCOVERY — INCOMPLETE · VAULT NOT READ**

O veredito original está riscado, não apagado: ele foi emitido sem o vault, que o Passo 0 exigia
primeiro. Ver a **ERRATA** no topo.

**Próximo checkpoint:** `M45.1b · SEGUNDA PASSADA COM O VAULT` — reler o router e as VAL notes, e
**re-derivar crédito e prioridade**. `M45.4` continua sendo a candidata mais provável a P0 (as duas
superfícies sem scenario), mas isso agora é hipótese, não conclusão medida.
