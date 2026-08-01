// Massas do resultado canônico — PRODUZIDAS pelo caminho real, não escritas à mão.
//
// PROVENIÊNCIA: cada documento abaixo é a saída literal de
//   engine/business/cost_estimators.py::estimate_useful_outcome_economics
//   engine/business/unit_economics.py::compute_tenant_metrics
//   engine/facts/from_engine_result.py::facts_do_resultado_do_engine   (repo `sentinela` @ 6ac9dcf05605b95ac4f725c26b108972427149ff)
//   → sentinela-result-assembler::assemble → `analysis-result-v1`
//
// Nenhuma fórmula foi reimplementada e nenhum número foi digitado: rodou-se o código analítico
// real e transcreveu-se o resultado. Massa escrita à mão testaria a minha suposição do formato.
//
// Regenerar: scripts/gerar_massas_canonicas (ver docs). As massas E e F são a exceção declarada
// abaixo — elas NÃO vêm do backend real, e o comentário diz por quê.

import type { AnalysisResultView } from "@/lib/v1";

/** Massa A — 100 registros, 80 úteis, 85 com outcome, custo 0,10/registro. */
export const MASSA_A = {
  "analysis_id": "an-massa-a",
  "result_schema_version": "analysis-result-v1",
  "measurement_contract_version": "measurement-1.0",
  "summary": {
    "record_count": 100,
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
      "id": "conversion_rate",
      "state": "measured",
      "value": 0.0,
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
      "id": "conversion_count",
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
    },
    {
      "id": "mean_response_variance_per_intent",
      "state": "measured",
      "value": 0.0,
      "kind": "scalar",
      "unit": null,
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 4
    }
  ],
  "dimensions": [],
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Revisar intencoes sem cobertura",
      "priority": "P1",
      "category": null,
      "evidence_refs": []
    },
    {
      "id": "rec-2",
      "title": "Investigar respostas nao uteis",
      "priority": "P2",
      "category": null,
      "evidence_refs": []
    }
  ],
  "evidence": [],
  "partiality": {
    "complete": true,
    "reasons": []
  }
} as const;

/** Massa B — ZERO úteis: custo por desfecho útil fica sem denominador (ausência honesta),
 *  enquanto `useful_outcome_rate` é ZERO REAL. A diferença entre os dois é o ponto. */
export const MASSA_B = {
  "analysis_id": "an-massa-b",
  "result_schema_version": "analysis-result-v1",
  "measurement_contract_version": "measurement-1.0",
  "summary": {
    "record_count": 10,
    "analyzed_at": "2026-07-30T08:00:00Z"
  },
  "indicators": [
    {
      "id": "useful_outcome_rate",
      "state": "measured",
      "value": 0.0,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 10.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "outcome_field_coverage_rate",
      "state": "measured",
      "value": 1.0,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 10.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "conversion_rate",
      "state": "measured",
      "value": 0.0,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 10.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "intent_coverage_rate",
      "state": "measured",
      "value": 0.0,
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
      "value": 10.0,
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
      "value": 0.0,
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
      "id": "conversion_count",
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
      "value": 0.01,
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
      "value": 0.01,
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
      "state": "not_measured",
      "value": null,
      "kind": "currency",
      "unit": "currency",
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "cost_per_session",
      "state": "measured",
      "value": 0.001,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 10.0
      },
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "mean_response_variance_per_intent",
      "state": "measured",
      "value": 0.0,
      "kind": "scalar",
      "unit": null,
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 4
    }
  ],
  "dimensions": [],
  "recommendations": [],
  "evidence": [],
  "partiality": {
    "complete": false,
    "reasons": [
      "indicator_not_measured"
    ]
  }
} as const;

/** Massa C — 1 registro, custo sub-centavo: o valor não pode colapsar em 0 na exibição. */
export const MASSA_C = {
  "analysis_id": "an-massa-c",
  "result_schema_version": "analysis-result-v1",
  "measurement_contract_version": "measurement-1.0",
  "summary": {
    "record_count": 1,
    "analyzed_at": "2026-07-29T12:00:00Z"
  },
  "indicators": [
    {
      "id": "useful_outcome_rate",
      "state": "measured",
      "value": 1.0,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 1.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "outcome_field_coverage_rate",
      "state": "measured",
      "value": 1.0,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 1.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "conversion_rate",
      "state": "measured",
      "value": 0.0,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 1.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "intent_coverage_rate",
      "state": "measured",
      "value": 1.0,
      "kind": "ratio",
      "unit": "ratio",
      "currency": null,
      "denominator": {
        "kind": "intents",
        "value": 1.0
      },
      "coverage": null,
      "display_precision": 4
    },
    {
      "id": "analyzed_conversation_count",
      "state": "measured",
      "value": 1.0,
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
      "value": 1.0,
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
      "id": "conversion_count",
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
      "value": 4e-06,
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
      "value": 4e-06,
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
      "value": 4e-06,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": {
        "kind": "useful_outcomes",
        "value": 1.0
      },
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "cost_per_session",
      "state": "measured",
      "value": 4e-06,
      "kind": "currency",
      "unit": "currency",
      "currency": "USD",
      "denominator": {
        "kind": "analyzed_conversations",
        "value": 1.0
      },
      "coverage": null,
      "display_precision": 6
    },
    {
      "id": "mean_response_variance_per_intent",
      "state": "measured",
      "value": 0.0,
      "kind": "scalar",
      "unit": null,
      "currency": null,
      "denominator": null,
      "coverage": null,
      "display_precision": 4
    }
  ],
  "dimensions": [],
  "recommendations": [],
  "evidence": [],
  "partiality": {
    "complete": true,
    "reasons": []
  }
} as const;

/** Massa D — parcialidade DECLARADA pela origem (não inferida pelo frontend).
 *  Derivada da A: o documento é o mesmo, com `partiality` dizendo que não está completo. */
export const MASSA_D_PARCIAL = {
  ...MASSA_A,
  partiality: { complete: false, reasons: ["indicator_unavailable"] },
} as const;

// ── massas que NÃO vêm do backend real ────────────────────────────────────
// As duas abaixo são construídas à mão DE PROPÓSITO: o Assembler recusaria as duas na
// origem (razão fora de [0,1] viola a faixa declarada; schema desconhecido nem chega a
// montar). Elas existem para provar a DEFESA do frontend — o que ele faz quando recebe
// algo que o backend não deveria ter mandado. Rotulá-las como saída real seria mentira.

/** Razão fora da faixa: sinalizada, NUNCA limitada em silêncio. */
export const MASSA_E_FORA_DE_FAIXA = {
  ...MASSA_A,
  indicators: [
    {
      ...MASSA_A.indicators.find((i) => i.id === "useful_outcome_rate")!,
      value: 1.4,
    },
  ],
} as const;

/** Documento de uma versão que este frontend não conhece. */
export const PAYLOAD_SCHEMA_DESCONHECIDO = {
  result_schema_version: "outro-schema-v9",
  indicators: [],
} as const;

/** Envelope do contrato público em torno de um documento. */
export function envelope(
  documento: unknown,
  versao = "analysis-result-v1",
): AnalysisResultView {
  return {
    analysis_id:
      typeof documento === "object" && documento !== null && "analysis_id" in documento
        ? String((documento as { analysis_id: unknown }).analysis_id)
        : "an-1",
    result_schema_version: versao,
    indicator_registry_version: "indicator-registry-1.0",
    result: documento,
  };
}
