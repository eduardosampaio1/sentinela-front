# DISCOVERY 0c — Longitudinalidade, confiança e diferenciação

> **Estritamente documental.** Nada implementado, nenhum algoritmo criado, nenhuma dependência,
> nenhum wireframe. Backend **congelado**. Delta de Instância **não autorizado**. Big Bang
> **bloqueado**. Zero push/deploy/Railway.
>
> **Data:** 2026-08-08 · **Repo:** `sentinela-front-e1` @ `6269fef`
> **Continua:** [[DISCOVERY-FRONT-EXPERIENCE.md]] (D1–D18) · [[DISCOVERY-0B-SUPERFICIES-TRANSVERSAIS.md]] (D19–D23)

---

## Regra que atravessa este documento

> **O Front nunca faz matching heurístico entre duas análises para concluir que um problema "é o
> mesmo".**

Ou existe **identidade canônica** — um id que a origem garante estável entre execuções — ou a
afirmação não é feita. Comparar por título, por texto parecido, por posição na lista ou por
similaridade é fabricar continuidade que ninguém mediu. Isso é a mesma regra de sempre
(*"medição tem fonte única… o front também não"*), aplicada ao eixo do tempo.

---

## 0. Decisões congeladas D24–D29

| # | decisão | detalhe |
|---|---|---|
| **D24** (Q15) | **Destinatário = e-mail canônico/verificado do OWNER do Workspace** | Sem configuração arbitrária, sem endereço vindo do Front, sem e-mail inventado pelo compositor. Resolução **server-side** a partir da identidade/ownership canônica. **Prova técnica: §1 — a cadeia NÃO fecha hoje** (deltas N1–N3) |
| **D25** (Q16) | **Baseline é uma análise MARCADA EXPLICITAMENTE pelo usuário** | Não é a primeira execução automaticamente, nem janela móvel. Uma Instância **pode não ter** baseline. Substituir é ação explícita. É **identificável e versionável** no histórico. **Nunca muda silenciosamente.** Pertence à **Instância**. Análise que é baseline ativo **não pode ser excluída** até o baseline ser removido/substituído. Janela móvel pode existir no futuro como outra forma de referência, **sem** receber o nome de baseline canônico |
| **D26** (Q17) | **Quebra de versão quebra a comparabilidade numérica** | Mudou `indicator_registry_version` ou `measure_schema`: **não conectar valores como mesma série**. A linha do tempo da Instância continua visualmente contínua, com **descontinuidade explícita** (`segmento versão A → quebra → segmento versão B`). **Não calcular delta atravessando a fronteira.** A UI explica que houve mudança de **metodologia/vocabulário** — nunca representa isso como aumento ou queda do indicador |
| **D27** (Q18) | **Recomendações longitudinais entram na V1** | `recommendation_id` já existe no domínio e é exatamente a identidade necessária. **Nunca parear por título, texto, similaridade ou heurística no Front.** Se o id não chegou ao documento canônico, **não existe** afirmação de persistiu/apareceu/deixou de aparecer. **L6 vira delta explícito próprio** de contrato/fiação, com testes e freeze próprios — **não misturar** com o delta de Instância. Requisito da V1; **não é autorização de implementação** |
| **D28** (Q19) | **A V1 permite EXCLUIR análises; "arquivar" não existe como conceito** | Exclusão é destrutiva e só existe **quando houver operação real de backend e lifecycle definido**. **Nenhum botão fake.** Regra de segurança congelada: **toda exclusão exige digitar exatamente o nome da Instância** a que a análise pertence — não basta *Confirmar*, checkbox ou digitar "EXCLUIR". Ver §7.1 |
| **D29** (Q20) | **As duas superfícies de comparação existem, com UMA fonte de verdade** | No **Resultado**: resumo automático *"esta análise vs. imediatamente anterior"*, só fatos comparáveis e publicados. Na **Instância**: superfície de **Evolução/Comparação** com seleção de duas execuções. **Um único view model/regra canônica** — Resultado consome a versão resumida, Instância a exploração completa. Incompatibilidade de schema/registry aplica **D26**. **Ausência de um sinal nunca vira automaticamente "resolveu" ou "sumiu"**, especialmente diante de privacy withholding |

---

## 1. Q15 — prova técnica da cadeia do destinatário

**Decisão de produto (D24):** na V1 o destinatário de comunicação operacional é o **e-mail
canônico/verificado do owner do Workspace**. Sem configuração arbitrária, sem endereço vindo do
Front, sem e-mail inventado pelo compositor, e resolução **server-side** a partir da
identidade/ownership canônica.

A prova pedida foi da cadeia:

```
workspace/owner → identidade canônica → e-mail verificado → Mensagem.destino → Dispatcher
```

### 1.1 Resultado, elo a elo

| # | elo | estado | evidência |
|---|---|---|---|
| 1 | **existe armazenamento de destino?** | ✅ **sim** | `dispatcher_subscriptions` (migration `0001`): `workspace_id`, `channel ∈ {webhook,email}`, `destination`, `event_types[]`, `active`, `language`, **`verified_at`** |
| 2 | **o destino é congelado na intenção?** | ✅ **sim, e bem** | migration `0002_intencao_congela_o_destino`; `reivindicar()` lê canal/destino/idioma **da própria entrega**, não da assinatura atual — *"uma edição da assinatura entre a intenção e o claim redirecionaria uma entrega que já existia"* |
| 3 | **existe serviço de ciclo de vida da assinatura?** | ✅ **sim** | `service/assinaturas.py` — criar, rotacionar, verificar, desativar. E ele **já declara a fronteira certa**: *"a autoridade sobre 'de quem é este workspace' não está aqui: ela é do contexto autenticado, no Gateway"* |
| 4 | **alguém CHAMA esse serviço em produção?** | 🔴 **NÃO** | zero importadores fora de testes. CLI do Dispatcher tem `liveness`, `readiness`, `migrar`, `executar` — **nenhum comando de assinatura**. Gateway: **nenhuma rota** de assinatura |
| 5 | **workspace → owner → e-mail verificado?** | 🔴 **NÃO EXISTE** | `me_workspace_fields = [id, name, role]` — **sem owner**. `me_user_fields = [id, email, name]` — é o e-mail do **usuário autenticado**, não do owner, e **não há flag de verificação**. `owner_user_id` existe só no store de contexto **legado** (fora do `public-v1`), e é um **user id**, não um e-mail |

### 1.2 Veredito

**A cadeia quebra em DOIS pontos**, e nenhum deles é o compositor:

1. **Não há resolução `workspace → owner → e-mail verificado`.** A identidade canônica publica o
   e-mail do **usuário autenticado**, sem marca de verificação, e não publica o owner do
   workspace. A única fonte de `owner_user_id` é o store legado — e é um id, não um endereço.
2. **Não há como criar a assinatura.** O serviço existe, está bem desenhado, e **nenhum caminho
   de produção o alcança**: sem rota, sem comando, sem chamador.

> A infraestrutura de **entrega** está pronta e é boa. O que falta é a **origem do destino** — e é
> justamente o elo que D24 acabou de definir como responsabilidade do backend.

### 1.3 Delta necessário (classificação, não desenho)

| # | delta | classe |
|---|---|---|
| **N1** | identidade canônica publicar o **owner do workspace** e um **e-mail verificado** (ou marca de verificação sobre o existente) | **E** |
| **N2** | resolução server-side `workspace → owner → destino`, materializando a assinatura de e-mail **sem** entrada do cliente | **E** |
| **N3** | caminho de produção que chame `service/assinaturas` (rota interna, comando, ou provisionamento na criação do Workspace) | **E** |

Enquanto N1–N3 não existirem, **e-mail externo continua não fechado operacionalmente** — como a
própria decisão prevê. `verified_at` já está na tabela esperando por quem o preencha.

> ⚠️ **Consequência de D24 que vale registrar:** com destinatário derivado do **owner**, uma
> assinatura por workspace basta — e o campo `destination`, que hoje aceita qualquer endereço,
> passa a ser **saída de uma resolução**, não entrada de configuração. O desenho da tabela
> suporta os dois; a decisão restringe ao segundo.

---

## 2. Comparação longitudinal

### 2.1 `RunComparePanel` — o que ele faz, provado

**Não é legado morto.** Ele já usa o caminho **canônico**: `useAnalysisResult` (contrato público
`/v1/analyses/{id}/result`) + `adaptAnalysisResult`.

| propriedade | como está implementado |
|---|---|
| origem dos dados | **duas** chamadas a `/result`, disparadas por **uma** ação do usuário — nunca uma por linha da listagem |
| chave de pareamento | **`indicator.id`** — o id público do registro canônico |
| delta | `b.rawValue − a.rawValue`, **subtração de dois valores publicados** |
| condição | **`measured` dos DOIS lados**; faltando um, o par é "incomparável", com o estado de cada lado |
| ausência | **nunca vira zero** |
| métrica nova | **nenhuma nasce ali** |
| incompatibilidade | `schemaVersion` e `indicatorRegistryVersion` diferentes aparecem **em destaque** |
| escopo | as duas análises vêm da listagem workspace-scoped; o Gateway autoriza cada `/result` |

O próprio arquivo declara isso no cabeçalho, e a implementação confere.

### 2.2 Duas análises podem ser comparadas canonicamente hoje?

**SIM — e sem nenhum cálculo analítico novo no Front.**

A prova é o pareamento por **id do indicador**: o contrato publica `indicator_registry_version`
justamente para que "este indicador é aquele indicador" seja uma afirmação da **origem**, não uma
inferência do consumidor. Subtrair dois valores medidos publicados **não é criar métrica** — é
aritmética de apresentação sobre fatos declarados, no mesmo espírito de formatar um número.

**Duas ressalvas medidas:**

1. 🔴 **`RunComparePanel` usa `adaptAnalysisResult` (v1 apenas).** Com um documento
   `analysis-result-v2` ele cairia em `unknown_schema` → "resultado não suportado". Comparar duas
   análises v2 **não funciona hoje**.
2. ⚠️ **Só é alcançável por `/dashboard/history`**, a rota **legada** — que a Etapa 0 já marcou
   para unificação.

### 2.3 Dimensões e indicadores com identidade estável entre execuções

| eixo | identidade | estável entre execuções? | garantia |
|---|---|---|---|
| **indicadores** (`indicators[].id`) | id público do registro canônico | ✅ **sim** | `indicator_registry_version` no envelope |
| **dimensões** (`dimensions[].id`) | id do domínio | ✅ **sim** | mesmo mecanismo |
| **medidas analíticas** (`measure_id`) | id do `measure_schema` do dataset | ⚠️ **sim, se o esquema não mudar** | `snapshot_contract_version` + o mapping do dataset |
| **dimensões analíticas** (`dimension_id`) | id declarado | ⚠️ idem | idem |
| **rótulos de distribuição** (`groups[].label`) | valor do cliente | ⚠️ estável **como texto**, sujeito a piso de privacidade | um rótulo pode sumir por supressão sem ter sumido do mundo |
| **faixas de concentração** | intervalo de valor | ❌ **não** — a partição depende do engrossamento daquela execução | `coarsening_applied` |
| **janelas temporais** (`window_start`) | instante | ✅ sim, mas a **granularidade** pode mudar entre execuções | `effective_granularity` |
| **recomendações** (`recommendations[].id`) | ver §4 | 🔴 **não chega ao contrato hoje** | — |
| **evidências** (`evidence[].id`) | id do domínio | ❓ não provado — a massa real vem vazia | — |

> ⚠️ **A armadilha do rótulo suprimido.** Se `canal = fax` aparece na análise A e some na B, o
> Front **não pode** concluir "o canal fax desapareceu": ele pode ter caído abaixo do piso de
> privacidade. O documento distingue os dois casos (`suppression_applied`, `other_count`), e a
> comparação precisa ler essa distinção — não o silêncio.

### 2.4 Classificação

| item | classe |
|---|---|
| comparar dois documentos por `indicator.id` | **A — recomposição** (já existe, precisa sair do legado) |
| comparar documentos **v2** | **A** — trocar `adaptAnalysisResult` por `resolverResultado` (a fronteira já existe) |
| comparar blocos analíticos (medidas, distribuições, séries) | **A/B** — nenhum contrato novo; view models já existem |
| comparar **faixas de Pareto** entre execuções | ❌ **não fazer** — a partição não é estável; seria comparar réguas diferentes |
| série temporal **entre análises** | **B** — concatenar séries de execuções diferentes é decisão de produto, não recomposição (ver §5) |

---

## 3. Baseline

### 3.1 O que existe (e não é o que o nome sugere)

| ocorrência | o que realmente é |
|---|---|
| `engine/business/impact_model.py` → `metadata.baseline_metrics` | **entrada fornecida** ao cálculo (`ai_health_score`, `containment_risk`, `conversion_risk` esperados). Não é referência armazenada, não é histórico |
| `engine/pipeline.py` → `optimization_mode != "baseline"` | **modo de execução** — homônimo, sentido completamente diferente |
| `primitive_id = "global_health_vs_baseline_drop"` e `"segmented_baseline_regression"` | **nomes de sinal** que citam baseline — o vocabulário assume o conceito |

### 3.2 O que **não** existe

- ❌ nenhuma tabela, campo ou contrato de **referência por Instância** (a Instância nem existe);
- ❌ `baseline_metrics` **não chega aos facts canônicos** (busca em `engine/facts/`: zero);
- ❌ nada no Analytics (`sentinela-analytics-service`: **zero** ocorrências de baseline);
- ❌ nada no Assembler.

**Conclusão:** o conceito existe **dentro do Engine, como parâmetro de entrada de uma execução**.
Não existe **baseline persistido de um objeto observado**.

### 3.3 Delta conceitual necessário (descrição, não desenho)

Para comparar uma análise com uma referência da Instância seria preciso, no mínimo:

1. **um objeto que dure** — a Instância (delta já decidido, D11);
2. **eleger a referência** — qual execução é a baseline: a primeira, uma marcada manualmente, ou
   uma janela móvel. **É decisão de produto**, e cada escolha muda o significado de "piorou";
3. **persistir a eleição** com identidade e versão de contrato — uma baseline sem versão de
   registro compara números de vocabulários diferentes;
4. **publicá-la no contrato** — sem isso o Front voltaria a inferir, que é o proibido;
5. **regra de invalidação** — mudou o `measure_schema` ou o `indicator_registry_version`? A
   baseline anterior deixa de ser comparável, e isso precisa ser dito, não escondido.

Classe: **E — delta de backend**, dependente do delta de Instância.

---

## 4. Loop de evidência das recomendações

### 4.1 A identidade EXISTE na origem

`engine/recommendations/output_consolidator.py`:

```python
"recommendation_id": _as_str(ranked.get("primitive_id", ""), ""),
```

E `primitive_id` vem de um **vocabulário fechado e semântico**:

```
behavior_health_drop          contract_expectation_gap      cost_efficiency_regression
drift_pressure                global_health_vs_baseline_drop  issue_concentration_high
segmented_baseline_regression   stable_no_action
```

Isto é exatamente o que a longitudinalidade honesta exige: o **mesmo problema em duas execuções
recebe o mesmo id**, decidido pela origem.

### 4.2 🔴 Mas ela NÃO chega ao contrato canônico

| elo | estado |
|---|---|
| Engine emite | `recommendation_id` |
| contrato canônico exige | `FactRecommendation.id` (`min_length=1`, **obrigatório**) |
| `engine/facts/from_engine_result.py::extrair_recomendacoes` | `[dict(r) for r in brutas]` — **cópia crua, sem renomear** |
| mapeamento `recommendation_id → id` | ❌ **não existe** (busca em `engine/facts/` e no Assembler: zero) |
| massa REAL de facts (`fixtures/massa_a_principal.facts.json`) | `recommendations: []`, `evidence: []`, `dimensions: []` |

**Leitura honesta:** no caminho canônico real, **recomendações não fluem hoje**. A massa de
referência — a mesma que sustenta as provas do Assembler — vem vazia nos três blocos.

### 4.3 É possível afirmar "persistiu / sumiu / apareceu / melhorou"?

| afirmação | hoje | por quê |
|---|---|---|
| **persistiu** (id em A e B) | ❌ **não** | não há recomendação no documento |
| **sumiu** (id em A, não em B) | ❌ não | idem |
| **apareceu** (id só em B) | ❌ não | idem |
| **melhorou** | ❌ não | exigiria severidade/score comparável, e o contrato publica `priority` (P1..P4) **sem** garantia de comparabilidade entre execuções |

**Mas o custo de habilitar é pequeno e conhecido:** o id estável já existe na origem; falta o
**mapeamento** e o fluxo até os facts. Não é capacidade nova de análise — é fiação.

> ⚠️ **A tentação exata que a regra deste documento proíbe:** com recomendações no documento e
> sem id, seria trivial parear por `title`. Dois títulos iguais em execuções diferentes **não**
> provam que o problema é o mesmo, e dois títulos diferentes não provam que mudou. Se o id não
> vier, a comparação de recomendações **não acontece**.

Classe: **E pequeno** (mapeamento + fluxo no Engine/facts) → depois **A** no Front.

---

## 5. Drift

### 5.1 O que existe

`drift` aparece **três vezes com três sentidos**:

1. **`primitive_id = "drift_pressure"`** — sinal calculado **DENTRO de uma análise**, a partir de
   `semantic_entropy` e `cross_intent_contamination_rate`, com a razão declarada:
   *"Sinal de drift comportamental-semântico usando métricas já calculadas no pipeline."*
   É **intra-execução**: nenhuma execução anterior participa;
2. **playbooks** (`action_playbooks.py`) — *"Drift Investigation"*, *"Compare current vs prior
   segment outputs for drift-affected intents"*. É **texto de orientação para humano**: o produto
   *sugere* que a pessoa compare, e não compara;
3. **`output_consolidator.py`** — *"unlock richer drift and semantic diagnostics"*: promessa
   futura em texto.

No **Analytics**: **zero** ocorrências de drift, desvio ou comparação temporal entre execuções.
No **Assembler**: uma menção textual.

### 5.2 "Esta Instância mudou de comportamento" é suportável hoje?

**Parcialmente suportável — e menos do que o vocabulário sugere.**

| nível | veredito |
|---|---|
| "este dataset tem pressão de drift **interna**" | ✅ **suportável** — `drift_pressure` existe (se as recomendações fluírem, §4.2) |
| "os indicadores **mudaram** entre a análise A e a B" | ✅ **suportável hoje** — comparação por id (§2.2), sem algoritmo novo |
| "esta **Instância** mudou de comportamento" | ❌ **domínio futuro** — não há Instância, não há baseline, não há série entre execuções |
| "essa mudança é **significativa**" | ❌ **domínio futuro** — exigiria limiar/teste estatístico, que é algoritmo novo e **não** se inventa aqui |

> A distinção que importa: **delta ≠ drift**. Mostrar que um número mudou de 0,80 para 0,72 é
> subtração de fatos publicados. Afirmar que *"o sistema piorou de forma significativa"* é
> inferência — precisa de referência, limiar e dono. Hoje só o primeiro é honesto.

---

## 6. "Por que confiar neste resultado?" — superfície de confiança

**Nenhum score inventado.** A pergunta é o que pode ser **composto** só com dados canônicos.

| dimensão | dado disponível | de onde | compõe hoje? |
|---|---|---|---|
| **metodologia** | `method_id`, `method_version`, `method_parameters`, `method_definition_digest` em **cada** bloco analítico | projeção pública | ✅ **sim** — e hoje **não é exibido** |
| **versionamento** | `result_schema_version`, `measurement_contract_version`, `indicator_registry_version`, `snapshot_contract_version`, `assembler_version`, `facts_schema_version` | envelope + read-model | ✅ sim (2 de 6 exibidos) |
| **qualidade dos dados** | 4 contagens por bloco (`valid`/`null`/`invalid`/`absent`), `distinct_observed` | projeção | ✅ sim (D14) |
| **dados omitidos** | `component_status = partial\|withheld`, `suppression_applied`, `high_cardinality_suppressed`, `other_count = null` | projeção | ✅ sim |
| **por que omitido** | códigos fechados de retenção (concentração) | projeção | ✅ sim — vocabulário fechado, traduzível |
| **cobertura** | as 4 contagens, **sem percentual** | projeção | ✅ sim (D14) |
| **piso de privacidade** | `min_group_size`, `privacy_policy_version` | projeção | ✅ sim — **não exibido** |
| **procedência dos números** | `projection_digest`, `result_checksum`, `snapshot_contract_version` | documento / manifesto | ⚠️ **parcial**: o digest existe e **não vai à tela** (decisão da MF6.4b — o Front não tem contra o que conferir) |
| **timeline** | `GET /{id}/timeline` (`public-events-v1`) | contrato congelado | ⚠️ **existe e não é consumido** |
| **restrições** | `partiality.complete` + `reasons[]` | documento | ✅ sim |
| **reconciliação** | invariante **B == C** provada no Assembler (divergência **recusa** a montagem) | garantia de construção | ✅ **afirmável**: "estes números vêm de duas fontes que concordam" |
| **identificadores** | `analysis_id`, `job_id` (≡), `dataset_fingerprint` | interno | ❌ **fingerprint não é público** (é chave de correlação) |
| **score de confiança** | — | — | ❌ **não existe e não se inventa** |

**Conclusão:** uma superfície de confiança honesta é **composta hoje, sem backend novo** —
metodologia versionada por bloco, política de privacidade aplicada, as quatro contagens, o que foi
omitido e por quê, as restrições declaradas, e a reconciliação entre as duas fontes. O que falta é
**exibir**: `method_*` e `min_group_size` chegam no documento e a tela ignora.

Classe: **A — recomposição** (+ **D** para a timeline).

---

## 7. Lifecycle — Análise, Instância, Workspace

| capacidade | Análise | Instância | Workspace |
|---|---|---|---|
| **criar** | ✅ `POST /v1/analyses` | ❌ (fora do contrato congelado) | ⚠️ `POST /workspaces` — **fora** do `public-v1` |
| **listar** | ✅ `GET /v1/analyses` (cursor) | ❌ | ⚠️ `GET /workspaces` — fora do congelado |
| **arquivar** | ❌ **não existe** | ❌ | ❌ |
| **excluir** | ❌ **não existe** | ⚠️ `DELETE /projects/{id}` — fora do congelado | ⚠️ `DELETE /workspaces/{id}` — fora do congelado |
| **retenção / expiração** | ❌ nenhuma | ❌ | ❌ |
| **arquivo original** | ✅ **ciclo de vida e descarte** no Ingestion (`0004_lifecycle_e_descarte`) + Privacy Gate: purge imediato, certidão durável de destruição, fencing | — | — |
| **export** | ✅ `expired` + `purged_at` (Analytics `0010`), com a distinção explícita entre *"não entrego mais"* e *"não existe mais"* | — | — |
| **registros abandonados** | 🔴 **nenhuma limpeza** — `prepared` fica para sempre (provado na 0b §10); partes de multipart dependem de *lifecycle rule* do bucket, fora da aplicação | — | — |

### O desequilíbrio, dito claramente

O **dado do cliente** tem o ciclo de vida mais maduro da plataforma — descarte, certidão,
fencing, purga de export com estados distintos. O **objeto de trabalho** (a análise) não tem
nenhum: não arquiva, não exclui, não expira, não é limpo quando abandonado.

É coerente com a história (privacidade foi frente própria e fechada), e é a lacuna que aparece
primeiro quando um workspace acumula uso.

**Deltas:** **B4** (limpeza de `prepared`, já registrado na 0b) + **B7** excluir análise
+ **B8** retenção de análises. Todos **E**. *"Arquivar" sai do escopo — não é conceito da V1 (D28).*

### 7.1 Exclusão de análise — regras congeladas (D28)

**Confirmação por digitação do nome da Instância.** Não basta *Confirmar*, checkbox, nem digitar
"EXCLUIR". O modal exibe:

1. a **Instância** a que a análise pertence;
2. a **análise** que será excluída, com identificação/data suficiente para **diferenciá-la** de
   outra (duas análises do mesmo dia não podem ser confundidas);
3. as **consequências** da exclusão;
4. o **campo** onde o usuário digita o nome da Instância;
5. **CTA destrutivo desabilitado** até correspondência **exata**.

> Por que digitar o nome da **Instância** e não o da análise: análise não tem nome próprio — tem
> id e data. Pedir para digitar um id é ruído que a pessoa copia sem ler. O nome da Instância é o
> que ela reconhece, e digitá-lo obriga a **saber de qual sistema** está apagando.

**Restrições congeladas:**

| # | regra | por quê |
|---|---|---|
| R1 | **não usar para análise em processamento nem em `needs_mapping`** | exclusão não pode virar **cancelamento disfarçado** (D15) |
| R2 | `prepared` abandonado **continua** sendo problema de lifecycle/limpeza (**B4**) | não se resolve pendência de sistema pedindo ação destrutiva ao usuário |
| R3 | só **análises terminais** são candidatas, e só **quando o contrato existir** | nenhum botão fake |
| R4 | análise que é **baseline ativo** não pode ser excluída até o baseline ser removido/substituído (**D25**) | apagar a régua deixa a série sem significado |
| R5 | a exclusão deixa **evidência auditável da operação** sem **preservar indevidamente** o conteúdo que deveria ter sido destruído | o registro é do ATO, não do dado |

> ⚠️ **R5 é a mais delicada e merece nome:** "evidência auditável" e "destruição efetiva" puxam em
> direções opostas. O padrão que a plataforma já usa resolve isso — o Analytics distingue
> `expired` (*"não entrego mais"*) de `purged_at` (*"não existe mais"*), e o Ingestion emite
> **certidão de destruição** sem guardar o destruído. A exclusão de análise deve seguir o mesmo
> desenho: registra-se **quem, quando, o quê (por id) e por quê**, nunca o conteúdo.

### 7.2 Discovery do cascade esperado (o que precisa ser decidido no backend)

**Não inventar cascade no Front.** O que a exclusão de uma análise alcança:

| artefato | onde vive | cascade esperado | observação |
|---|---|---|---|
| **resultado v1** (`orchestrator_analysis_results`) | Orchestrator | destruir | tabela é **imutável por trigger** — a exclusão precisa de caminho próprio, não de `update` |
| **resultado v2** (`orchestrator_integrated_results`) | Orchestrator | destruir | idem |
| **facts** (`engine-facts-v1`) | object store + `orchestrator_engine_facts` | destruir bytes **e** referência | a referência sem os bytes vira ponteiro morto; os bytes sem a referência viram órfão |
| **Input Artifact** | object store + metadados | ⚠️ **decisão** | pode ser compartilhado por um **retry** da mesma análise; e o descarte do dado do cliente já tem dono no Ingestion |
| **snapshot/projeção analítica** | Analytics | destruir | é conteúdo derivado do dataset |
| **export** | Analytics | destruir + marcar `purged_at` | o desenho já existe |
| **timeline / eventos públicos** | outbox + Dispatcher | ⚠️ **decisão** | apagar o histórico de eventos **apaga a auditoria**; provavelmente **preservar o evento, destruir o conteúdo** |
| **entregas do Dispatcher** | Dispatcher | ⚠️ **decisão** | envelope entregue já saiu do domínio; retenção própria (`0004`) |
| **referências longitudinais** | Instância | **bloquear** se for baseline (R4); **desfazer** se for só ponto da série | precisa que a série tolere buraco — ou a exclusão fica proibida |
| **comanda analítica** | Orchestrator | destruir | — |

**Três perguntas de cascade que só o backend responde** (Q21–Q23, §13).

---

## 8. Onboarding contextual — do estado, não tutorial

O onboarding **é** a Home reagindo ao estado (D8: momentos da jornada, não personas).

| estado | como é detectado | o que o produto mostra | fonte | existe? |
|---|---|---|---|---|
| **sem Workspace** | contexto autenticado sem workspace | leva a criar o Workspace — passo único | `/v1/me` (claims) | ⚠️ existe o dado; a tela é texto de erro |
| **Workspace sem Instância** | lista de Instâncias vazia | leva a criar a primeira Instância | 🔒 **bloqueado** | ❌ |
| **Instância sem análise** | listagem vazia **na Instância** | leva à primeira análise, explicando o que é uma base | 🔒 bloqueado (hoje: lista vazia do workspace) | ⚠️ parcial |
| **primeira análise processando** | `final_result = pending` **e** é a única da lista | acompanha por componente + explica o que está acontecendo (é a **única** vez que a explicação longa cabe) | `/progress` + `list` | ❌ |
| **primeiro resultado** | primeira análise com `final_result = ready` | orienta a leitura: por onde começar, o que é Analytics, o que é evidência | `list` + `result` | ❌ |
| **ação necessária** | `needs_mapping` (ou pendência equivalente) | **AÇÃO NECESSÁRIA** na faixa 1 da Home | `status` | ⚠️ banner na jornada, não na Home |

**Princípio que isto sustenta:** nenhum passo de onboarding existe sem um **estado que o
justifique**. Não há "tour de 5 passos": há uma Home que, no estado vazio, tem uma coisa só a
fazer — e a explicação mora nesse vazio, não numa camada por cima.

Classe: **A** (composição da Home) para os que dependem só de dado existente; **E** para os que
dependem de Instância.

---

## 9. Capacidades: existentes, parciais, inexistentes

| capacidade | veredito |
|---|---|
| comparar duas análises por indicador | ✅ **existente** (canônica; presa ao legado e ao v1) |
| comparar blocos analíticos entre análises | ⚠️ **parcial** — dados existem, não há superfície |
| superfície de confiança | ⚠️ **parcial** — quase tudo existe no documento e não é exibido |
| timeline da análise | ⚠️ **parcial** — contrato pronto, sem consumidor |
| ciclo de vida do dado do cliente | ✅ **existente e maduro** |
| ciclo de vida da análise | ❌ **inexistente** |
| baseline por Instância | ❌ **inexistente** |
| drift entre execuções | ❌ **inexistente** (existe drift **intra**-análise) |
| identidade de recomendação entre execuções | ⚠️ **existe na origem, não chega ao contrato** |
| destinatário de comunicação | ❓ **não provado** (Q15) |
| onboarding por estado | ⚠️ **parcial** |

---

## 10. Deltas A–F

| # | delta | classe | depende de |
|---|---|---|---|
| L1 | comparação sair do legado e passar por `resolverResultado` (v1+v2) | **A** | — |
| L2 | comparação de blocos analíticos (medidas, distribuições, séries) | **A** | — |
| L3 | superfície de confiança: exibir `method_*`, `min_group_size`, `privacy_policy_version`, restrições, reconciliação | **A** | — |
| L4 | consumir `GET /{id}/timeline` | **D** | — |
| L5 | Home reagindo ao estado (onboarding contextual) | **A** | faixas 1/2/4 |
| L6 | mapeamento `recommendation_id → id` + fluxo até os facts | **E pequeno** | Engine/facts |
| L7 | baseline por Instância (eleição, persistência, publicação, invalidação) | **E** | Instância |
| L8 | drift entre execuções ("mudança significativa") | **E** | L7 + decisão de limiar |
| L9 | arquivar/excluir/reter análise | **E** | — |
| L10 | limpeza de `prepared` abandonado | **E** (= B4) | — |
| L11 | série temporal **entre** execuções | **E** | L7 |
| L12 | fonte de destinatário para comunicação | **E ou já existe** | **Q15** |

**Nada aqui exige algoritmo novo no Front.** Os deltas **A** são recomposição de dados já
publicados; os **E** são capacidade do backend.

---

## 11. Impacto no TO-BE

| onde | mudança |
|---|---|
| §9.1 mestre | **Detalhe da Instância** ganha um quarto destino: **"Comparar execuções"** (hoje `Nova análise`, `Histórico`, `Último resultado`) |
| §9.4 resultados | a hierarquia ganha, dentro de **Metodologia/Tracking**, a **superfície de confiança** composta (§6) — não uma seção nova, um preenchimento da que já existe |
| §9.4 | **"Comparado à execução anterior"** aparece **só quando há duas execuções comparáveis** — mesmo `indicator_registry_version`, ambos `measured`. Divergiu a versão, a tela **diz** em vez de comparar |
| Home (D9) | a faixa **4 (Resultados recentes)** é o embrião da longitudinalidade: é onde "duas execuções" fica visível pela primeira vez |
| §9.5 estados | nenhum estado novo — comparação não é estado da análise |

**O que o TO-BE NÃO ganha:** nenhuma tela de "drift", nenhum gráfico de tendência entre execuções,
nenhum selo de confiança. Os três dependem de deltas **E**.

---

### 11.1 TO-BE conceitual da Instância (congelado)

```
Instância
├── Visão atual
├── Ações necessárias
├── Nova análise
├── Análises / Histórico
├── Evolução
│   ├── vs. anterior
│   ├── comparar duas execuções
│   ├── sinais longitudinais por identidade canônica
│   └── baseline explícito
└── Configuração
```

Mapeamento de cada nó para o que existe:

| nó | fonte | classe |
|---|---|---|
| Visão atual | último resultado (`result`) | **A** após Instância |
| Ações necessárias | `status`/`progress` (needs_mapping e afins) | **A** |
| Nova análise | `POST /v1/analyses` | **A** |
| Análises / Histórico | `GET /v1/analyses` filtrado por Instância | **E** (filtro é delta de Instância) |
| Evolução › **vs. anterior** | duas leituras de `/result` + regra canônica de comparação | **A** (D29) |
| Evolução › **comparar duas execuções** | idem, com seleção | **A** (D29) |
| Evolução › **sinais longitudinais** | `recommendation_id` no documento | **E** (L6 / D27) |
| Evolução › **baseline explícito** | marcação persistida na Instância | **E** (L7 / D25) |
| Configuração | contexto da Instância (D22) | **E** |

### 11.2 A separação que não pode ser perdida

> **delta factual ≠ drift**

| a V1 **pode** dizer | a V1 **não pode** dizer |
|---|---|
| `0,80 → 0,72` | *"a Instância está piorando"* |
| *"mesmo registro de indicadores, então comparáveis"* | *"essa queda é significativa"* |
| *"este sinal aparece nas duas execuções"* (por id) | *"o problema é o mesmo"* (por semelhança) |
| *"não há dado comparável nesta execução"* | *"resolveu"* / *"sumiu"* |

A segunda coluna exige **referência + regra/limiar + owner canônico**. Sem os três, é opinião com
cara de medição.

> ⚠️ **D29 fecha a armadilha mais sutil:** a ausência de um sinal na execução B **nunca** vira
> automaticamente "resolveu" ou "sumiu" — ele pode ter sido **retido por privacidade**
> (`withheld`/`suppression_applied`), ou o bloco pode não ter sido publicado. Ausência de dado
> nunca é zero, e ausência de sinal nunca é cura.

---

## 12. Proposta conceitual: a Instância como objeto observado

Hoje a Instância está desenhada como **agrupadora** — uma pasta que responde *"quais análises são
deste sistema?"*. A proposta é que ela passe a ser o **objeto observado**, que responde
*"como este sistema está se comportando ao longo do tempo?"*.

A diferença não é de tela. É de **onde mora a identidade**:

```
AGRUPADORA                          OBJETO OBSERVADO
a análise é a unidade               a INSTÂNCIA é a unidade
o histórico é uma lista             o histórico é uma SÉRIE
cada resultado é um fim             cada resultado é um PONTO
"o que esta análise disse?"         "o que mudou desde a última vez?"
```

### As quatro camadas, na ordem em que podem existir

| # | camada | o que a Instância passa a ter | depende de | classe |
|---|---|---|---|---|
| **1** | **Continuidade** | as execuções são pontos de uma mesma linha, e a comparação entre duas é oferecida **no lugar certo** | Instância (D11) + L1 | **A** depois de D11 |
| **2** | **Identidade dos sinais** | *"este problema persistiu / sumiu / apareceu"*, por **id**, nunca por semelhança | L6 | **E pequeno** |
| **3** | **Referência** | uma baseline eleita, versionada e **invalidável** — sem ela "piorou" não tem contra o quê | L7 | **E** |
| **4** | **Comportamento** | *"esta Instância mudou de comportamento"*, com limiar declarado e dono | L8 | **E** |

**A ordem importa e não é arbitrária:** cada camada só é honesta se a anterior existir. Continuidade
sem identidade de sinal vira comparação de títulos. Identidade sem referência vira lista de
diferenças sem juízo. Referência sem limiar declarado vira opinião com cara de medição.

### O que a camada 1 já permite dizer, hoje, sem nenhum delta além da Instância

> *"Esta Instância teve 7 análises. Entre a última e a anterior, `useful_outcome_rate` foi de 0,80
> para 0,72. As duas usaram o mesmo registro de indicadores, então os números são comparáveis."*

Tudo nessa frase é fato publicado: contagem, dois valores medidos, uma subtração, e a versão do
registro. **Nada é inferido.**

### O que ela **não** permite, e por quê

> ~~"Esta Instância está piorando."~~

Precisa de referência (camada 3) e de limiar (camada 4). Duas execuções não fazem tendência, e
dizer que fazem é o tipo de afirmação que esta plataforma inteira existe para não fazer.

---

## 13. Perguntas

### 13.1 Encerradas por D24–D29

| # | era | desfecho |
|---|---|---|
| ~~Q15~~ | de onde vem o destinatário? | **D24** — e-mail canônico/verificado do **owner do Workspace**, resolvido server-side. **Prova em §1: a cadeia não fecha hoje** → deltas N1–N3 |
| ~~Q16~~ | baseline: primeira, marcada ou janela móvel? | **D25** — **marcada explicitamente**, versionável, nunca muda em silêncio, pertence à Instância, bloqueia exclusão enquanto ativa |
| ~~Q17~~ | quebra de versão: quebra ou vira duas séries? | **D26** — **quebra a comparabilidade numérica**, com descontinuidade explícita na mesma linha do tempo; nunca representar como aumento/queda |
| ~~Q18~~ | recomendações longitudinais agora ou depois? | **D27** — **entram na V1**, como delta próprio (L6) com testes e freeze próprios; sem id, nenhuma afirmação |
| ~~Q19~~ | arquivar/excluir ou só reter? | **D28** — **excluir sim, arquivar não existe**; confirmação por digitação do nome da Instância; 5 restrições (§7.1) |
| ~~Q20~~ | superfície própria ou embutida? | **D29** — **as duas**, com **uma** regra canônica de comparação |

### 13.2 Abertas — cascade da exclusão (§7.2)

| # | pergunta | por que só o backend responde |
|---|---|---|
| **Q21** | Excluir a análise destrói o **Input Artifact**? | Ele pode ser compartilhado por um **retry** da mesma análise, e o descarte do dado do cliente já tem dono no Ingestion. Destruir junto pode apagar o insumo de outra execução; não destruir pode deixar o dado vivo depois de o usuário mandar apagar |
| **Q22** | Excluir a análise apaga a **timeline / eventos públicos**? | Apagar apaga a **auditoria**; manter preserva metadados de algo que deveria sumir. O caminho provável é **preservar o evento e destruir o conteúdo**, mas é decisão |
| **Q23** | A **série longitudinal** tolera buraco? | Se sim, excluir um ponto do meio é aceitável. Se não, a exclusão fica proibida para análises que participam de comparação — e R4 (baseline) vira caso particular de uma regra maior |

---

## Anexo — o que esta Discovery NÃO fez

Não implementou, não criou algoritmo, não inventou baseline, drift, score de confiança ou
matching de recomendações, não alterou backend ou contrato, não instalou dependência, não desenhou
tela, não fez push, deploy, Railway nem Big Bang.
