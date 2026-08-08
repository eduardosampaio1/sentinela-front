// Massas do documento INTEGRADO `analysis-result-v2` — PRODUZIDAS pelo caminho real.
//
// PROVENIÊNCIA, em três etapas, todas com código de produção:
//
//   1  dataset canônico sintético (100 registros)
//        → sentinela-analytics-service::reducer.agregacao.calcular      → SnapshotAnalitico
//        → sentinela-analytics-service::reducer.publicacao.construir    → ProjecaoPublica
//   2  fixtures/massa_a_principal.facts.json  (facts REAIS do assembler, saída do código
//      analítico do repo `sentinela`)
//        + a projeção acima
//        → sentinela-result-assembler::assemble_v2                      → analysis-result-v2
//   3  transcrição literal do JSON para este arquivo
//
// O que é sintético é a ENTRADA — e só ela pode ser, sem a massa deixar de provar nada. Todo
// agregado abaixo (distribuições, concentração, séries, supressões) saiu do reducer real; a
// decisão de publicar, do publicador real; a montagem, da função de produção.
//
// Os três estados NÃO foram escolhidos: eles caíram das condições preparadas na entrada.
//
//   V2_READY    nada retido. Traz um `flag_cross` publicável — é ele que faz a tela exercitar a
//               nota honesta "o documento trouxe blocos que esta versão não apresenta".
//   V2_PARTIAL  o cruzamento canal x resolvido tem uma linha abaixo do piso; sobra UMA linha de
//               um universo de duas, e a marginal da flag entrega a outra por subtração. O
//               avaliador CONJUNTO removeu o bloco — e é isso que faz o desfecho ser `partial`.
//   V2_WITHHELD nada pôde ser liberado. Este estado NÃO é alcançável a partir de dataset
//               bem-formado: ele é o ramo de "a declaração é contraditória", e o reducer não
//               produz contradição. O próprio teste do serviço o alcança quebrando
//               `distinct_observed`, e foi o que se fez aqui. O ENVELOPE continua saindo do
//               publicador real — e, por definição, ele não carrega número analítico nenhum.
//
// Regenerar: os três scripts em `scratchpad/gerar_snapshot.py`, `gerar_v2.py`,
// `montar_fixture.py` (documentados em docs/MF6-4B-MASSAS.md).

import type { AnalysisResultView } from "@/lib/v1";


/** Nada retido — o documento inteiro. */
export const V2_READY = {
  "analysis_id": "an-massa-a",
  "result_schema_version": "analysis-result-v2",
  "measurement_contract_version": "measurement-1.0",
  "summary": {
    "engine_window_record_count": 100,
    "analyzed_at": "2026-07-31T10:00:00Z"
  },
  "indicators": [
    {
      "id": "useful_outcome_rate",
      "state": "measured",
      "value": 0.8,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 100.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "outcome_field_coverage_rate",
      "state": "measured",
      "value": 0.85,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 100.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "intent_coverage_rate",
      "state": "measured",
      "value": 0.85,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "intents",
        "value": 20.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "analyzed_conversation_count",
      "state": "measured",
      "value": 100.0,
      "kind": "count",
      "unit": "conversations",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 0
    },
    {
      "id": "useful_outcome_count",
      "state": "measured",
      "value": 80.0,
      "kind": "count",
      "unit": "conversations",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 0
    },
    {
      "id": "handoff_count",
      "state": "measured",
      "value": 0.0,
      "kind": "count",
      "unit": "conversations",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 0
    },
    {
      "id": "total_estimated_cost",
      "state": "measured",
      "value": 10.0,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "token_cost_total",
      "state": "measured",
      "value": 10.0,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "handoff_cost_total",
      "state": "measured",
      "value": 0.0,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "cost_per_useful_outcome",
      "state": "measured",
      "value": 0.125,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": {
        "kind": "useful_outcomes",
        "value": 80.0
      },
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "cost_per_session",
      "state": "measured",
      "value": 0.1,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 100.0
      },
      "coverage": null,
      "display_precision": 6
    }
  ],
  "dimensions": [],
  "recommendations": [],
  "evidence": [],
  "partiality": {
    "complete": true,
    "reasons": []
  },
  "analytics": {
    "component_status": "ready",
    "projection_digest": "2a4b544c3a3e1aeb2787398d4bb6ff6d64cccfe46058e038112d6da21789bafa",
    "snapshot_contract_version": "analytics-snapshot-v9",
    "record_count": 100,
    "data": {
      "snapshot_contract_version": "analytics-snapshot-v9",
      "input_artifact_id": "",
      "plan_contract_version": "",
      "plan_digest": "",
      "record_count": 100,
      "numeric": [
        {
          "measure_id": "custo",
          "unit": "BRL",
          "semantic_role": "sum",
          "valid_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "minimum": 0.05,
          "maximum": 0.13,
          "total": 8.959999999999999,
          "mean": 0.08959999999999999,
          "suppression_applied": false,
          "method_id": "numeric_summary",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "3374a4855b92e183e02d42d81ba85e7721ad576b6e9fefb0d3226ab3f442c8c8"
        },
        {
          "measure_id": "declared_turns",
          "unit": "turns",
          "semantic_role": "sum",
          "valid_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "minimum": 3.0,
          "maximum": 40.0,
          "total": 924.0,
          "mean": 9.24,
          "suppression_applied": false,
          "method_id": "numeric_summary",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "3374a4855b92e183e02d42d81ba85e7721ad576b6e9fefb0d3226ab3f442c8c8"
        }
      ],
      "distributions": [
        {
          "measure_id": "resolvido",
          "value_type": "boolean",
          "privacy_policy_version": "analytics-group-privacy-v1",
          "min_group_size": 10,
          "top_k": 20,
          "max_tracked_categories": 256,
          "value_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "distinct_observed": 2,
          "groups": [
            {
              "label": "true",
              "count": 75
            },
            {
              "label": "false",
              "count": 25
            }
          ],
          "other_count": null,
          "suppression_applied": false,
          "high_cardinality_suppressed": false,
          "method_id": "label_distribution",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "5252e0ccbb17250c2f5eee464c924fa9f5d5853b2b77232a5806bde407909944"
        }
      ],
      "dimensions": [
        {
          "measure_id": "canal",
          "value_type": "categorical_code",
          "privacy_policy_version": "analytics-group-privacy-v1",
          "min_group_size": 10,
          "top_k": 20,
          "max_tracked_categories": 256,
          "value_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "distinct_observed": 4,
          "groups": [
            {
              "label": "whatsapp",
              "count": 45
            },
            {
              "label": "chat",
              "count": 30
            },
            {
              "label": "email",
              "count": 15
            },
            {
              "label": "phone",
              "count": 10
            }
          ],
          "other_count": null,
          "suppression_applied": false,
          "high_cardinality_suppressed": false,
          "method_id": "label_distribution",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "5252e0ccbb17250c2f5eee464c924fa9f5d5853b2b77232a5806bde407909944"
        }
      ],
      "flag_crosses": [
        {
          "dimension_id": "canal",
          "measure_id": "resolvido",
          "privacy_policy_version": "analytics-group-privacy-v1",
          "min_group_size": 10,
          "top_k": 20,
          "max_tracked_categories": 256,
          "groups_observed": 4,
          "groups_suppressed": 3,
          "suppression_applied": true,
          "high_cardinality_suppressed": false,
          "rows": [
            {
              "label": "whatsapp",
              "true_count": 33,
              "false_count": 12,
              "null_count": 0,
              "true_rate": 0.7333333333333333
            }
          ],
          "method_id": "category_flag_cross",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "270dd36ab5ca92627b6b76300ab4ffca6a9a3cfdba907a6cf5d23592f69724a5"
        }
      ],
      "numeric_crosses": [],
      "time_series": [
        {
          "dimension_id": "quando",
          "series_contract_version": "analytics-time-series-v1",
          "effective_granularity": "month",
          "timezone": "UTC",
          "coarsening_applied": true,
          "privacy_policy_version": "analytics-group-privacy-v1",
          "min_group_size": 10,
          "max_time_buckets": 400,
          "temporal_series_suppressed": false,
          "suppression_applied": true,
          "value_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "windows": [
            {
              "window_start": "2026-07-01T00:00:00+00:00",
              "count": 18,
              "status": "observed"
            },
            {
              "window_start": "2026-08-01T00:00:00+00:00",
              "count": 18,
              "status": "observed"
            },
            {
              "window_start": "2026-09-01T00:00:00+00:00",
              "count": 17,
              "status": "observed"
            },
            {
              "window_start": "2026-10-01T00:00:00+00:00",
              "count": 16,
              "status": "observed"
            },
            {
              "window_start": "2026-11-01T00:00:00+00:00",
              "count": 16,
              "status": "observed"
            },
            {
              "window_start": "2026-12-01T00:00:00+00:00",
              "count": 15,
              "status": "observed"
            }
          ],
          "method_id": "temporal_count",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "f953372c5099544c48c496df4e13208f2085edc4897220daf64975be646d8426"
        }
      ],
      "flag_series": [],
      "numeric_series": [],
      "concentrations": [
        {
          "measure_id": "declared_turns",
          "unit": "turns",
          "semantic_role": "sum",
          "privacy_policy_version": "analytics-group-privacy-v1",
          "min_group_size": 10,
          "max_tracked_values": 4096,
          "value_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "total_volume": 924.0,
          "bands": [
            {
              "lower_value": 3.0,
              "upper_value": 3.0,
              "entity_count": 68
            },
            {
              "lower_value": 12.0,
              "upper_value": 12.0,
              "entity_count": 20
            },
            {
              "lower_value": 40.0,
              "upper_value": 40.0,
              "entity_count": 12
            }
          ],
          "coarsening_applied": false,
          "suppression_applied": false,
          "high_cardinality_suppressed": false,
          "statistics": [
            {
              "statistic_id": "top_20_percent_volume_share",
              "state": "published",
              "calculation_precision": "exact",
              "value": 0.6233766233766234,
              "lower_bound": null,
              "upper_bound": null,
              "reason_code": null
            },
            {
              "statistic_id": "population_share_required_for_80_percent_volume",
              "state": "published",
              "calculation_precision": "exact",
              "value": 0.39,
              "lower_bound": null,
              "upper_bound": null,
              "reason_code": null
            }
          ],
          "method_id": "value_concentration",
          "method_version": 1,
          "method_parameters": {
            "top_cohort_fraction": "1/5",
            "volume_target_fraction": "4/5"
          },
          "method_definition_digest": "404604d43495dc647a259d99089ba1cf2b287fe47f208942ffed8593a2f443f3"
        }
      ],
      "unsupported_measure_ids": [],
      "unauthorized_measure_ids": []
    }
  }
} as const;

/** Um bloco removido pela avaliação conjunta. */
export const V2_PARTIAL = {
  "analysis_id": "an-massa-a",
  "result_schema_version": "analysis-result-v2",
  "measurement_contract_version": "measurement-1.0",
  "summary": {
    "engine_window_record_count": 100,
    "analyzed_at": "2026-07-31T10:00:00Z"
  },
  "indicators": [
    {
      "id": "useful_outcome_rate",
      "state": "measured",
      "value": 0.8,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 100.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "outcome_field_coverage_rate",
      "state": "measured",
      "value": 0.85,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 100.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "intent_coverage_rate",
      "state": "measured",
      "value": 0.85,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "intents",
        "value": 20.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "analyzed_conversation_count",
      "state": "measured",
      "value": 100.0,
      "kind": "count",
      "unit": "conversations",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 0
    },
    {
      "id": "useful_outcome_count",
      "state": "measured",
      "value": 80.0,
      "kind": "count",
      "unit": "conversations",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 0
    },
    {
      "id": "handoff_count",
      "state": "measured",
      "value": 0.0,
      "kind": "count",
      "unit": "conversations",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 0
    },
    {
      "id": "total_estimated_cost",
      "state": "measured",
      "value": 10.0,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "token_cost_total",
      "state": "measured",
      "value": 10.0,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "handoff_cost_total",
      "state": "measured",
      "value": 0.0,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "cost_per_useful_outcome",
      "state": "measured",
      "value": 0.125,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": {
        "kind": "useful_outcomes",
        "value": 80.0
      },
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "cost_per_session",
      "state": "measured",
      "value": 0.1,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 100.0
      },
      "coverage": null,
      "display_precision": 6
    }
  ],
  "dimensions": [],
  "recommendations": [],
  "evidence": [],
  "partiality": {
    "complete": true,
    "reasons": []
  },
  "analytics": {
    "component_status": "partial",
    "projection_digest": "4754a44cea573d52fc6af15425052367ccff42b6f701716b87c269b400c6ac6c",
    "snapshot_contract_version": "analytics-snapshot-v9",
    "record_count": 100,
    "data": {
      "snapshot_contract_version": "analytics-snapshot-v9",
      "input_artifact_id": "",
      "plan_contract_version": "",
      "plan_digest": "",
      "record_count": 100,
      "numeric": [
        {
          "measure_id": "custo",
          "unit": "BRL",
          "semantic_role": "sum",
          "valid_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "minimum": 0.05,
          "maximum": 0.13,
          "total": 8.959999999999999,
          "mean": 0.08959999999999999,
          "suppression_applied": false,
          "method_id": "numeric_summary",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "3374a4855b92e183e02d42d81ba85e7721ad576b6e9fefb0d3226ab3f442c8c8"
        },
        {
          "measure_id": "declared_turns",
          "unit": "turns",
          "semantic_role": "sum",
          "valid_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "minimum": 3.0,
          "maximum": 40.0,
          "total": 924.0,
          "mean": 9.24,
          "suppression_applied": false,
          "method_id": "numeric_summary",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "3374a4855b92e183e02d42d81ba85e7721ad576b6e9fefb0d3226ab3f442c8c8"
        }
      ],
      "distributions": [
        {
          "measure_id": "resolvido",
          "value_type": "boolean",
          "privacy_policy_version": "analytics-group-privacy-v1",
          "min_group_size": 10,
          "top_k": 20,
          "max_tracked_categories": 256,
          "value_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "distinct_observed": 2,
          "groups": [
            {
              "label": "false",
              "count": 62
            },
            {
              "label": "true",
              "count": 38
            }
          ],
          "other_count": null,
          "suppression_applied": false,
          "high_cardinality_suppressed": false,
          "method_id": "label_distribution",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "5252e0ccbb17250c2f5eee464c924fa9f5d5853b2b77232a5806bde407909944"
        }
      ],
      "dimensions": [
        {
          "measure_id": "canal",
          "value_type": "categorical_code",
          "privacy_policy_version": "analytics-group-privacy-v1",
          "min_group_size": 10,
          "top_k": 20,
          "max_tracked_categories": 256,
          "value_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "distinct_observed": 2,
          "groups": [
            {
              "label": "whatsapp",
              "count": 70
            },
            {
              "label": "phone",
              "count": 30
            }
          ],
          "other_count": null,
          "suppression_applied": false,
          "high_cardinality_suppressed": false,
          "method_id": "label_distribution",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "5252e0ccbb17250c2f5eee464c924fa9f5d5853b2b77232a5806bde407909944"
        }
      ],
      "flag_crosses": [],
      "numeric_crosses": [],
      "time_series": [
        {
          "dimension_id": "quando",
          "series_contract_version": "analytics-time-series-v1",
          "effective_granularity": "month",
          "timezone": "UTC",
          "coarsening_applied": true,
          "privacy_policy_version": "analytics-group-privacy-v1",
          "min_group_size": 10,
          "max_time_buckets": 400,
          "temporal_series_suppressed": false,
          "suppression_applied": true,
          "value_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "windows": [
            {
              "window_start": "2026-07-01T00:00:00+00:00",
              "count": 18,
              "status": "observed"
            },
            {
              "window_start": "2026-08-01T00:00:00+00:00",
              "count": 18,
              "status": "observed"
            },
            {
              "window_start": "2026-09-01T00:00:00+00:00",
              "count": 17,
              "status": "observed"
            },
            {
              "window_start": "2026-10-01T00:00:00+00:00",
              "count": 16,
              "status": "observed"
            },
            {
              "window_start": "2026-11-01T00:00:00+00:00",
              "count": 16,
              "status": "observed"
            },
            {
              "window_start": "2026-12-01T00:00:00+00:00",
              "count": 15,
              "status": "observed"
            }
          ],
          "method_id": "temporal_count",
          "method_version": 1,
          "method_parameters": {},
          "method_definition_digest": "f953372c5099544c48c496df4e13208f2085edc4897220daf64975be646d8426"
        }
      ],
      "flag_series": [],
      "numeric_series": [],
      "concentrations": [
        {
          "measure_id": "declared_turns",
          "unit": "turns",
          "semantic_role": "sum",
          "privacy_policy_version": "analytics-group-privacy-v1",
          "min_group_size": 10,
          "max_tracked_values": 4096,
          "value_count": 100,
          "null_count": 0,
          "invalid_count": 0,
          "absent_count": 0,
          "total_volume": 924.0,
          "bands": [
            {
              "lower_value": 3.0,
              "upper_value": 3.0,
              "entity_count": 68
            },
            {
              "lower_value": 12.0,
              "upper_value": 12.0,
              "entity_count": 20
            },
            {
              "lower_value": 40.0,
              "upper_value": 40.0,
              "entity_count": 12
            }
          ],
          "coarsening_applied": false,
          "suppression_applied": false,
          "high_cardinality_suppressed": false,
          "statistics": [
            {
              "statistic_id": "top_20_percent_volume_share",
              "state": "published",
              "calculation_precision": "exact",
              "value": 0.6233766233766234,
              "lower_bound": null,
              "upper_bound": null,
              "reason_code": null
            },
            {
              "statistic_id": "population_share_required_for_80_percent_volume",
              "state": "published",
              "calculation_precision": "exact",
              "value": 0.39,
              "lower_bound": null,
              "upper_bound": null,
              "reason_code": null
            }
          ],
          "method_id": "value_concentration",
          "method_version": 1,
          "method_parameters": {
            "top_cohort_fraction": "1/5",
            "volume_target_fraction": "4/5"
          },
          "method_definition_digest": "404604d43495dc647a259d99089ba1cf2b287fe47f208942ffed8593a2f443f3"
        }
      ],
      "unsupported_measure_ids": [],
      "unauthorized_measure_ids": []
    }
  }
} as const;

/** Nada liberável — `data` nulo, e é conclusão. */
export const V2_WITHHELD = {
  "analysis_id": "an-massa-a",
  "result_schema_version": "analysis-result-v2",
  "measurement_contract_version": "measurement-1.0",
  "summary": {
    "engine_window_record_count": 100,
    "analyzed_at": "2026-07-31T10:00:00Z"
  },
  "indicators": [
    {
      "id": "useful_outcome_rate",
      "state": "measured",
      "value": 0.8,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 100.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "outcome_field_coverage_rate",
      "state": "measured",
      "value": 0.85,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 100.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "intent_coverage_rate",
      "state": "measured",
      "value": 0.85,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "intents",
        "value": 20.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "analyzed_conversation_count",
      "state": "measured",
      "value": 100.0,
      "kind": "count",
      "unit": "conversations",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 0
    },
    {
      "id": "useful_outcome_count",
      "state": "measured",
      "value": 80.0,
      "kind": "count",
      "unit": "conversations",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 0
    },
    {
      "id": "handoff_count",
      "state": "measured",
      "value": 0.0,
      "kind": "count",
      "unit": "conversations",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 0
    },
    {
      "id": "total_estimated_cost",
      "state": "measured",
      "value": 10.0,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "token_cost_total",
      "state": "measured",
      "value": 10.0,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "handoff_cost_total",
      "state": "measured",
      "value": 0.0,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "cost_per_useful_outcome",
      "state": "measured",
      "value": 0.125,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": {
        "kind": "useful_outcomes",
        "value": 80.0
      },
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "cost_per_session",
      "state": "measured",
      "value": 0.1,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 100.0
      },
      "coverage": null,
      "display_precision": 6
    }
  ],
  "dimensions": [],
  "recommendations": [],
  "evidence": [],
  "partiality": {
    "complete": true,
    "reasons": []
  },
  "analytics": {
    "component_status": "withheld",
    "projection_digest": "d7456dc96a997042b54ec380f7ca808ca34bf0c4cdf31cb083d853a40d027395",
    "snapshot_contract_version": "analytics-snapshot-v9",
    "record_count": null,
    "data": null
  }
} as const;


/**
 * O envelope do contrato público em volta de um documento.
 *
 * `result_schema_version` é o DISCRIMINADOR, e ele viaja no envelope — não dentro do `result`.
 * Deixá-lo parametrizável é o que permite provar a recusa por versão sem forjar o documento.
 */
export function envelopeV2(
  documento: unknown,
  versao = "analysis-result-v2",
): AnalysisResultView {
  return {
    analysis_id: "an-massa-a",
    result_schema_version: versao,
    indicator_registry_version: "indicators-1.0",
    result: documento,
  } as AnalysisResultView;
}
