# ÍNDICE DE AUTORIDADE — V1

> **Este documento é um ROTEADOR, não uma autoridade.** Ele não decide nada: diz onde a decisão
> mora. Se houver conflito entre este índice e um documento de autoridade, **vence o documento**.
>
> Existe para responder, em um hop, a pergunta que fecha o DOC-FREEZE:
> **"Onde encontro a regra oficial sobre X?"**

---

## 1. Onde mora cada tipo de regra

| pergunta | documento |
|---|---|
| **O que o produto faz, exige e proíbe?** Comportamento, estados, semântica, lifecycle, comunicação, exclusão, idioma, o que está fora da V1 | **`PRODUCT-EXPERIENCE-FREEZE-V1.md`** |
| **Como se parece e como se compõe?** Direção visual, tokens, camadas, motion, a11y, responsive, data viz | **`FRONT-DESIGN-SYSTEM-CONSTITUTION.md`** |
| **Quais superfícies existem, com quais estados, scenarios, componentes e dependências?** | **`EXPERIENCE-BLUEPRINT-V1.md`** |
| **Como o front é construído por dentro?** Fronteiras, contrato, mock, validadores, auth, privacidade, gates | **`FRONT-ARCHITECTURE-AND-MOCK-CONTRACT.md`** |
| **Em que ordem se constrói?** | **`FRONT-V1-IMPLEMENTATION-PLAN.md`** — 48 missões de front + 9 deltas de backend |

### Autoridade SUPERIOR, acima dos quatro

1. **Regras de Ouro globais** — Obsidian `REGRA DE OURO ZERO.md`
2. **DEC anti-monólito** — Obsidian `04 - Decisões/DEC - Arquitetura modular anti-monólito…`
3. **Architecture Freeze Ondas 1–8** — Obsidian `02 - Arquitetura/ARQ - Arquitetura Entregue…`
4. **Contrato público *authoritative*** — `sentinela-facts/docs/contracts/public-v1.json`

**Em conflito, a autoridade superior vence.** Um documento oficial que contradiga o contrato
público está errado, não o contrato.

### Fronteiras entre os quatro

- O **Blueprint** é autoridade de **mapa** — superfícies, estados, scenarios, componentes,
  dependências. **Não** é autoridade de regra arquitetural nem de decisão de produto.
- A **Constituição** é autoridade **visual**. Não decide o que o produto faz.
- O **Product Freeze** é autoridade de **comportamento**. Não decide como se parece.
- O **Architecture & Mock** é autoridade de **engenharia**. Não decide superfície.

---

## 2. Documentos rebaixados a EVIDENCE / HISTORICAL

Permanecem versionados e citáveis. **Deixam de ser leitura obrigatória para execução diária.**
**Nenhum apagado.**

| documento | classe | o que continua valendo dele |
|---|---|---|
| `DISCOVERY-FRONT-EXPERIENCE.md` | EVIDENCE | raciocínio e provas de D1–D18; a **regra** migrou para o Product Freeze |
| `DISCOVERY-0B-SUPERFICIES-TRANSVERSAIS.md` | EVIDENCE | D19–D23, inventário de Configurações, auditoria de resíduo Supabase, régua de comunicação |
| `DISCOVERY-0C-LONGITUDINALIDADE.md` | EVIDENCE | D24–D30, as quatro camadas, prova de Q15, prova de cascade Q21–Q23 |
| `DESIGN-0-DIRECAO-E-CONSTITUICAO.md` | EVIDENCE | auditoria de stack medida, três vocabulários de token, inventário de skills |
| `DESIGN-05-VISUAL-EVIDENCE.md` | EVIDENCE | medições de Linear/Grafana/Vercel, teste adversarial de T1, A1–A4, V1–V12 |
| `WS-A-AUTORIDADE-DO-CONTRATO.md` | EVIDENCE | prova de autoridade, inventário de operações, prova de mutação 5/5, patches exatos |
| `AUDITORIA-DS-MF64B.md` | HISTORICAL | auditoria do DS na MF6.4b |
| `MF6-4B-MASSAS.md` | HISTORICAL | massas de teste da MF6.4b |
| `TYPECHECK-GATE.md` | **ATIVO** — não rebaixado | é procedimento operacional do gate de typecheck |

> **Regra de citação:** um documento de autoridade pode **apontar** para evidência. Uma execução
> **não precisa** abrir a evidência para agir.

---

## 3. Open Gates

Os documentos oficiais não fingem que tudo está resolvido.

| # | gate | classe | bloqueia **dev**? | bloqueia **integração**? | bloqueia **release**? | missão futura |
|---|---|---|---|---|---|---|
| **B1** | **1** operação contratada sem cliente: `create_instance`. As quatro da Fase 3 fecharam em M20–M23; a **BD02 reabriu o gate** ao publicar três operações de Instance, e a M36 o reduziu de 3 para 1 | delta de **Front** | não | não | **sim** | 🔴 **nenhuma** — sem superfície e sem missão dona |
| **B2** | `mapping` existe no Ingestion, não é público; chave é `ingestion_id`, não `analysis_id` | delta de **backend** (exposição + ponte) | ⚠️ só a UI de resolução | **sim** | **sim** | **BD01** |
| **B3** | **Instância** — ✅ **FECHADO**: BD02 executada e congelada (`FREEZE: PASS`). Domínio construível; INST-01/03 entregues na M36. Não confundir com "todas as superfícies entregues" — ver `Product Freeze` §1 | delta de **backend** | não | não | não | ✅ **BD02** |
| **B4** | `recommendation_id` não chega ao documento canônico | delta de **contrato** | ⚠️ só recomendação longitudinal | **sim** | **sim** | **BD03** |
| **B5** | **Q15** — cadeia do destinatário não comprovada | **prova técnica** | não | **sim** | **sim** | **M43** (+ BD09 se revelar delta) |
| **B6** | **Supabase Auth** — ✅ **erradicação AUTORIZADA**; cada fluxo provado no Keycloak **antes** de remover | delta obrigatório | não | **sim** | **sim** | **M01 → M02** |
| **B7** | contrato de **preferências** (idioma) inexistente | delta de **backend** | ⚠️ só CFG-02 | **sim** | **sim** | **BD04** |
| **B8** | **`prepared` abandonado nunca expira** | delta de **lifecycle** | não | não | **sim** | **BD05** |
| **B9** | **canonicalização física dos contratos** — ✅ patches **AUTORIZADOS** como missões explícitas | **autoridade documental** | **não** | **sim** | **sim** | **BD07 + BD08** |
| **B10** | **exclusão de análise** — operação real inexistente (D28) | delta de **backend** | não | não | **sim** | **BD06** |
| **B11** | **ownership de `/`** — ✅ **FECHADO:** `/` é a landing pública; a Home autenticada permanece em `/home`. Executado na **M24**, com gate (`src/test/v1/rotas-publicas.test.tsx`) | fechado | não | não | não | — |

### Leitura oficial

> **B9 aberto não impede consolidar documentação nem planejar. Impede considerar a
> integração/release fechada.**

Temos autoridade conhecida (`sentinela-facts`), mecanismo que **recusa ambiguidade**, dívida
declarada e patches exatos identificados. Isso basta para planejar sem fingir que o problema não
existe.

**Nem todo gate aberto é blocker de desenvolvimento.** Com B11 fechado, só **B1, B2, B3, B4 e B7**
tocam desenvolvimento, e quatro deles apenas parcialmente — o caminho
`Tokens → Primitives → Patterns → Shell → RES-01 → HOME-01 → AN-01/03/04 → EVO-01` está livre.

---

## 4. Decisões do owner — resolvidas e pendentes

**Resolvidas em 2026-08-09** (entrada do `FRONT-V1-IMPLEMENTATION-PLAN.md`):

| # | decisão | efeito |
|---|---|---|
| 1 | **Tema:** D23 permanece; Light/Dark **fora** da V1 | P31 continua **proposta**; D37 vira 4 combinações; `next-themes` sai |
| 2 | **`/` é a landing pública**; Home autenticada em `/home` | **B11 fechado** |
| 3 | **Instância AUTORIZADA** como requisito da V1, em missão backend própria | **B3** vira **BD02**, com freeze próprio |
| 4 | **Patches de contrato AUTORIZADOS** como missões explícitas | **B9** vira **BD07 + BD08** |
| 5 | **Erradicação do Supabase AUTORIZADA**, com prova no Keycloak antes da remoção | **B6** vira **M01 → M02**, nessa ordem |

**Pendentes — autorização ainda necessária, com o momento exato:**

| delta | blocker | quando decidir | consequência de não decidir |
|---|---|---|---|
| **BD01** mapping public bridge | B2 | antes da Fase 7 fechar | AN-02 informa e não age; um estado da jornada fica sem saída |
| **BD03** `recommendation_id` | B4 | antes da Fase 10 | recomendação longitudinal sai da V1, contradizendo D27 |
| **BD04** preferências | B7 | antes da Fase 11 | CFG-02 fica sem operação; idioma vira preferência sem casa |
| **BD05** `prepared` lifecycle | B8 | antes da Fase 16 | `prepared` abandonado acumula para sempre |
| **BD06** exclusão de análise | B10 | antes da Fase 16 | D28 fica sem operação real |
| **BD09** resolução de destinatário | B5 | **após M43**, se a prova revelar delta | comunicação externa não pode ser declarada fechada |

**Permanece proposta:** **P31** (Light/Dark) — D23 vence.

## 5. Conflitos que ainda NÃO puderam ser consolidados

| # | conflito | por que não foi resolvido aqui | onde está registrado |
|---|---|---|---|
| **C1** | três representações do contrato, duas divergentes | resolver exige **escrever em repo congelado**. Mitigado: autoridade explícita + gate que recusa ambiguidade | `Architecture` §2 |
| **C2** | `/v1/me` fora de `operations[]` | idem — patch JSON exato pronto, não aplicado | `Architecture` §11 · `WS-A` §A3 |
| **C3** | `/canonical/*` na URL pública | **resolvido** como decisão (rotas `/analyses…`); falta **executar** a migração e decidir `/` (B11) | `Product Freeze` §10 |
| **C4** | D23 × P31 | **resolvido por autoridade**: D23 vence, P31 é proposta | `Product Freeze` §5 |
| **C5** | superfície aninhada sem publicação canônica | o gate funciona atravessando fronteira de repo; o certo é o Analytics publicar schema | `Architecture` §11 |
| **C6** | **Baseline sem produtor** — EVO-03 e INST-05 são requisito da V1, e nenhuma operação a cria, lê ou compara. **BD02 não a entregou**: entregou Instância | exige delta de backend próprio, ainda sem semântica definida e sem número atribuído | `PLAN` M40 · `Blueprint` §4.4 |
| **C7** | **Lifecycle de Workspace sem produtor** — WS-02 (criar) e WS-04 (configurar) têm nó no Discovery, superfície no Blueprint e missão no PLAN (M42), e **não existe operação**. BD04 é *preferências*, não lifecycle de Workspace | idem — delta próprio, sem número atribuído | `PLAN` M42 · `Blueprint` §3 |
| **C8** | **`create_instance` publicado sem consumidor** — capacidade pública sem superfície nem missão; é o inverso de C6/C7 | exige decisão de produto antes de qualquer código; mantém **B1 aberto em 1** | `PLAN` (delta declarado na Fase 9) · `divergenciaDeclarada.ts` |

---

## 6. Critério de encerramento do DOC-FREEZE

**Atingido.** Para qualquer pergunta sobre uma regra da V1, existe **um** documento de destino, e
nenhuma exige escolher entre dois Discoveries.

| pergunta de exemplo | destino |
|---|---|
| *"`partial` pode ser mostrado como zero?"* | Product Freeze §3 |
| *"posso usar mono em todo número?"* | DS Constitution §1 (A1) |
| *"quais estados a Home suporta?"* | Blueprint §4.3 e §5 |
| *"a página pode importar fixture?"* | Architecture §4.1 |
| *"tema entra na V1?"* | Product Freeze §5 (D23) — P31 é proposta |
| *"qual contrato manda?"* | Architecture §2 |
| *"o que impede o release?"* | este índice, §3 |

**O que este índice NÃO faz:** não decide, não cria regra e não substitui documento. Se ele
divergir de um documento de autoridade, **o índice está errado**.
