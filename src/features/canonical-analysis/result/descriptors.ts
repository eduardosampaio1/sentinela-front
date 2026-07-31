// Descriptors dos indicadores (Onda 6 E5). Registro CENTRAL: id → rótulo/descrição i18n, precisão
// e a documentação da origem. NENHUMA fórmula vive aqui (nem em componente): o valor e a unidade
// vêm do payload; o descriptor só diz COMO apresentar e DE ONDE o número veio.
//
// `sourceField` é documentação de rastreabilidade (backend-first): qual campo do código analítico
// real sustenta o indicador. Ver docs/onda6/E5-massa-sintetica-proveniencia.md.

export interface IndicatorDescriptor {
  id: string;
  /** Chave i18n do rótulo (namespace canonicalAnalysis.result.indicator). */
  labelKey: string;
  /** Chave i18n da descrição curta (o "porquê" clicável/legível). */
  descriptionKey: string;
  /** Campo do código analítico real que sustenta o valor (rastreabilidade). */
  sourceField: string;
  /** Casas decimais na apresentação. `undefined` = decidir pelo valor (sub-centavo preservado). */
  precision?: number;
}

const NS = "canonicalAnalysis.result.indicator";

/** Indicadores SUPORTADOS. Um id fora desta lista não é renderizado (cadeado: sem descriptor, sem UI). */
export const INDICATOR_DESCRIPTORS: Record<string, IndicatorDescriptor> = {
  useful_rate: {
    id: "useful_rate",
    labelKey: `${NS}.useful_rate.label`,
    descriptionKey: `${NS}.useful_rate.description`,
    sourceField: "economics_snapshot.useful_rate (cost_estimators.py)",
    precision: 1,
  },
  intent_coverage_rate: {
    id: "intent_coverage_rate",
    labelKey: `${NS}.intent_coverage_rate.label`,
    descriptionKey: `${NS}.intent_coverage_rate.description`,
    sourceField: "tenant_metrics.intent_coverage_rate (unit_economics.py)",
    precision: 1,
  },
  token_waste_absolute: {
    id: "token_waste_absolute",
    labelKey: `${NS}.token_waste_absolute.label`,
    descriptionKey: `${NS}.token_waste_absolute.description`,
    sourceField: "token_waste_estimate (contagem ABSOLUTA — nunca percentual)",
  },
  total_cost: {
    id: "total_cost",
    labelKey: `${NS}.total_cost.label`,
    descriptionKey: `${NS}.total_cost.description`,
    sourceField: "economics_snapshot.total_estimated_cost (cost_estimators.py)",
  },
  cost_per_useful_outcome: {
    id: "cost_per_useful_outcome",
    labelKey: `${NS}.cost_per_useful_outcome.label`,
    descriptionKey: `${NS}.cost_per_useful_outcome.description`,
    sourceField: "economics_snapshot.cost_per_useful_outcome (None quando não há úteis)",
  },
  cost_per_session: {
    id: "cost_per_session",
    labelKey: `${NS}.cost_per_session.label`,
    descriptionKey: `${NS}.cost_per_session.description`,
    sourceField: "tenant_metrics.cost_per_session (unit_economics.py)",
  },
  avg_variance_per_intent: {
    id: "avg_variance_per_intent",
    labelKey: `${NS}.avg_variance_per_intent.label`,
    descriptionKey: `${NS}.avg_variance_per_intent.description`,
    // NÃO é "consistência", NÃO é "drift", NÃO é "confiança" — é variância média.
    sourceField: "tenant_metrics.avg_variance_per_intent (unit_economics.py)",
    precision: 2,
  },
};

export function descriptorDe(id: string): IndicatorDescriptor | null {
  return INDICATOR_DESCRIPTORS[id] ?? null;
}
