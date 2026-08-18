// CÓPIA do contrato público `analysis-result-v3`. **Não editar à mão.**
//
// ORIGEM (autoridade): `sentinela-facts/docs/contracts/public-v3.types.ts`, que por sua vez é
// gerado de `analysis-result-v3.schema.json` no `sentinela-result-assembler` — o repo DONO do
// documento. Três degraus, uma direção só: schema → tipos publicados → esta cópia.
//
// Por que copiar: os repos são separados e não há build cruzado. Por que é perigoso: a origem
// muda, a cópia fica, o `tsc` segue verde, e o defeito só aparece quando a tela lê um campo que
// deixou de existir. `test/v1/contract-sync.test.ts` compara as duas.
//
// Esta cópia entrou na Two-View Recovery (F0). Antes dela o frontend conhecia v1 e v2, o
// produtor já servia v3 por negociação, e o gate do consumidor ficava verde — porque o
// manifesto do produtor também não declarava o v3. Duas suítes verdes e nenhuma via o terceiro
// documento.

// <<< GERADO DE analysis-result-v3.schema.json — NÃO EDITAR À MÃO >>>
//
// `analysis-result-v3` — o contrato público do ARGOS, e só dele.
//
// Origem: sentinela-result-assembler (dono do contrato). Não existe cópia do schema aqui:
// duas cópias divergem, e a segunda sempre parece autoritativa para quem a encontra
// primeiro.
//
// Regenerar: python scripts/gerar_tipos_do_v3.py
//
// ## O que muda para quem consome
//
// O v1 publicava `indicators[]` e um `state` de cinco valores. O v3 publica sete famílias
// — um escore global, uma dimensão de saúde, uma métrica por intenção, um risco e uma
// projeção não têm a mesma forma — e acrescenta a cada medição o `reason` tipado, que o v1
// retinha. "Não medido" sem motivo não diz ao consumidor o que fazer; `dependency_unavailable`
// diz.
//
// `scale` é contrato: `response_stability` sai 0..100 e é publicado assim. Não normalize no
// cliente — a escala declarada é a que o produtor mediu.
//
// Campo AUSENTE e lista VAZIA são diferentes: ausente = a capacidade não existe neste
// documento; `[]` = ela existe, rodou e não produziu item.

/** Estado da medição — NUNCA derivado do valor. */
export type Availability = "available" | "partial" | "unavailable" | "not_evaluable" | "failed";

/** Procedência SEMÂNTICA. Fechada. */
export type Domain = "semantic" | "behavioral" | "structural" | "economic";

/** O que o consumidor precisa saber ANTES de olhar o valor. */
export type IndicatorState = "measured" | "partially_measured" | "not_measured" | "not_applicable" | "calculation_failed";

/** Parâmetros do método, e a moeda da análise. */
export interface MethodMetadata {
  currency?: string | null;
  currency_source?: string | null;
  min_samples_per_intent?: number | null;
}

/** Declara explicitamente se o resultado é completo — em vez de deixar o consumidor */
export interface Partiality {
  complete: boolean;
  reasons: string[];
}

/** Um alerta do ARGOS. A CONTAGEM é métrica (`critical_alert_count`); isto é o conteúdo. */
export interface PublicAlert {
  affected_intents?: string[];
  code: string;
  detail?: string | null;
  evidence_refs?: string[];
  id: string;
  severity: string;
  title: string;
}

/** Sobre o que a razão foi calculada — publicado para permitir auditoria. */
export interface PublicDenominator {
  kind: string;
  value: number;
}

/** Resumo agregado de evidência — só campos da allowlist. */
export interface PublicEvidenceSummary {
  id: string;
  kind: string;
  label: string | null;
  observed_count: number;
}

/** O resumo executivo, textual. */
export interface PublicExecutiveSummary {
  generated_by?: string;
  language: string;
  text: string;
}

/** Indicador de negócio escalar. A forma do v1, mais o que faltava. */
export interface PublicIndicatorV3 {
  coverage?: number | null;
  currency?: string | null;
  denominator?: PublicDenominator | null;
  display_precision?: number;
  domain?: Domain | null;
  id: string;
  kind: string;
  reason: Reason;
  scale: Scale;
  state: IndicatorState;
  unit?: string | null;
  value: number | null;
}

/** Uma intenção, com seu escore e o suporte amostral que o sustenta. */
export interface PublicIntent {
  intent_id: string;
  response_stability?: PublicMeasurement | null;
  response_variance?: PublicMeasurement | null;
  score: PublicMeasurement;
  semantic_drift?: PublicMeasurement | null;
  severity?: string | null;
  severity_reason?: string[] | null;
  support: number;
  underrepresented?: boolean;
}

export interface PublicIssue {
  code: string;
  evidence_refs?: string[];
  id: string;
  severity: string;
  title: string;
}

/** Uma medição pública: valor separado de disponibilidade, com motivo. */
export interface PublicMeasurement {
  availability: Availability;
  confidence?: number | null;
  data_coverage?: number | null;
  domain?: Domain | null;
  id: string;
  method_version?: string | null;
  reason: Reason;
  scale: Scale;
  thresholds?: PublicThresholds | null;
  unit?: string | null;
  value: number | null;
}

/** Uma projeção monetária, com o horizonte como DADO. */
export interface PublicProjection {
  basis?: string | null;
  currency?: string | null;
  horizon: string;
  id: string;
  measurement: PublicMeasurement;
}

/** Recomendação transportada na ordem e prioridade do domínio. */
export interface PublicRecommendation {
  category: string | null;
  evidence_refs: string[];
  id: string;
  priority: string;
  title: string;
}

/** Um risco declarado pelo produtor. */
export interface PublicRisk {
  band?: string | null;
  id: string;
  measurement: PublicMeasurement;
}

/** Escore global. Adimensional ou normalizado, nunca por unidade de negócio. */
export interface PublicScore {
  composite_of?: string[];
  measurement: PublicMeasurement;
  window_kind?: string | null;
  window_size?: number | null;
}

/** Cabeçalho legível da análise. */
export interface PublicSummary {
  analyzed_at: string;
  record_count: number;
}

/** Os dois cortes que dividem a régua em três zonas: ok, atenção, crítico. */
export interface PublicThresholds {
  critical: number;
  warn: number;
}

/** Motivo tipado, para máquina. Espelha `MeasurementReason` do domínio. */
export type Reason = "ok" | "no_input_data" | "insufficient_sample" | "single_group" | "missing_dimension" | "dependency_unavailable" | "not_applicable" | "computation_error";

/** A escala declarada de uma medição. */
export interface Scale {
  kind: ScaleKind;
  maximum?: number | null;
  minimum?: number | null;
}

/** A faixa em que o número vive. Declarada, nunca inferida. */
export type ScaleKind = "ratio_unit" | "score_100" | "percent" | "currency" | "count" | "duration" | "raw";

/** `analysis-result-v3`. */
export interface AnalysisResultV3Document {
  alerts?: PublicAlert[] | null;
  analysis_id: string;
  argos_catalog_version: string;
  dimensions?: PublicMeasurement[] | null;
  evidence?: PublicEvidenceSummary[] | null;
  executive_summary?: PublicExecutiveSummary | null;
  indicator_registry_version: string;
  indicators?: PublicIndicatorV3[] | null;
  intents?: PublicIntent[] | null;
  issues?: PublicIssue[] | null;
  measurement_contract_version: string;
  method: MethodMetadata;
  partiality: Partiality;
  projections?: PublicProjection[] | null;
  recommendations?: PublicRecommendation[] | null;
  result_schema_version?: string;
  risks?: PublicRisk[] | null;
  scores?: PublicScore[] | null;
  summary: PublicSummary;
}

// <<< FIM DO BLOCO GERADO >>>
