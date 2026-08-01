// Descriptors dos indicadores. Registro de APRESENTAÇÃO: id público → rótulo/descrição i18n e a
// documentação da origem. NENHUMA fórmula vive aqui (nem em componente): o valor, a unidade, a
// moeda, o denominador e a PRECISÃO vêm do documento canônico; o descriptor só diz como chamar o
// indicador e de onde o número veio.
//
// Os ids são os PÚBLICOS do registro canônico (`indicator-registry-1.0`), não os ids internos dos
// fatos. `useful_rate` é o nome interno; `useful_outcome_rate` é o que o contrato publica — e é
// sobre o público que a UI se apoia.
//
// `sourceField` é rastreabilidade backend-first: qual campo do código analítico real sustenta o
// indicador. É o "porquê" do número, e a UI o expõe.
//
// O que SAIU nesta migração: `token_waste_absolute` ("Wasted records"). Ele não existe no registro
// canônico — e a investigação da Parte 1 mostrou por quê: não havia produtor. O que a E5 mostrava
// vinha de um proxy (`int(round(avg_tokens))`), anotado como tal no próprio código analítico.
// Rótulo sem produtor é número inventado com cara de medição.
//
// A `precision` também saiu do descriptor: ela agora vem em `display_precision`, decidida pela
// origem. Manter uma cópia aqui criaria duas fontes para a mesma decisão.

export interface IndicatorDescriptor {
  /** Id PÚBLICO do registro canônico. */
  id: string;
  /** Chave i18n do rótulo (namespace canonicalAnalysis.result.indicator). */
  labelKey: string;
  /** Chave i18n da descrição curta (o "porquê" clicável/legível). */
  descriptionKey: string;
  /** Campo do código analítico real que sustenta o valor (rastreabilidade). */
  sourceField: string;
}

const NS = "canonicalAnalysis.result.indicator";

function d(id: string, sourceField: string): IndicatorDescriptor {
  return {
    id,
    labelKey: `${NS}.${id}.label`,
    descriptionKey: `${NS}.${id}.description`,
    sourceField,
  };
}

// Sem o prefixo do pacote de execucao: o invariante publico e que o cliente NUNCA ve esse
// vocabulario. O que da rastreabilidade e o modulo analitico + a funcao, e eles bastam.
const ECO = "cost_estimators.estimate_useful_outcome_economics";
const TEN = "unit_economics.compute_tenant_metrics";

/**
 * Indicadores SUPORTADOS pela UI, na ordem canônica do registro.
 *
 * Um id fora desta lista não é renderizado (cadeado: sem descriptor, sem UI). O cadeado protege
 * dos dois lados — indicador novo no backend não aparece com rótulo adivinhado, e indicador
 * removido do backend não deixa rótulo órfão.
 */
export const INDICATOR_DESCRIPTORS: Record<string, IndicatorDescriptor> = {
  // ── razões (única categoria autorizada a virar percentual) ────────────────
  useful_outcome_rate: d("useful_outcome_rate", `${ECO} → useful_rate`),
  outcome_field_coverage_rate: d("outcome_field_coverage_rate", `${ECO} → outcome_coverage`),
  conversion_rate: d("conversion_rate", `${ECO} → conversion_rate`),
  intent_coverage_rate: d("intent_coverage_rate", `${TEN} → intent_coverage_rate`),

  // ── contagens (NUNCA percentual) ──────────────────────────────────────────
  analyzed_conversation_count: d("analyzed_conversation_count", `${ECO} → observed_conversations`),
  useful_outcome_count: d("useful_outcome_count", `${ECO} → useful_outcomes`),
  handoff_count: d("handoff_count", `${ECO} → actual_handoffs`),
  conversion_count: d("conversion_count", `${ECO} → conversion_count`),

  // ── moeda ─────────────────────────────────────────────────────────────────
  total_estimated_cost: d("total_estimated_cost", `${ECO} → total_estimated_cost`),
  token_cost_total: d("token_cost_total", `${ECO} → observed_token_cost_total`),
  handoff_cost_total: d("handoff_cost_total", `${ECO} → observed_handoff_cost_total`),
  cost_per_useful_outcome: d(
    "cost_per_useful_outcome",
    `${ECO} → cost_per_useful_outcome (ausente quando nao ha desfecho util)`,
  ),
  cost_per_session: d("cost_per_session", `${TEN} → cost_per_session`),

  // ── escalar ───────────────────────────────────────────────────────────────
  // NÃO é "consistência", NÃO é "drift", NÃO é "confiança" — é variância média.
  mean_response_variance_per_intent: d(
    "mean_response_variance_per_intent",
    `${TEN} → avg_variance_per_intent`,
  ),
};

export function descriptorDe(id: string): IndicatorDescriptor | null {
  return INDICATOR_DESCRIPTORS[id] ?? null;
}
