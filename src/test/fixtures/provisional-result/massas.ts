// ⚠️ PROVISÓRIO — fixtures de DESENVOLVIMENTO/TESTE da Onda 6. NÃO são o contrato público
// definitivo do resultado (ver docs/onda6/E5-massa-sintetica-proveniencia.md e a dívida
// "Padronização Canônica do Resultado Analítico", pós-Onda 8).
//
// PROVENIÊNCIA: os valores abaixo foram PRODUZIDOS pelo código analítico REAL do repo `sentinela`
// (@ e7d0703), executado localmente em modo read-only sobre massas sintéticas de números simples:
//   engine/business/cost_estimators.py::estimate_useful_outcome_economics
//   engine/business/unit_economics.py::compute_tenant_metrics
// Nenhuma fórmula foi reimplementada aqui — só transcrição da saída real + conferência manual.

import type { AnalysisResultView } from "@/lib/v1";

/** Massa A — 100 registros, 80 úteis, custo 10.00. Conferência: 80/100=0.8; 10/80=0.125; 17/20=0.85. */
export const MASSA_A = {
  schema: "provisional-analysis-result-v1",
  summary: { total_records: 100, useful_outcomes: 80, analyzed_at: "2026-07-31T10:00:00Z" },
  indicators: [
    { id: "useful_rate", kind: "ratio", availability: "available", value: 0.8 },
    { id: "intent_coverage_rate", kind: "ratio", availability: "available", value: 0.85 },
    { id: "token_waste_absolute", kind: "count", availability: "available", value: 20 },
    { id: "total_cost", kind: "currency", availability: "available", value: 10, currency: null },
    { id: "cost_per_useful_outcome", kind: "currency", availability: "available", value: 0.125, currency: null },
    { id: "cost_per_session", kind: "currency", availability: "available", value: 0.1, currency: null },
    { id: "avg_variance_per_intent", kind: "scalar", availability: "available", value: 0.2 },
  ],
  recommendations: [
    { id: "rec-1", title: "Revisar intenções sem cobertura", detail: "3 de 20 intenções sem cobertura." },
    { id: "rec-2", title: "Investigar respostas não úteis", detail: null },
  ],
} as const;

/** Massa B — 0 úteis: CPUO indisponível (ausência honesta) × cobertura ZERO REAL. */
export const MASSA_B = {
  schema: "provisional-analysis-result-v1",
  summary: { total_records: 10, useful_outcomes: 0, analyzed_at: "2026-07-30T08:00:00Z" },
  indicators: [
    { id: "useful_rate", kind: "ratio", availability: "available", value: 0 }, // zero REAL
    { id: "intent_coverage_rate", kind: "ratio", availability: "available", value: 0 }, // zero REAL
    { id: "total_cost", kind: "currency", availability: "available", value: 0.01, currency: null },
    // sem úteis ⇒ sem denominador: NÃO é zero, é não aplicável
    { id: "cost_per_useful_outcome", kind: "currency", availability: "not_applicable", value: null, currency: null },
    { id: "avg_variance_per_intent", kind: "scalar", availability: "not_measured", value: null },
  ],
  // sem chave `recommendations` ⇒ seção NÃO existe (não inventar)
} as const;

/** Massa C — sub-centavo: 0.0042 não pode virar 0.00; moeda declarada para exercitar símbolo. */
export const MASSA_C = {
  schema: "provisional-analysis-result-v1",
  summary: { total_records: 3, useful_outcomes: 3, analyzed_at: "2026-07-29T12:00:00Z" },
  indicators: [
    { id: "total_cost", kind: "currency", availability: "available", value: 0.0042, currency: "USD" },
    { id: "cost_per_useful_outcome", kind: "currency", availability: "available", value: 0.0014, currency: "USD" },
    { id: "intent_coverage_rate", kind: "ratio", availability: "available", value: 0.25 },
    { id: "useful_rate", kind: "ratio", availability: "available", value: 1 },
  ],
} as const;

/** Massa D — parcial: indicador SEM descriptor (id desconhecido) coexiste com um suportado. */
export const MASSA_D_PARCIAL = {
  schema: "provisional-analysis-result-v1",
  summary: { total_records: 5, useful_outcomes: null, analyzed_at: null },
  indicators: [
    { id: "useful_rate", kind: "ratio", availability: "available", value: 0.5 },
    { id: "indicador_que_nao_existe", kind: "ratio", availability: "available", value: 0.9 },
  ],
} as const;

/** Massa E — valor de fronteira fora da faixa declarada para razão (1.4 > 1). */
export const MASSA_E_FORA_DE_FAIXA = {
  schema: "provisional-analysis-result-v1",
  summary: { total_records: 4, useful_outcomes: 4, analyzed_at: null },
  indicators: [{ id: "useful_rate", kind: "ratio", availability: "available", value: 1.4 }],
} as const;

/** Payload com schema desconhecido — deve cair em "resultado não suportado". */
export const PAYLOAD_SCHEMA_DESCONHECIDO = { schema: "outro-schema-v9", indicators: [] } as const;

export function resultViewCom(payload: unknown, analysisId = "an-abc"): AnalysisResultView {
  return { analysis_id: analysisId, result_schema_version: "analysis-result-v1", result: payload };
}
