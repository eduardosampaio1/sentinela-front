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

## 1. Q11 — rastreio de `Mensagem.destino` (prova pendente da Etapa 0b)

**Resultado: prova de AUSÊNCIA parcial — a cadeia não fecha.**

O que foi seguido, no `sentinela-event-dispatcher`:

| ponto | evidência |
|---|---|
| `adapters/email.py::montar(...)` | devolve `Mensagem(destino="", …)` — **nasce vazio, deliberadamente** |
| `Mensagem` | dataclass `frozen` com `destino, assunto, texto, html` |
| `EnvioDeEmail.enviar(...)` | recebe o destino **de fora** e monta a mensagem final |
| **quem chama com um destino real** | ❌ **não localizado nesta auditoria** |

**O que isso significa, sem exagero:** o compositor está correto ao não inventar destinatário — a
mensagem é conteúdo, o endereço é destino, e são coisas diferentes. O que **não** consegui provar
é a existência de uma **fonte canônica de destinatário**: nenhuma tabela, campo de evento ou
configuração encontrada diz *para quem* enviar.

**Consequência:** a comunicação externa **não pode ser considerada fechada**. Toda a
infraestrutura provada na Etapa 0b (Dispatcher, SMTP, retry, dedup, dead letter, política de três
eventos) permanece válida — e sem destinatário ela entrega para ninguém.

**Não afirmo que não existe.** Afirmo que **não encontrei**, e nomeio onde procurar a seguir:
configuração de assinatura/subscrição por workspace, campo no envelope público, ou tabela do
Dispatcher que ligue workspace → endereço. Fica como **Q15**.

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

**Deltas:** **B4** (limpeza de `prepared`, já registrado na 0b) + **B7** arquivar/excluir análise
+ **B8** retenção de análises. Todos **E**.

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

## 13. Perguntas realmente novas

| # | pergunta | por que é decisão |
|---|---|---|
| **Q15** | **De onde vem o destinatário da comunicação?** (Q11 não fechou — §1) | Sem fonte canônica, a comunicação externa está bloqueada apesar de toda a infra pronta. Pode ser configuração por workspace, campo no evento, ou capacidade ausente |
| **Q16** | A **baseline** de uma Instância é a **primeira** execução, uma **marcada manualmente**, ou uma **janela móvel**? | Cada escolha muda o significado de "piorou". É a decisão que define o produto longitudinal |
| **Q17** | Quando o `indicator_registry_version` ou o `measure_schema` muda, o histórico anterior **quebra a comparação** ou vira **duas séries**? | Determina se longitudinalidade sobrevive à evolução do produto |
| **Q18** | Recomendações entram no documento canônico agora (**L6**), ou o loop de evidência fica para depois da Instância? | É delta pequeno com valor grande; a ordem é sua |
| **Q19** | Análise deve poder ser **arquivada/excluída** pelo usuário (**L9**), ou só expirar por retenção? | Muda o modelo mental: análise é registro permanente ou item gerenciável? |
| **Q20** | "Comparar execuções" é uma **superfície própria** da Instância, ou aparece **embutida no resultado** ("vs. execução anterior")? | A segunda é mais barata e mais descoberta; a primeira permite escolher quais duas |

---

## Anexo — o que esta Discovery NÃO fez

Não implementou, não criou algoritmo, não inventou baseline, drift, score de confiança ou
matching de recomendações, não alterou backend ou contrato, não instalou dependência, não desenhou
tela, não fez push, deploy, Railway nem Big Bang.
