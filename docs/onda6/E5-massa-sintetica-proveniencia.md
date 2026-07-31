# Onda 6 — E5: massa sintética controlada e proveniência das fixtures

**PROVISÓRIO.** Válido para desenvolvimento e testes da Onda 6. **Não** representa o contrato
público definitivo do resultado (ver dívida "Padronização Canônica do Resultado Analítico",
pós-Onda 8). O contrato público segue `result: unknown` — nada aqui altera backend, `public-v1`,
Result Store, Gateway, Orchestrator ou Engine.

## Fluxo de proveniência (item 2)

```
massa sintética (números simples)
  → CÓDIGO ANALÍTICO REAL do repo `sentinela` executado localmente (read-only)
  → saída capturada
  → fixture sanitizada do frontend (perfil provisório)
```

**Funções reais exercidas** (nenhuma fórmula foi reimplementada no frontend):

| Função | Arquivo | O que calcula |
|---|---|---|
| `estimate_useful_outcome_economics` | `sentinela/engine/business/cost_estimators.py:149` | `observed_conversations`, `useful_outcomes`, `useful_rate`, `total_estimated_cost`, `cost_per_useful_outcome` (**`None` quando não há úteis**) |
| `compute_tenant_metrics` | `sentinela/engine/business/unit_economics.py:62` | `cost_per_session`, `useful_rate`, `handoff_rate`, `token_waste_per_session`, `intent_coverage_rate`, `intent_count`, `avg_variance_per_intent` |

- **Repo de origem**: `D:\projetos\sentinela` @ `e7d0703` (baseline aprovado).
- **Execução**: script read-only (scratchpad), sem alterar nenhum arquivo do backend.
- **Determinismo**: as duas funções são aritmética pura sobre a massa — sem LLM, sem embeddings,
  sem serviço externo. Reexecutar com a mesma massa dá o mesmo resultado.

## Massas e conferência manual

### Massa A — feliz (números redondos)

Entrada: 100 registros; 80 com `outcome.status="resolved"` (úteis), 20 com `"unresolved"`
(não-úteis, **sem** handoff); `trace.estimated_cost_usd = 0.10` por registro; 17 de 20 intenções
cobertas; `token_waste_estimate = 20` (contagem absoluta); variâncias `[0.10, 0.20, 0.30]`.

| Campo | Valor produzido | Conferência manual |
|---|---|---|
| `observed_conversations` | 100 | contagem |
| `useful_outcomes` | 80 | contagem |
| `useful_rate` | **0.8** | 80/100 |
| `total_estimated_cost` | **10.0** | 100 × 0.10 |
| `cost_per_useful_outcome` (CPUO) | **0.125** | 10.00/80 |
| `cost_per_session` | 0.1 | 10.00/100 |
| `intent_coverage_rate` | **0.85** | 17/20 → exibir **85%**, nunca 8.500% |
| `token_waste_per_session` | 0.2 | 20/100 |
| `intent_count` | 17 | passado |
| `avg_variance_per_intent` | 0.2 | (0.10+0.20+0.30)/3 |

### Massa B — sem úteis (ausência × zero real)

10 registros, 0 úteis, custo 0.001/registro, 0 de 5 intenções cobertas, waste 0.

| Campo | Valor | Leitura |
|---|---|---|
| `cost_per_useful_outcome` | **`null`** | **ausência honesta** (não há denominador) — jamais renderizar como 0 |
| `intent_coverage_rate` | **0** | **zero REAL** (0 de 5 cobertas) |
| `total_estimated_cost` | 0.01 | 10 × 0.001 |
| `useful_rate` | 0 | zero real |

Esta massa é o oráculo que separa **zero medido** de **não medido**.

### Massa C — sub-centavo

3 registros úteis, custo 0.0014 cada.

| Campo | Valor | Leitura |
|---|---|---|
| `total_estimated_cost` | **0.0042** | não pode virar `0.00` nem `$0` |
| `cost_per_useful_outcome` | **0.0014** | precisão significativa preservada (6 casas na origem) |
| `token_waste_per_session` | 0.3333 | 1/3 |
| `intent_coverage_rate` | 0.25 | 1/4 |

## Campos determinísticos × simulados

**Determinísticos validados** (calculados pelo código analítico real e conferidos à mão):
`observed_conversations`, `useful_outcomes`, `useful_rate`, `total_estimated_cost`,
`cost_per_useful_outcome`, `cost_per_session`, `token_waste_per_session`, `intent_coverage_rate`,
`intent_count`, `avg_variance_per_intent`.

**Apenas simulados** (valor declarado na fixture só para validar a **renderização**; a E5 **não**
afirma ter validado o cálculo analítico deles):
- `analyzed_at` — vem do backend na vida real (`created_at`/`updated_at` do status); a fixture
  declara um valor fixo. **Nunca** gerado com `new Date()` no cliente.
- `recommendations` — no código real dependem de LLM/regras não determinísticas
  (`infra/prompt_recommendations.py`); a fixture declara título/ordem **já definidos**, e o
  frontend apenas renderiza na ordem recebida.
- `currency` — o snapshot real devolveu `null` nesta massa; a fixture exercita ambos os casos
  (com e sem moeda declarada) para provar que o frontend **não assume** BRL/USD.

## Armadilhas semânticas registradas (não renderizadas com nome falso)

1. **`handoff_rate` NÃO é taxa de handoff.** Em `compute_tenant_metrics` é `1 - useful_rate`
   (quando `useful_rate > 0`). Na massa A deu **0.2 com ZERO handoffs reais**. Rotular como
   "handoff" afirmaria semântica que o campo não possui → **fora da UI canônica**; se um dia for
   exibido, o rótulo honesto é "taxa de não-úteis".
2. **`token_waste` é contagem absoluta**, não percentual. `token_waste_per_session` é uma razão
   por sessão (0.2), não "20%".
3. **`avg_variance_per_intent` é variância**, não "consistência", não "drift", não "confiança".
4. **Ausência→0.0 no legado**: `core/materialization/analysis.py:47` e `core/adapters/argos.py:219`
   colapsam `cost_per_useful_outcome=None` em `0.0`. O frontend canônico **não** replica isso: a
   fronteira provisória preserva `null` como indisponível.

## Onde a massa vive

- Geração (read-only, fora do repo do front): script de scratchpad documentado aqui.
- Fixture do frontend: `src/test/fixtures/provisional-result/` — usada **somente** em Vitest, MSW
  e Playwright. Nunca em build de produção (cadeado).
