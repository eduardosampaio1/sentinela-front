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
| **Em que ordem se constrói?** | *futuro* `FRONT-V1-IMPLEMENTATION-PLAN.md` — **não criado** |

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
| **B1** | 4 operações contratadas sem cliente (`progress`, `analytics`, `export/download`, `timeline`) | delta de **Front** | ⚠️ bloqueia RES-01 e AN-03 | não | não | **WS-C** |
| **B2** | `mapping` existe no Ingestion, não é público; chave é `ingestion_id`, não `analysis_id` | delta de **backend** (exposição + ponte) | ⚠️ só a UI de resolução | **sim** | **sim** | frente própria |
| **B3** | **Instância** não autorizada | delta de **produto + backend** | ⚠️ 7 superfícies + EVO-03 + CFG-03/04 | **sim** | **sim** (D12: gate de release) | frente própria |
| **B4** | `recommendation_id` não chega ao documento canônico | delta de **contrato** | ⚠️ só recomendação longitudinal | **sim** | **sim** | frente própria |
| **B5** | **Q15** — cadeia do destinatário não comprovada | **prova técnica** | não | **sim** | **sim** | prova antes de delta |
| **B6** | **Supabase Auth** vivo e roteado | delta obrigatório de **erradicação** | não | **sim** | **sim** | frente própria |
| **B7** | contrato de **preferências** (idioma) inexistente | delta de **backend** | ⚠️ só CFG-02 | **sim** | **sim** | frente própria |
| **B8** | **`prepared` abandonado nunca expira** | delta de **lifecycle** | não | não | **sim** | frente própria |
| **B9** | **canonicalização física dos contratos** | **autoridade documental** | **não** | **sim** | **sim** | patches §11 do Architecture |
| **B10** | **exclusão de análise** — operação real inexistente (D28) | delta de **backend** | não | não | **sim** | frente própria |
| **B11** | **ownership de `/`** — `/home → /` não decidido | **decisão de owner** | ⚠️ bloqueia congelar o Shell | não | não | decisão |

### Leitura oficial

> **B9 aberto não impede consolidar documentação nem planejar. Impede considerar a
> integração/release fechada.**

Temos autoridade conhecida (`sentinela-facts`), mecanismo que **recusa ambiguidade**, dívida
declarada e patches exatos identificados. Isso basta para planejar sem fingir que o problema não
existe.

**Nem todo gate aberto é blocker de desenvolvimento.** Só **B1, B2, B3, B4, B7 e B11** tocam
desenvolvimento, e cinco deles apenas parcialmente — o caminho
`Tokens → Primitives → Patterns → Shell → RES-01 → HOME-01 → AN-01/03/04 → EVO-01` está livre.

---

## 4. Decisões que exigem o OWNER e permanecem como proposta

| # | proposta | quem decide | consequência de não decidir |
|---|---|---|---|
| **P31** | Light/Dark como requisito da V1 | owner | **D23 vence** — tema não entra. O **token único** vale por si e segue no plano |
| **B11** | `/home → /` e o ownership de `/` | owner | o Shell não pode ser congelado; deep links e comunicação ficam presos a `/home` |
| — | autorizar o **delta de Instância** (B3) | owner | 7 superfícies + baseline + config de Instância continuam inalcançáveis; D12 mantém como gate de release |
| — | autorizar os **patches em repo congelado** (§11 do Architecture) | owner | B9 continua aberto; `SENTINELA_CONTRACT_ORIGIN` obrigatório em CI e dev |
| — | autorizar a **erradicação do Supabase Auth** (B6) | owner | AUTH-01/03 permanecem em contrato ambíguo e **não podem ser redesenhadas** |

---

## 5. Conflitos que ainda NÃO puderam ser consolidados

| # | conflito | por que não foi resolvido aqui | onde está registrado |
|---|---|---|---|
| **C1** | três representações do contrato, duas divergentes | resolver exige **escrever em repo congelado**. Mitigado: autoridade explícita + gate que recusa ambiguidade | `Architecture` §2 |
| **C2** | `/v1/me` fora de `operations[]` | idem — patch JSON exato pronto, não aplicado | `Architecture` §11 · `WS-A` §A3 |
| **C3** | `/canonical/*` na URL pública | **resolvido** como decisão (rotas `/analyses…`); falta **executar** a migração e decidir `/` (B11) | `Product Freeze` §10 |
| **C4** | D23 × P31 | **resolvido por autoridade**: D23 vence, P31 é proposta | `Product Freeze` §5 |
| **C5** | superfície aninhada sem publicação canônica | o gate funciona atravessando fronteira de repo; o certo é o Analytics publicar schema | `Architecture` §11 |

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
