# M45.0 · RECENT / CROSS-FEATURE HARDENING — DOC-CLOSE

Fechamento local. **Sem push, sem deploy, sem Railway.** **M45 não é o Experience Freeze** — o
marco é da M46.

> **Realinhamento posterior (M45.1, 2026-08-15).** Este documento foi escrito como
> **"M45 · OS 18 GATES DE UI COMPLETE"** e declarava **"M45 — CLOSED"**. Isso **fica**, e descrevia
> corretamente o que foi medido: os 18 gates sobre as superfícies que a matriz transversal
> alcançou.
>
> O que ele **não** era é fechamento da umbrella. A própria campanha provou o motivo — features
> individualmente verdes formaram experiência transversal defeituosa —, e esse raciocínio se aplica
> igualmente às 40 missões que fecharam **antes** de os gates atuais existirem. A Discovery
> histórica mediu o crédito real: **E5 (Resultado), E6 (ARGOS), E7 (Analytics) e E8 (Comparação)
> receberam NO CREDIT — a matriz nunca visitou essas rotas.**
>
> Passa a ser **M45.0**, com a umbrella **OPEN**. Ver
> [`M45-HISTORICAL-EXPERIENCE-DISCOVERY.md`](./M45-HISTORICAL-EXPERIENCE-DISCOVERY.md).

---

## 1. A pergunta que esta missão fez

As missões anteriores perguntaram *"esta feature passou?"*. Esta perguntou outra coisa: **as
features que já passaram formam uma experiência coerente quando vistas juntas?**

A diferença não é retórica. Os cinco defeitos encontrados aqui estavam **todos** em superfícies
verdes, e nenhuma suíte por missão podia vê-los — porque cada uma media a si mesma.

## 2. Os 18 gates

| # | gate | instrumento | resultado |
|---|---|---|---|
| 1 | superfícies REAL navegáveis | `m45-matriz` G1 (J1–J7) | **PASS** — 7 superfícies, estado terminal asserido |
| 2 | scenario reproduzível por nome | `scenarios-catalogo` G2 | **PASS** — 60 invocáveis, 2 bloqueados recusam, casamento bidirecional |
| 3 | nenhum dado exclusivo do mock | `fixtures-presas-ao-schema` | **PASS** |
| 4 | CTA com operação ou bloqueado | §20 realinhado | **PASS** — restam 3 declarados (AN-02, WS-02, EVO-03) |
| 5 | responsive | `m45-matriz` G5 | **PASS** — 3 larguras × 7 superfícies |
| 6 | PT/EN sem hardcode, orçamento +30 % | `m45-matriz` G6 + `i18n-paridade` | **PASS** — 45, delta zero |
| 7 | a11y · axe · teclado | `m45-matriz` G7 | **PASS** — 0 aplicáveis em J1–J7 |
| 8 | `/design-critique` | executada | **PASS** — 3 achados |
| 9 | `/ux-heuristics` **≥ 9,0** | executada | **PASS** — 9,3 |
| 10 | `/ux-copy` | executada | **PASS** — voz normalizada |
| 11 | erro/vazio/carregando distintos | `m45-matriz` G11 | **PASS** |
| 12 | **visual regression** | — | **N/A · CONDITION FALSE** (ver §3) |
| 13 | fronteiras | `*-boundary` | **PASS** |
| 14 | zero vocabulário interno | G1 varre as 7 | **PASS** |
| 15 | zero `#hex` | `hardcodeDeclarado` | **PASS** |
| 16 | token único | `design-tokens-unico` | **PASS** |
| 17 | semântica única de estado | G11 + gates de missão | **PASS** |
| 18 | paridade i18n | `i18n-paridade` | **PASS** |

**17 PASS · 1 N/A · zero SKIPPED tratado como PASS.**

## 3. Gate 12 — registrado literalmente

```
Infrastructure present?   NO
Gate condition:           FALSE
Result:                   N/A · CONDITION FALSE
```

Nenhuma baseline criada. Nenhuma ferramenta instalada por causa dele. A condição *"quando a
infraestrutura existir"* faz parte do gate, e ela é falsa hoje.

**Dívida/opção futura, se o owner quiser:** estabelecer a baseline **antes** da próxima campanha
que altere experiência congelada — nunca depois de a versão estar pronta, porque a primeira
fotografia viraria "verdade" e aprovaria a si mesma.

## 4. Os cinco defeitos que só a passada transversal encontrou

**T1 · Um ramo inteiro do produto era inalcançável pelo shell.** `/instances` é superfície REAL,
com três sub-superfícies e três missões entregues (M36, M37, M40), e **não tinha item na
navegação**. Só se chegava a uma Instância por dentro de uma análise ou colando a URL.

A IA do Blueprint §3.1 **sempre listou** `Instancias` no menu principal — marcada `:::delta`,
porque na M25 o delta da BD02 não existia. A BD02 fechou e o shell nunca acompanhou. Isso é
**navegação obsoleta**, não decisão de produto, e a linha vermelha 3 não dispara.

O sintoma já tinha aparecido como remendo: a página de erro da Instância ganhou um link "View all
instances" próprio na M42 **porque a lateral não oferecia volta**.

**T2 · Uma superfície REAL inteiramente em inglês.** `WorkspacesPage` tinha título, subtítulo,
vazio, erro, papéis, "Active" e "Switch" **hardcoded** — o produto não falava a língua da pessoa
naquela rota, independente da preferência da conta. Violação literal do gate 6.

**T3 · Dois chips abaixo de AA.** `Active` em 3.56:1 e `Saved` em 4.12:1, ambos a 12px. Nenhuma
suíte rodava axe naquelas superfícies: a da M42 roda na Instância, a da M44 em Settings. A matriz
transversal foi a primeira a varrer as sete.

**T4 · Três vozes para o mesmo ato de falha.** "Couldn't…", "We couldn't…" e "We could not…" — e
**três delas conviviam na mesma página** de Configurações. Normalizadas em 10 strings.

**T5/T6 · Registrados, não corrigidos.** `Configurações` está no menu principal do Blueprint e vive
só no menu do usuário — reverter a decisão explícita da M25 é produto. E dois textos de vazio para
o mesmo fato (`No workspaces yet` × `No workspace access`), severidade 1.

## 5. Dois gates MEUS que não mediam nada

**G5 · responsive não podia falhar.** Ele lia `scrollWidth - clientWidth` do documento, e o
`AppShell` tem `overflow-x-hidden`: um elemento mais largo que a viewport é **clipado**, não vira
rolagem, e a conta fica em zero para sempre. A mutação 7 provou — injetou `min-w-[2000px]` no frame
e passou verde. Passou a medir a **geometria** de cada elemento contra a largura da viewport, que é
o que a pessoa vê: conteúdo cortado na borda.

**G1 · a âncora de J7 era `/./`** — casava a existência de um caractere. Trocada pela frase que a
Home só imprime depois de decidir o que mostrar.

Os dois são a mesma classe que o programa vem colecionando: **um gate cujo alcance não corresponde
à sua afirmação**.

## 6. Mutação — 7/7, selecionadas por risco

Não repetiu M41–M44: cada uma já congelou os invariantes da sua superfície, e reexecutá-las seria
volume. Entraram só os invariantes **transversais**, que nenhuma missão anterior podia proteger.

Primeira rodada: **4/7**. Os três não-mortos foram **instrumento**, não código:

- **inerte por região**: a mutação de idioma atacava a barra lateral, e o gate ancora no `main`;
- **âncora em arquivo errado**: `subscription-absent` mudou de `catalogo.ts` para `assinaturas.ts`
  na extração por anti-monólito da M44;
- **gate que não podia falhar**: o responsive, descrito em §5 — e essa sobrevivência foi o achado
  mais valioso da campanha.

## 7. Provas

| medida | resultado |
|---|---|
| Typecheck | **APROVADO** — 6 projetos, 364 arquivos |
| Vitest (origem declarada) | **117/117 arquivos · 1644/1644 testes** |
| Playwright integral | **288/288** |
| Playwright · matriz M45 | **23/23** |
| axe | **0 violações aplicáveis** em J1–J7 |
| Mutação transversal | **7/7 mortas pelo gate nomeado** |
| Lint | 23 problems (9 erros, 14 warnings) — **delta ZERO** |

**Sem `SENTINELA_CONTRACT_ORIGIN`**, os gates de contrato ficam SKIPPED/ambíguos — e **pulado não é
verde**. A dívida `CONTRACT AUTHORITY DISCOVERY` continua aberta e não foi resolvida por carona.

## 8. Dívidas — enumeradas, nenhuma mascarada

| dívida | estado |
|---|---|
| **B1 · `POST /v1/instances`** | **1**, remedido. Órfã sem missão dona. Nenhum consumidor artificial criado |
| **`CONTRACT AUTHORITY DISCOVERY`** | aberta; não bloqueia a M45 local |
| **3 falhas de `POST /v1/analyses/{id}/data`** | backend. **NOT MEASURED HERE** — a M45 é Front e não as executa. Não sumiram |
| **T5 · Configurações fora do menu principal** | registrada; reverter decisão da M25 é produto |
| **T6 · dois vazios para um fato** | registrada, severidade 1 |
| **release topology** (Account · Workspace · Dispatcher) | preservadas; bloqueiam **promoção**, não o hardening local |
| **12 capturas EN-only da M40** | **absorvidas**: as journeys equivalentes provam PT e EN por conteúdo renderizado (G6). Não é reparo do artefato histórico |

## 9. Vocabulário final

**FRONT LOCAL UI HARDENING** — o que esta missão entrega. **Não** é `PRODUCTION READY`: isso exige
integração real (M47), contract parity e as três dívidas de topologia.

## 10. Estado

| item | estado |
|---|---|
| M41 | **CLOSED** |
| M42 | **CLOSED** · quality gate 9,2 |
| M43 | **CLOSED AS PROOF** |
| M44 | **CLOSED** |
| **M45.0** | **CLOSED — 17 PASS · 1 N/A · CONDITION FALSE** |
| **M45 · umbrella** | **OPEN** — sete tranches, ver a Discovery histórica |
| M46 | **NOT READY** |

### **M45.0 · RECENT / CROSS-FEATURE HARDENING — CLOSED · 17 PASS · G12 N/A CONDITION FALSE**

> A linha original dizia **"READY FOR M46"**. Ela valia para o recorte medido, e não para a
> umbrella: a M45.1 mediu que quatro experiências centrais — Resultado, ARGOS, Analytics e
> Comparação — não receberam crédito nenhum desta campanha.

**Próximo checkpoint:** `M45.4 · TWO-VIEW HARDENING`, recomendado por ser a única tranche P0 cujas
superfícies vivas (`ARG-01`, `ANL-01`) **não têm scenario nenhum**.
