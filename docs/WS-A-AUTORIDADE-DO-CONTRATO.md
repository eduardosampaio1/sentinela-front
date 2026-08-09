# WS-A — Autoridade e higiene do contrato público

> **Objetivo:** não adicionar feature. Tornar **impossível** repetir os dois erros da revisão:
> (1) operação pública existente e invisível ao gate; (2) campo público aninhado existente e
> ignorado por leitura superficial.
>
> **Backend de produção intocado.** Os sete repos verificados com `git status`: **0 alterações**.
> Zero push/deploy/Railway. Big Bang bloqueado.

---

## A1 — Autoridade resolvida explicitamente

### O que existia

```ts
const ORIGENS = [".../sentinela-facts/docs/contracts", ".../sentinela/docs/contracts"];
const ORIGEM = ORIGENS.find((p) => existsSync(resolve(p, "public-v1.json")));
```

`find` devolve a **primeira que existir**. Com dois checkouts divergentes no disco — 11 operações
contra 6 — a autoridade virava consequência de quais pastas alguém clonou. O próprio comentário do
arquivo já avisava, e a válvula `SENTINELA_CONTRACT_ORIGIN` existia e não era usada por ninguém.

### O que passou a existir — `src/test/v1/contractOrigin.ts`

`resolverOrigemDoContrato()` devolve um **fato declarado**:

| campo | conteúdo |
|---|---|
| `motivo` | `declarada-por-env` · `candidata-unica` · `candidatas-identicas` · `ambigua` · `ausente` |
| `escolhida` | caminho, **digest SHA-256** do arquivo bruto, `version`, nº de operações |
| `candidatas` | todas as encontradas, cada uma com digest próprio |
| `divergencia` | preenchido só em `ambigua` — o que difere, com digest e contagem |

**A regra que importa:** com mais de uma candidata e **digests diferentes**, o resolvedor devolve
`ambigua` e `escolhida = null`. **Não escolhe.** O gate `contract-authority.test.ts` falha com:

```
AUTORIDADE DO CONTRATO AMBÍGUA: existem múltiplas origens com conteúdo DIFERENTE e
ninguém declarou qual manda.
  .../sentinela-facts/docs/contracts → 11 operações, digest 5b3a…
  .../sentinela/docs/contracts       → 6 operações, digest 9e41…
Declare a autoridade em SENTINELA_CONTRACT_ORIGIN, ou alinhe as origens.
Este gate NÃO escolhe por ordem de pasta.
```

### Resolução vigente

```
origem canônica : <repo>/../sentinela-facts/docs/contracts/public-v1.json
motivo          : declarada-por-env (SENTINELA_CONTRACT_ORIGIN)
versão          : public-v1
operações       : 11
```

> 🔴 **Hoje, sem a variável, o gate fica VERMELHO** — e isso é o comportamento correto: é o estado
> real de B9. CI e dev **precisam declarar** `SENTINELA_CONTRACT_ORIGIN` enquanto C1 não for
> resolvido. A ausência ficou **inequívoca**: aparece no comando, não em lugar nenhum.
> A outra ausência — nenhuma origem no disco — continua exigindo `SENTINELA_CONTRACT_ORIGIN_ABSENT=1`.

---

## A2 — Inventário normalizado de operações

`src/test/v1/operationInventory.ts` normaliza os dois lados para a mesma forma
(`método + caminho + operationId + query obrigatória + projeção`), com `{...}` e `${...}`
colapsados em `{analysis_id}`, ordenada deterministicamente.

### As 11 operações do contrato

| # | operação | operationId | cliente? |
|---|---|---|---|
| 1 | `GET /v1/analyses` | `list_analyses` | ✅ |
| 2 | `POST /v1/analyses` | *prepare* | ✅ |
| 3 | `GET /v1/analyses/{analysis_id}` | *status* | ✅ |
| 4 | `POST /v1/analyses/{analysis_id}/data` | *upload* | ✅ |
| 5 | `POST /v1/analyses/{analysis_id}/submit` | *submit* | ✅ |
| 6 | `POST /v1/analyses/{analysis_id}/retry` | *retry* | ✅ |
| 7 | `GET /v1/analyses/{analysis_id}/result` | *result* | ✅ |
| 8 | `GET /v1/analyses/{analysis_id}/progress` | *progress* | ❌ **B1** |
| 9 | `GET /v1/analyses/{analysis_id}/analytics` | *analytics* | ❌ **B1** |
| 10 | `GET /v1/analyses/{analysis_id}/analytics/export/download` | *export* | ❌ **B1** |
| 11 | `GET /v1/analyses/{analysis_id}/timeline` | *timeline* | ❌ **B1** |

**Resposta objetiva, sem ambiguidade de "11 × 6":**

```
operacoes no contrato ........ 11
com cliente no front .......... 7
sem cliente (B1) .............. 4
no cliente e fora do contrato . 1   (GET /v1/me — C2)
tipos declarados na copia ..... todos os 7 com cliente
```

### Diff categorizado

O gate emite `missing_in_front`, `extra_in_front`, `method_mismatch`, `path_mismatch`,
`projection_mismatch`. **Contagem não é aceita como resposta.**

`method_mismatch`, `path_mismatch` e `projection_mismatch` são **zero** e devem continuar zero.
`missing_in_front` e `extra_in_front` são comparados com a **dívida declarada** em
`divergenciaDeclarada.ts`: item novo fica vermelho, e **item resolvido também** — a lista precisa
encolher junto com a dívida, senão vira folclore.

---

## A3 — C2 resolvido por prova: `/v1/me`

**Três perguntas, três respostas com evidência.**

**1. `/v1/me` é operação pública real?** ✅ **Sim.** O Gateway implementa em
`sentinela-facts/api/routes/me_v1.py` (`@router.get("")` sob o prefixo `/v1/me`), e o contrato
congela **quatro** grupos de campos: `me_read_model_fields`, `me_user_fields`,
`me_workspace_fields`, `me_capabilities`.

**2. `operations[]` pretende representar todas as operações públicas, ou só a família `analyses`?**
**Todas.** Se representasse só `analyses`, o manifesto não congelaria a superfície de `/v1/me` nem
declararia em `me_nota` que *"GET /v1/me é a ÚNICA autoridade de membership do cliente"*. Ele
congela e declara. Um manifesto que exclui uma operação da lista mas congela o read-model dela
está incompleto, não seletivo.

**3. Por que `MeView` está congelado e a operação não está na lista?** `me_nota` diz *"Congelado a
partir da Onda 8 — até então o frontend dependia desta forma sem nada travando"*. A Onda 8
adicionou os **campos** e não voltou para adicionar a **entrada**. É omissão de manutenção.

### Veredicto: **defeito do contrato**. Patch exato necessário:

```json
{
  "method": "GET",
  "operationId": "get_me",
  "path": "/v1/me",
  "required_headers": [],
  "required_query": [],
  "success_status": [200]
}
```

Aplicar em `sentinela-facts/docs/contracts/public-v1.json`, no array `operations`, mantendo a
ordenação existente. **Não aplicado nesta missão** — é o repo congelado (§A12.14).

Enquanto não for aplicado, a divergência fica **declarada** em `SEM_ENTRADA_NO_CONTRATO` e o gate
falha se ela mudar de tamanho.

---

## A4 — Projeções e campos aninhados

### Por que o gate antigo dava falsa segurança

`analytics_read_model_fields` lista `snapshot` **e não o abre**. Quem procura `method_id` no
contrato de topo recebe *"não existe"* — com a mesma confiança com que receberia *"existe"*. Foi
exatamente esse o erro. A superfície aninhada é declarada nos contratos Pydantic do
`sentinela-analytics-service`, e é lá que o gate novo vai buscá-la.

### `src/test/v1/nestedProjection.ts` — comparação semântica, não byte a byte

Compara **por projeção nomeada**, resolvendo herança de bases privadas (`_SerieBase`,
`_CruzamentoBase`) — sem isso, `SerieTemporal` compararia metade da superfície e daria verde.
Verifica campos, **nullability contratual**, e separa as três direções:

| direção | tratamento |
|---|---|
| **lido sem publicação** (campo do fio) | 🔴 **invenção** — zero tolerância, sem dívida declarada |
| **só no front, `camelCase`** | derivação legítima do view model — **declarada** em `DERIVADOS_DO_VIEW_MODEL` |
| **publicado e não lido** | dívida — **declarada por projeção** |
| **nullability divergente** | zero tolerância |

### O que a comparação por projeção revelou — e o conjunto único esconderia

> 🔎 **`min_group_size` é lido em `ResumoDeDistribuicao` e NÃO é lido em `ResumoDeConcentracao`
> nem em `SerieTemporal`.**
>
> Isto é mais preciso do que a correção anterior do Blueprint, que dizia apenas *"já chega ao
> front"*. Chega nas três e é lido em **uma**. Um conjunto agregado diria "não lido" e estaria
> meio errado nas duas direções.

### A dívida, por projeção

| projeção | publicado e não lido |
|---|---|
| `ResumoNumerico` | `method_id` `method_version` `method_parameters` `method_definition_digest` |
| `ResumoDeDistribuicao` | os 4 de método + `privacy_policy_version` `top_k` `max_tracked_categories` |
| `ResumoDeConcentracao` | os 4 de método + `privacy_policy_version` **`min_group_size`** `max_tracked_values` |
| `SerieTemporal` | os 4 de método + `privacy_policy_version` **`min_group_size`** `max_time_buckets` `series_contract_version` |
| `SnapshotAnalitico` | `input_artifact_id` `plan_contract_version` `plan_digest` · e os **deliberados**: `flag_crosses` `numeric_crosses` `flag_series` `numeric_series` `unsupported_measure_ids` `unauthorized_measure_ids` |

**Duas naturezas, e a diferença importa para o plano:**

- **(a) dívida** — trust e parâmetros de privacidade que a tela deveria mostrar. **Delta de
  frontend**, nunca de backend.
- **(b) deliberado e documentado** — `flag_crosses` e companhia são **contados** em
  `blocosNaoApresentados`; `unsupported_measure_ids`/`unauthorized_measure_ids` são contados e
  **nunca nomeados**, porque `measure_id` é chave de saída e a MF5 congelou que chave de saída não
  atravessa a fronteira pública.

**`lido_sem_publicacao` do fio: zero.** O front não inventa nenhum campo.

---

## A5 — Prova negativa por mutação

Harness em `scratchpad/ws-a-mutacao/mutar.mjs`. **As mutações são aplicadas em CÓPIAS**, e os gates
são apontados para elas por variável de ambiente — o repo congelado nunca é escrito, e por isso
**não há nada a restaurar**.

**Controle antes:** `src/test/v1/` inteiro **verde** (167 testes). Instrumento provado antes de
acusar o código.

| # | mutação | gate | caso que morreu | resultado |
|---|---|---|---|---|
| 1 | remove operação — `GET /timeline` (11 → 10) | `contract-operations` | *a divergência real é EXATAMENTE a divergência declarada* | ✅ matou |
| 2 | altera path — `/result` → `/resultado` | `contract-operations` | idem | ✅ matou |
| 3 | remove campo top-level — `retry_allowed` | `contract-sync` | *o read-model de STATUS casa com o contrato* | ✅ matou |
| 4 | remove campo **aninhado** — `min_group_size` do produtor | `contract-nested` | *os campos publicados e não lidos são EXATAMENTE os declarados* | ✅ matou |
| 5 | altera enum — `needs_mapping` → `needs_review` | `contract-sync` | *o vocabulário de ESTADOS casa com o contrato* | ✅ matou |

**5/5.** Cada mutação matou **o gate esperado**, não outro qualquer — a asserção do harness exige o
nome do caso na saída, não apenas exit code diferente de zero.

---

## A6 — As três representações

| # | representação | classificação | provenance |
|---|---|---|---|
| 1 | `sentinela-facts/docs/contracts/public-v1.json` | **AUTHORITATIVE** | origem resolvida; digest SHA-256 calculado a cada execução |
| 2 | `sentinela/docs/contracts/public-v1.json` | **DERIVED/MIRROR — STALE** | mesmo `version: public-v1`, **6 operações contra 11**. Não é uma versão anterior declarada: é a mesma versão com conteúdo menor |
| 3 | `src/lib/v1/contract/public-v1.types.ts` | **GENERATED/ADAPTED** (escrito à mão) | declara `ORIGEM` e `docs/contracts` no cabeçalho; gate exige que continue declarando |

**Não podem existir três fontes da verdade.** Hoje existem três representações e **uma** autoridade
— o que faltava era o mecanismo para dizer qual, e é isso que o A1 entrega.

**Detecção de cópia stale:** o digest do resolvedor detecta divergência entre (1) e (2) sem
comparar campo a campo. Para (3), a detecção é a comparação de superfície do `contract-sync` mais
o inventário de operações do A2.

> **Sincronização de (2) é patch em repo congelado.** O delta esperado é: alinhar
> `sentinela/docs/contracts/public-v1.json` com a origem, **ou** declará-lo explicitamente como
> snapshot histórico de outra versão (o que exigiria mudar o `version`). Não aplicado — a missão
> para nesta fronteira.

---

## A7 — B1 confirmado

Os quatro clientes faltantes são **delta de Front sobre contrato REAL**. Cada um existe no
contrato canônico com método, caminho e `operationId` — nada precisa ser criado no backend:

```
GET /v1/analyses/{analysis_id}/progress
GET /v1/analyses/{analysis_id}/analytics
GET /v1/analyses/{analysis_id}/analytics/export/download
GET /v1/analyses/{analysis_id}/timeline
```

O caso `WS-A7` do gate falha se algum deles deixar de existir no contrato — porque aí deixaria de
ser delta de front. **Não implementados.** Continuam sendo a missão **WS-C**.

---

## A8 — B2 corrigido no Blueprint

Registrado em `EXPERIENCE-BLUEPRINT-V1.md` §4.5 e §20 (commit `2dc1596`). A verdade vigente:

- domínio de `profile`/`mapping` **existe** no Ingestion Service;
- lógica de candidatos e ativação **existe e é testada** (`mapping/ativacao.py`, oito condições
  conjuntivas; `mapping/sugestao.py` escrito **para a tela**);
- a **fronteira pública não expõe** — `public-v1.json` não tem operação de mapping;
- a API interna usa `ingestion_id`; a experiência pública usa `analysis_id`;
- a ponte existe **internamente** (`orchestrator_ingestion_inbox.analysis_id`), **não** no contrato.

**Portanto B2 = publicação + identity bridge + leitura de candidatos**, não criação de domínio.

**Nenhuma UI de resolução de `needs_mapping` é aprovada antes desse delta.**

---

## A9 — Trust corrigido

Os **11 elementos** estão disponíveis canonicamente. Classificação em três faixas:

| faixa | elementos |
|---|---|
| **já consumido no Front** | `result_schema_version` · `indicator_registry_version` · `snapshot_contract_version` · `snapshot_digest` · `projection_digest` · `disclosure_rule_version` · `withheld{applied,output_count,reason_code}` · `generated_at` · contagens A/B/C · **`min_group_size` (só em `ResumoDeDistribuicao`)** |
| **contratado, ainda não consumido** | `method_id` · `method_version` · `method_parameters` · `method_definition_digest` · `privacy_policy_version` · `top_k` · `max_tracked_categories` · `max_tracked_values` · `max_time_buckets` · `series_contract_version` · `plan_contract_version` · `plan_digest` · **`min_group_size` em Concentração e Série** |
| **operação contratada sem cliente** | `timeline` (B1) |

**`method_*` e `privacy_policy_version` são delta de FRONT.** Nenhum delta de backend é aberto por
eles — o dado já chega e é descartado na leitura.

---

## A10 — Rotas públicas registradas

**Decisão registrada:**

```
/analyses
/analyses/new
/analyses/:id
/analyses/:id/result
/analyses/:id/result#comparison
```

`/canonical/*` é **interno / compatibilidade**, não IA pública.

**`/home → /` NÃO congelado.** Primeiro é preciso provar o *ownership* de `/`, considerando que
hoje ele pertence à `LandingPage` (site público) e que a fronteira com auth passa por ali. Fica
como pergunta aberta, não como decisão adiada em silêncio.

**Rotas de Instância permanecem conceituais e bloqueadas por B3.**

---

## A11 — UI COMPLETE passa a ter 18 gates

Os 14 originais permanecem. Acrescentados:

**15.** zero `#hex` literal em componentes — o gate da E7 já provou que dá para manter em zero.
**16.** um único vocabulário de tokens, com **mutação de duplicidade falhando**.
**17.** uma única semântica pública de estados — sem estado bruto de backend na tela e sem
vocabulário paralelo por superfície (é a defesa contra `HomeStatus`/`InstanceStatus`/
`AnalysisStatus` com três linguagens).
**18.** paridade `pt.json` × `en.json`.

**UI Freeze não executado.**

---

## A12.13 — O que ainda impede encerrar B9

| # | pendência | onde resolve |
|---|---|---|
| 1 | `sentinela/docs/contracts/public-v1.json` continua **stale** com a mesma `version` | patch em repo congelado (§A6) |
| 2 | `/v1/me` fora de `operations[]` | patch em repo congelado (§A3) |
| 3 | Sem os patches, **CI e dev precisam declarar `SENTINELA_CONTRACT_ORIGIN`** — senão o gate de autoridade fica vermelho | operação |
| 4 | A superfície aninhada não tem **publicação canônica**: o gate compara o front com os modelos Pydantic do produtor, atravessando fronteira de repo. Funciona, mas o certo seria o Analytics publicar um schema | delta do Analytics |

**B9 fica ABERTO.** O que mudou: ele deixou de ser invisível. As três divergências agora têm
digest, nome e um gate que falha quando mudam.

---

## A12.14 — Alterações que exigiriam tocar repo congelado

**Nenhuma foi aplicada.** Os deltas esperados, prontos para a frente que os autorizar:

| # | repo | alteração |
|---|---|---|
| 1 | `sentinela-facts` | acrescentar a entrada `get_me` em `operations[]` (§A3, JSON exato) |
| 2 | `sentinela` | alinhar `docs/contracts/public-v1.json` com a origem, **ou** declarar como snapshot histórico com `version` própria |
| 3 | `sentinela-analytics-service` | publicar schema canônico da superfície aninhada do snapshot, para o gate do A4 parar de atravessar fronteira de repo |
| 4 | `sentinela-facts` + Ingestion | expor `profile`/`mapping` no `/v1` e ligar `analysis_id ↔ ingestion_id` (B2) |

---

## Arquivos desta missão

Todos em `src/test/v1/` — **camada de teste, nenhum código de produto**:

| arquivo | papel |
|---|---|
| `contractOrigin.ts` | A1 — resolução explícita com digest, versão, motivo e ambiguidade |
| `operationInventory.ts` | A2 — normalização e diff categorizado das operações |
| `nestedProjection.ts` | A4 — extração e comparação semântica das projeções aninhadas |
| `divergenciaDeclarada.ts` | a dívida declarada, com o porquê de cada item |
| `contract-authority.test.ts` | A1 + A6 |
| `contract-operations.test.ts` | A2 + A3 + A7 |
| `contract-nested.test.ts` | A4 |

**Bateria:** `src/test/v1/` — **167 testes, 22 arquivos, todos verdes** com a autoridade declarada.
`npm run typecheck` — **205/205** arquivos cobertos por 6 projetos.
