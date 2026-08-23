// A PROJECAO ANALITICA de referencia, e a vista que a envolve.
//
// ## Por que fixture e nao constante dentro de um spec
//
// Ela morou em `e2e/shots.spec.ts`, e o `v4-diagnostico.spec.ts` a importou de la. Importar de
// um arquivo de spec REGISTRA os testes dele: rodar o segundo passou a executar 22 casos em vez
// de 4, com os 18 do primeiro vindo de carona. Verde, e errado — a suite dobra de custo, e um
// `-g` deixa de recortar o que promete recortar.
//
// Duas capturas que dizem mostrar a mesma tela precisam da MESMA massa; o lugar de uma massa
// compartilhada e uma fixture.

/** A projecao analitica de referencia.
    EXPORTADA porque o `v4-diagnostico.spec.ts` precisa da mesma para capturar Medidas. Copiar
    o literal para la criaria duas massas livres para divergir — e duas capturas que dizem
    mostrar a mesma tela sobre dados diferentes nao comparam nada. */
export const SNAP = {
  snapshot_contract_version: "analytics-snapshot-v9",
  record_count: 100,
  numeric: [{ measure_id: "conversation_cost", unit: "USD", semantic_role: "sum", valid_count: 90, null_count: 10, invalid_count: 0, absent_count: 0, minimum: 0.1, maximum: 9.9, total: 100, mean: 1.1, suppression_applied: true, method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d" }],
  distributions: [{ measure_id: "canal", value_type: "string", min_group_size: 5, value_count: 100, null_count: 0, invalid_count: 0, absent_count: 0, distinct_observed: 3, groups: [{ label: "web", count: 60 }, { label: "app", count: 30 }], other_count: null, suppression_applied: false, high_cardinality_suppressed: false, method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d", privacy_policy_version: "p1", top_k: 10, max_tracked_categories: 50 }],
  dimensions: [{ measure_id: "regiao", value_type: "string", min_group_size: 5, value_count: 100, null_count: 0, invalid_count: 0, absent_count: 0, distinct_observed: 2, groups: [{ label: "sudeste", count: 70 }], other_count: 12, suppression_applied: false, high_cardinality_suppressed: false, method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d", privacy_policy_version: "p1", top_k: 10, max_tracked_categories: 50 }],
  concentrations: [{ measure_id: "custo", unit: "USD", semantic_role: "sum", value_count: 100, null_count: 0, invalid_count: 0, absent_count: 0, total_volume: 100, bands: [], coarsening_applied: false, suppression_applied: false, high_cardinality_suppressed: false, statistics: [{ statistic_id: "top_10_share", state: "published", calculation_precision: "exact", value: 0.42, lower_bound: null, upper_bound: null, reason_code: null }, { statistic_id: "gini", state: "not_published", calculation_precision: null, value: null, lower_bound: null, upper_bound: null, reason_code: "below_min_group" }], method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d", privacy_policy_version: "p1", min_group_size: 5, max_tracked_values: 100 }],
  time_series: [{ dimension_id: "dia", effective_granularity: "day", timezone: "UTC", coarsening_applied: false, value_count: 3, null_count: 0, invalid_count: 0, windows: [{ window_start: "2026-08-01", count: 7, status: "published" }, { window_start: "2026-08-02", count: null, status: "suppressed" }, { window_start: "2026-08-03", count: 12, status: "published" }], temporal_series_suppressed: false, suppression_applied: false, method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d", privacy_policy_version: "p1", min_group_size: 5, max_time_buckets: 100, series_contract_version: "s1" }],
};

export function vistaAnalytics(id: string, status = "ready") {
  return { analysis_id: id, component_status: status, snapshot_contract_version: "analytics-snapshot-v9", snapshot_digest: "sd", snapshot: status === "withheld" ? null : SNAP, disclosure_rule_version: "dr-1", projection_digest: "pd", withheld: null, generated_at: "2026-08-01T00:00:00Z" };
}
