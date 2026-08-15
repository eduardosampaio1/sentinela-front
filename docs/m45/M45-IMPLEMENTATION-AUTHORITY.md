# M45 · IMPLEMENTATION AUTHORITY

Produzido pelo checkpoint de autoridade em 2026-08-15, sobre `34c7c79`. **Zero feature code.**

> Este documento **não** é a M45. Ele é o que a M45 precisa ter respondido antes de começar.

---

## 0. Duas correções de autoridade, antes de tudo

**(a) M45 NÃO é o Experience Freeze.** O PLAN é literal:

| fase | missão | fecha com |
|---|---|---|
| **13** | **M45** — *Os 18 gates de UI COMPLETE* | 18 gates verdes |
| **14** | **M46** — *UI EXPERIENCE FREEZE* | 🏁 marco |

E o §6 do PLAN: *"🏁 UI EXPERIENCE FREEZE · ponto exato: **fim de M45, registrado em M46**"*.

A M45 **roda os gates**; a M46 **registra o marco**. Um briefing que as funda numa só pediria à M45
que declarasse um marco que não é dela.

**(b) M45 não tem `Pré:` textual.** É a única missão da Fase 12–16 sem essa linha — a M44, ao lado,
tem *"**Pré:** M43, M24"*. A pré-condição da M45 vive **no grafo de dependências**, e só lá:

```
M32 & M33 & M36 & M39 & M40 & M42 & M44 --> M45
M13 --> M14 --> M45
```

Isso não é ambiguidade: é uma pré-condição declarada em outra notação. Fica registrada em texto
abaixo para que a próxima leitura não precise reconstruí-la do diagrama.

---

## 1. Pré-condição — literal, e verificada

| missão | o que é | estado | prova |
|---|---|---|---|
| M13 | fundação do DS | CLOSED | fase 1 fechada; `design-tokens-unico.test.ts` vivo |
| M14 | (fase 1) | CLOSED | idem |
| M32 | HOME-01 | CLOSED | fase 6 |
| M33 | jornada de análise | CLOSED | fase 7 |
| M36 | Instância | CLOSED | INST-01/03 navegáveis |
| M39 | EVO-02 | CLOSED | comparação v3 |
| M40 | baseline | CLOSED | INST-05, 12 capturas |
| M42 | Configurações | **CLOSED** · quality gate 9,2 | `docs/m42/DOC-CLOSE-QUALIDADE.md` |
| M44 | comunicação + reentrada | **CLOSED** | `docs/m44/DOC-CLOSE-IMPLEMENTACAO.md` |

**PRÉ SATISFEITA.** Nenhuma pendente.

---

## 2. Objetivo literal, e a classificação de cada parte

> **M45 · Os 18 gates de UI COMPLETE**
> Rodar sobre **todas** as superfícies REAL: superfícies navegáveis · 27 scenarios · nenhum dado
> exclusivo do mock · todo CTA com operação **ou explicitamente bloqueado** · responsive · PT/EN ·
> a11y · critique · heuristics ≥ 8 · copy · erro/vazio/carregando · visual regression (**só entra
> em gate depois de uma mutação de token a fazer falhar**) · fronteiras · vocabulário interno ·
> zero `#hex` · token único · **semântica única de estado** · paridade i18n.

| parte | classe | por quê |
|---|---|---|
| rodar sobre todas as superfícies REAL | **A · STILL VALID** | é o coração da missão |
| **27 scenarios** | **C/D · STALE → REALINHAR** | o catálogo tem **62**. Número datado, ver §5 |
| nenhum dado exclusivo do mock | **A** | `fixtures-presas-ao-schema` já instrumenta |
| CTA com operação ou bloqueado | **A** | §20 lista 4; um deles fechou (ver §7) |
| responsive · PT/EN · a11y | **A** | instrumentos existem por missão; falta a matriz final |
| critique · copy | **A** | executadas por missão; a M45 é a passada **transversal** |
| **heuristics ≥ 8** | **D · REALINHAR para ≥ 9,0** | ver §6 |
| erro/vazio/carregando | **A** | |
| visual regression | **A, com a condição literal preservada** | *"só entra em gate depois de uma mutação de token a fazer falhar"* — a condição é parte do gate |
| fronteiras · vocabulário interno · zero `#hex` · token único | **B · JÁ ENTREGUE, com instrumento vivo** | a M45 os **re-executa**, não os constrói |
| semântica única de estado | **A** | |
| paridade i18n | **B** | `i18n-paridade.test.ts` vivo |

**Nada classificado E (out of V1) nem F (ambíguo).** Nenhuma parte exige backend ou capability
nova: **linhas vermelhas 2 e 3 não disparam.**

---

## 3. Os 18 gates — reextraídos, um por um

Contados **agora**, do Blueprint §19 e do PLAN. **São 18 nos dois**, e a contagem histórica se
sustenta. Estado medido em `34c7c79`.

| # | gate (literal, §19) | instrumento | status | mudança? |
|---|---|---|---|---|
| 1 | todas as superfícies REAL de §4 navegáveis em modo mock | rotas + Playwright | 39 rotas vivas; falta a **matriz** superfície→rota→journey | **produzir a matriz** |
| 2 | os **27** scenarios não bloqueados reproduzíveis por nome | `scenarios-catalogo.test.ts` | 62 no catálogo · 57 disponíveis · 3 parciais · 2 bloqueados | **trocar o número pelo invariante** |
| 3 | nenhum dado exclusivo do mock | `fixtures-presas-ao-schema.test.ts` | vivo | — |
| 4 | todo CTA com operação real ou bloqueado com motivo visível | §20 lista 4 | **CFG-02 fechou** (M41); restam AN-02, WS-02, EVO-03 | **atualizar §20** |
| 5 | responsive nos três tamanhos | Playwright por missão | M40/M41/M42/M44 cobertos | **matriz final** |
| 6 | PT-BR e EN completos, orçamento +30 % | `i18n-paridade.test.ts` | 45 acima do orçamento (baseline) | — |
| 7 | a11y: §16 · `axe` **sem violação crítica** · teclado ponta a ponta | axe por spec | M42/M44 em 0 violações | **elevar para 0 aplicáveis**, ver §6 |
| 8 | `/design-critique` por superfície, achados resolvidos ou registrados | skill | M42/M44 executadas | **executar transversal** |
| 9 | `/ux-heuristics` **≥ 8**/10 por superfície | skill | M42 = 9,2 · M44 = 9,3 | **realinhar para ≥ 9,0** |
| 10 | `/ux-copy` — nenhum sinônimo de conceito congelado | skill + gates de vocabulário | M41/M42/M44 executadas | **executar transversal** |
| 11 | erro, vazio e carregando distintos em toda superfície | por missão | — | **matriz final** |
| 12 | visual regression **quando a infraestrutura existir**, e só vira gate depois de uma mutação de token o fazer falhar | **não existe** | — | **decidir: construir ou declarar fora** |
| 13 | zero violação das fronteiras de §17 | `*-boundary.test.ts` | vivos | — |
| 14 | zero vocabulário interno na UI (`nunca_publicos`) | gates de contrato | vivo | — |
| 15 | zero `#hex` literal em componente | `hardcodeDeclarado.ts` | vivo | — |
| 16 | um único vocabulário de tokens, com mutação de duplicidade falhando | `design-tokens-unico.test.ts` | vivo | — |
| 17 | uma única semântica pública de estados | parcial (`an01-m33`) | — | **verificar cobertura transversal** |
| 18 | paridade `pt.json` × `en.json` | `i18n-paridade.test.ts` | vivo | — |

**Onze dos dezoito já têm instrumento vivo.** O trabalho da M45 é **transversal**: matriz de
cobertura, as três skills sobre o conjunto, e a decisão sobre o gate 12.

---

## 4. O gate 12 — a única decisão pendente

O texto é condicional por escrito: *"visual regression **quando a infraestrutura existir**"*, e
carrega a própria trava: *"só entra em gate depois de uma mutação de token o fazer falhar"*.

A infraestrutura **não existe**. As duas leituras honestas:

**(i)** construir na M45 — mas isso é infraestrutura nova, e a M45 é hardening;
**(ii)** declarar `NÃO ATINGÍVEL — infraestrutura ausente`, com a condição preservada.

**Recomendação: (ii).** É o que o próprio texto autoriza (*"quando existir"*), e construir
baseline visual no fim da fase de hardening criaria um gate sem histórico para comparar — ele
aprovaria a primeira execução por definição. **Decisão do owner**, e a M45 não pode começar
sem ela: é a linha vermelha 4 se ficar em aberto.

---

## 5. Scenarios — o invariante substitui o número

`27` é um **SNAPSHOT** de 2026-08-10 e aparece em **cinco** lugares. O catálogo passou por 44, 52 e
hoje está em **62**.

**Invariante congelado:**

> Todo scenario **não bloqueado** do catálogo é reproduzível **por nome** pelo harness oficial, e
> todo id do catálogo existe no Blueprint §11 — nas duas direções.

A contagem pode ser **reportada**; ela não é o gate. O instrumento que vale já existe
(`scenarios-catalogo.test.ts`), e a catraca de contagem que ele tem é de **movimento declarado** —
sobe junto com o Blueprint, no mesmo commit —, não de completude.

---

## 6. Limiares realinhados, com a história preservada

| gate | authority histórica | regra da M45 | por quê |
|---|---|---|---|
| heurísticas | **≥ 8/10** (Blueprint §19.9) | **≥ 9,0, sem waiver** | M42 fechou em 9,2 e M44 em 9,3 sob esse limiar. Fechar a fase de hardening abaixo do que duas missões já entregaram seria a régua andando para trás |
| axe | *"sem violação crítica"* | **0 violações aplicáveis** (`wcag2a`+`wcag2aa`) | é o que M42 e M44 já cumprem, e "crítica" não tem definição no documento |

**O `≥ 8` não é apagado.** Ele foi a régua de M26–M40 e permanece registrado como tal.

---

## 7. §20 está envelhecido — o que mudou desde que foi escrito

| linha do §20 | estado real |
|---|---|
| superfície sem scenario: **8**, incluindo CFG-02/03/04 | **CFG-02** (M41), **CFG-03/04** (M42) têm scenario. Restam INST-02/06/07, WS-02/04 — **5** |
| CTA sem operação: **4** — AN-02, WS-02, **CFG-02 "Salvar idioma"**, EVO-03 | **CFG-02 fechou na M41.** Restam **3** |
| contrato sem consumidor: **4** (`/progress`, `/analytics`, `/export/download`, `/timeline`) | **fechadas em M20–M23.** A linha descreve 2026-08-10 |
| **B5** — Q15 não comprovada | **fechada** por BD14/M43: `destination` é intenção explícita |
| **B7** — contrato de preferências inexistente | **fechado** pela BD11 |
| **B1** — 1 operação sem cliente | **correto**: `create_instance`, e continua |

---

## 8. B1 e a órfã — e por que ela não bloqueia

**B1 = 1**, medido: `POST /v1/instances` (`create_instance`).

O que a authority já responde, sem decisão nova:

- **por que está no contrato:** a BD02 publicou as operações de Instance em bloco;
- **produtor real:** existe — o Gateway a implementa;
- **consumidor legítimo:** o Discovery §9.1 tem o nó *"Criar primeira Instância"*, então a
  **necessidade** existe;
- **o que não existe:** superfície no Blueprint e missão no PLAN. O próprio §20 diz:
  *"sem missão dona: falta superfície no Blueprint e missão no PLAN, **não código**"*;
- **owner semântico:** Produto/Arquitetura de Instância.

**Bloqueia a M45?** A condição do marco (PLAN §6) é *"Front V1 navegável e aprovado em modo mock;
**18 critérios** em todas as superfícies REAL"*. **B1 não é um dos 18.** O gate 4 é sobre *CTA sem
operação*; esta é a inversa — *operação sem CTA*.

> ⚠️ **Contradição de autoridade, registrada e não resolvida em silêncio:** o Blueprint §20 lista
> B1 sob *"Blockers do UI Experience Freeze"*, e o PLAN §6 define a condição do marco sem ele. A
> leitura que sustento é que §20 é um **registro de dívidas** que nunca ganhou a coluna *"ainda
> bloqueia?"* — metade das linhas dele já fechou (B5, B7) e continua listada. **Se o owner ler de
> outro jeito, a M45 está bloqueada pela linha vermelha 5**, porque a órfã não tem dono e a M45 não
> pode inventar superfície para zerar placar.

**A M45 NÃO cria consumidor para `create_instance`.**

---

## 9. Superfícies e journeys do freeze

**39 rotas vivas.** A matriz definitiva é **entregável da M45**, não deste checkpoint — mas o
recorte é este, e ele sai do Front vivo cruzado com o §4:

| bloco | rotas | cobertura hoje |
|---|---|---|
| público / legal | `/`, `/login`, `/register`, `/forgot-password`, `/terms`, `/privacy` | `rotas-publicas.test.tsx` |
| auth / reentrada | `/auth/callback`, `/session-expired`, `/auth/reset-password` | AUTH-04 |
| home | `/home`, `/home/welcome` | M32 |
| análises | `/analyses`, `/analyses/new`, `/analyses/:id` | M33–M35 |
| resultado | `/analyses/:id/result` | RES-01 (M26–M31) |
| ARGOS / Analytics | `/analyses/:id/argos`, `/analyses/:id/analytics` | Two-View |
| comparação | `/analyses/compare/:a/:b` | EVO-02 (M39) |
| instâncias | `/instances`, `/instances/:id` | M36–M37, baseline M40 |
| configurações | `/dashboard/settings` | CFG-01/02 (M41), CFG-03 (M42), **COM-01 (M44)** |
| workspaces | `/workspaces`, `/dashboard/workspaces` | WS-01/03 |
| compatibilidade | `/dashboard/*`, `/canonical/*` | redirecionam — **não** são IA pública |

**Journeys mínimas, cada uma com entrada → ação → estado terminal → reentrada → erro →
responsive → PT/EN:** primeira análise · consultar resultado · comparar duas · configurar espaço ·
configurar comunicação · **reentrada por `/analyses/{id}`** (M44, já provada) · sessão expirada.

---

## 10. Regras de execução — congeladas para a M45

| eixo | regra |
|---|---|
| **quality stack** | semântica → `/ux-copy` → composição → `/design-critique` → correções → `/ux-heuristics` → provas. **Executadas, não citadas** |
| **heurísticas** | **≥ 9,0**, sem waiver |
| **axe** | 0 violações aplicáveis nas superfícies congeladas; a11y **não se reduz ao axe** — teclado, foco, rótulo, anúncio de estado, alvo de 44px, contraste e associação de erro entram |
| **responsive** | desktop · tablet · mobile nas journeys representativas; equivalência **provada** dispensa captura redundante, ausência de cobertura não |
| **PT/EN** | provado pelo **conteúdo renderizado**, no fluxo autenticado vigente. Nunca por `localStorage` — foi a dívida da M40 |
| **capturas** | cada uma com rota · scenario · âncora positiva · conteúdo esperado · idioma · viewport. **Esqueleto não prova indisponível.** Hashes iguais entre estados diferentes = investigação obrigatória |
| **Playwright** | **OBRIGATÓRIO** — suíte integral **e** a matriz de journeys da M45. "Não aplicável" para a missão inteira é inadmissível |
| **Vitest** | com `SENTINELA_CONTRACT_ORIGIN` explícito nos gates de contrato. **SKIPPED/AMBÍGUO ≠ PASS** |
| **typecheck** | 0 erros, todos os projetos |
| **lint** | ver §11 |
| **mutação** | por **risco**, não por volume: só os invariantes finais que nenhuma missão anterior congelou. Repetir campanha por ritual é desperdício |

---

## 11. Lint — a authority não diz "lint 0"

Procurado no PLAN, no Blueprint §19 e no Product Freeze: **nenhum dos 18 gates menciona lint**, e
nenhum documento vivo exige zero.

**Regra da M45: delta ZERO sobre o baseline de 23 problems (9 erros, 14 warnings).** O baseline
permanece **dívida histórica declarada**, e não vira requisito por gosto. Elevá-lo a "lint 0" seria
inventar um gate 19.

---

## 12. Dívidas que a M45 herda e NÃO fecha

| dívida | classe | decisão |
|---|---|---|
| **`CONTRACT AUTHORITY DISCOVERY`** | ambiental | não bloqueia: a origem é identificável e pode ser fornecida. Bloqueia a noção de *"zero configuração"* até missão própria |
| **B1 · `POST /v1/instances`** | produto sem dono | preservada vermelha; ver §8 |
| **3 falhas de `POST /v1/analyses/{id}/data`** | backend, `PRE-EXISTING · UNRELATED · STILL OPEN` | a M45 é **Front**: não as executa e **não as chama de verdes**. Reportadas como não medidas |
| **12 capturas da M40 EN-only** | evidência | **absorvida**: o Experience Freeze exige evidência PT/EN das journeys congeladas, e as journeys de baseline entram. Não é reparo da M40 — é cobertura nova sob a regra atual de prova de idioma |
| **release topology** (Account · Workspace · Dispatcher) | promoção | **não** bloqueia o freeze local; **bloqueia** promoção. Ver §13 |

---

## 13. Vocabulário final — freeze ≠ produção

| estado | significa | quem declara |
|---|---|---|
| **FRONT EXPERIENCE FREEZE** | Front V1 navegável e aprovado **em modo mock**; 18 gates nas superfícies REAL; bloqueadas por delta ficam **inalcançáveis**, não meio-construídas | **M46**, ao fim da M45 |
| **PRODUCTION READY** | exige integração real (M47), contract parity e as três dívidas de topologia fechadas | **não é a M45, e não é a M46** |

**A M45 não pode declarar produção pronta.** Ela fecha com *"18 gates verdes"* — nada além.

---

## 14. Definição literal de "M45 CLOSED"

1. os **18 gates** medidos em todas as superfícies REAL, cada um com instrumento nomeado e
   resultado — **ou** declarado não atingível com o motivo (só o gate 12 é candidato);
2. matriz superfície → rota → journey → scenario, completa;
3. as três skills **executadas**, com achados aplicados ou registrados;
4. heurísticas **≥ 9,0**;
5. axe 0 aplicáveis · teclado · responsive · PT/EN provados por conteúdo;
6. Playwright integral verde + matriz de journeys;
7. Vitest integral verde com origem declarada;
8. typecheck 0 · lint delta 0;
9. dívidas conhecidas **enumeradas**, nenhuma silenciada;
10. **zero** produto novo, backend novo ou capability nova.

---

## 15. Linhas vermelhas da M45

**PARAR se:** o gate 12 permanecer sem decisão do owner · o owner ler o §20 de modo a tornar B1 um
blocker obrigatório · qualquer gate exigir backend ou capability nova · a topologia de release
virar pré-condição do freeze **local** · a autoridade de contrato deixar de ser identificável mesmo
com origem explícita.

### **VEREDITO DESTE CHECKPOINT: M45 · AUTHORITY REALIGNED — READY FOR IMPLEMENTATION**

**Com uma decisão de owner pendente e bloqueante: o gate 12 (visual regression).** A M45 não deve
começar antes dela.

**Próximo checkpoint:** `M45 · OS 18 GATES DE UI COMPLETE — IMPLEMENTATION`.
