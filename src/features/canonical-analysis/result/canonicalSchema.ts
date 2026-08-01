// Contrato CANÔNICO do conteúdo de `result`: `analysis-result-v1`.
//
// Substitui o perfil provisório da E5. Aquele era honesto enquanto não havia contrato — o
// próprio arquivo dizia "PROVISÓRIO, não é o contrato definitivo". Agora existe: o
// `sentinela-result-assembler` é dono de `analysis-result-v1`, o Orchestrator monta o
// documento e o contrato público o declara pelo `result_schema_version`.
//
// Regra de isolamento (mantida da E5): SOMENTE `validator.ts` e `adapter.ts` conhecem este
// shape. Nenhum componente lê o payload bruto.
//
// Backend First (mantido e REFORÇADO): o documento traz valor, unidade, moeda, denominador,
// precisão de exibição e — a novidade — o ESTADO de disponibilidade e a PARCIALIDADE, os dois
// decididos na origem. O frontend não infere nenhum dos dois.

/** Versão do contrato suportada por este frontend. */
export const CANONICAL_RESULT_SCHEMA = "analysis-result-v1" as const;

/** Natureza do valor — decide a formatação PERMITIDA, e nada além dela. */
export type IndicatorKind =
  | "ratio" // 0..1 declarado pela origem → única autorização para virar percentual
  | "count" // contagem absoluta → número puro, NUNCA percentual
  | "currency" // valor monetário → moeda só se `currency` vier
  | "scalar"; // número sem unidade semântica (ex.: variância)

/**
 * O que saber ANTES de olhar o valor. Cinco estados, espelhados do domínio.
 *
 * O perfil provisório tinha três. Os dois que faltavam são justamente os que evitam
 * apresentar meia-verdade como verdade inteira:
 *   - `partially_measured`: mediu parte da amostra — número real, cobertura incompleta;
 *   - `calculation_failed`: o cálculo FALHOU. Distinto de "não foi medido", porque falha é
 *     um problema a investigar, e ausência planejada não é.
 */
export type IndicatorState =
  | "measured" // valor medido (inclui ZERO REAL)
  | "partially_measured" // medido sobre parte da amostra — ver `coverage`
  | "not_measured" // não foi medido nesta análise
  | "not_applicable" // não se aplica (ex.: sem denominador)
  | "calculation_failed"; // o cálculo falhou

/** Sobre o que a razão foi calculada — publicado para permitir auditoria. */
export interface CanonicalDenominator {
  kind: string;
  value: number;
}

export interface CanonicalIndicator {
  /** Id PÚBLICO do registro canônico de indicadores (não o id interno dos fatos). */
  id: string;
  kind: IndicatorKind;
  state: IndicatorState;
  /** `null` quando não medido. NUNCA usar 0 para representar ausência. */
  value: number | null;
  unit: string | null;
  /** ISO da moeda quando a origem declarou. Sem isso, não se assume BRL/USD. */
  currency: string | null;
  denominator: CanonicalDenominator | null;
  /** Fração da amostra coberta (0..1) quando a origem declarou. */
  coverage: number | null;
  /** Casas decimais decididas PELA ORIGEM. O frontend não escolhe precisão. */
  display_precision: number;
}

export interface CanonicalSummary {
  /** Registros analisados (contagem da origem). */
  record_count: number;
  /** Timestamp PRODUZIDO PELO BACKEND. Nunca `new Date()` no cliente. */
  analyzed_at: string;
}

/**
 * Completude DECLARADA pela origem.
 *
 * Diferença que importa em relação à E5: lá o frontend INFERIA parcialidade contando
 * indicadores que sobreviveram à filtragem. Isso media a cobertura do próprio frontend, não a
 * da análise — e as duas coisas divergem exatamente quando o usuário precisa saber.
 */
export interface Partiality {
  complete: boolean;
  reasons: string[];
}

/** Recomendação JÁ priorizada pela origem — o frontend só preserva a ordem recebida. */
export interface CanonicalRecommendation {
  id: string;
  title: string;
  priority: string;
  category: string | null;
  evidence_refs: string[];
}

/** Uma dimensão analítica. */
export interface CanonicalDimension {
  id: string;
  state: IndicatorState;
  value: number | null;
  coverage: number | null;
}

/** Resumo agregado de evidência — só campos da allowlist da origem. */
export interface CanonicalEvidenceSummary {
  id: string;
  kind: string;
  label: string | null;
  observed_count: number;
}

export interface CanonicalResult {
  analysis_id: string;
  result_schema_version: typeof CANONICAL_RESULT_SCHEMA;
  measurement_contract_version: string;
  summary: CanonicalSummary;
  partiality: Partiality;
  indicators: CanonicalIndicator[];
  dimensions: CanonicalDimension[];
  recommendations: CanonicalRecommendation[];
  evidence: CanonicalEvidenceSummary[];
}

/** Os cinco estados, para varredura exaustiva em validação e i18n. */
export const INDICATOR_STATES: readonly IndicatorState[] = [
  "measured",
  "partially_measured",
  "not_measured",
  "not_applicable",
  "calculation_failed",
] as const;

export const INDICATOR_KINDS: readonly IndicatorKind[] = [
  "ratio",
  "count",
  "currency",
  "scalar",
] as const;

/** Estados em que existe um número para mostrar. Os demais têm `value === null`. */
export const STATES_COM_VALOR: readonly IndicatorState[] = [
  "measured",
  "partially_measured",
] as const;
