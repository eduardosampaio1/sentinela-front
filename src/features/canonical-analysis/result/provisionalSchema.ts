// PERFIL PROVISÓRIO do conteúdo de `result` (Onda 6 E5).
//
// ⚠️ PROVISÓRIO — válido para DESENVOLVIMENTO e TESTES da Onda 6. NÃO é o contrato público
// definitivo. O contrato público segue `result: unknown` (public-v1 intocado). A padronização
// canônica do resultado analítico está adiada para pós-Onda 8 (dívida registrada).
//
// Regra de isolamento: SOMENTE `validator.ts` e `adapter.ts` podem conhecer este shape. Nenhum
// componente lê o payload bruto — quando a padronização chegar, troca-se esta fronteira sem
// reconstruir a UI.
//
// Backend First: cada indicador traz o VALOR e a UNIDADE já decididos pela origem. O frontend
// nunca calcula, pondera ou infere: ele formata o que veio. `kind: "ratio"` é a ÚNICA autorização
// para exibir como percentual (multiplicar por 100).

/** Versão do perfil provisório suportado por este frontend. */
export const PROVISIONAL_RESULT_SCHEMA = "provisional-analysis-result-v1" as const;

/** Natureza do valor — decide a formatação permitida, e nada além dela. */
export type IndicatorKind =
  | "ratio" // 0..1 declarado pela origem → pode virar percentual
  | "count" // contagem absoluta → número puro, NUNCA percentual
  | "currency" // valor monetário → formatação de moeda (símbolo só se `currency` vier)
  | "scalar"; // número sem unidade semântica (ex.: variância)

/** Disponibilidade declarada PELA ORIGEM — ausência nunca vira zero. */
export type IndicatorAvailability =
  | "available" // valor medido (inclui ZERO REAL)
  | "not_measured" // não foi medido nesta análise
  | "not_applicable"; // não se aplica (ex.: sem denominador)

export interface ProvisionalIndicator {
  /** Identificador estável; casa com o descriptor da UI. */
  id: string;
  kind: IndicatorKind;
  availability: IndicatorAvailability;
  /** `null` quando não disponível. NUNCA usar 0 para representar ausência. */
  value: number | null;
  /** Código ISO da moeda quando `kind === "currency"` e a origem declarou. Sem isso, não se
   *  assume BRL/USD: formata-se o número sem símbolo. */
  currency?: string | null;
}

export interface ProvisionalSummary {
  /** Total de registros analisados (contagem da origem). */
  total_records: number | null;
  /** Quantos tiveram desfecho útil (contagem da origem). */
  useful_outcomes: number | null;
  /** Timestamp PRODUZIDO PELO BACKEND. Nunca `new Date()` no cliente. */
  analyzed_at: string | null;
}

/** Recomendação JÁ priorizada pela origem — o frontend só preserva a ordem recebida. */
export interface ProvisionalRecommendation {
  id: string;
  title: string;
  description?: string | null;
}

export interface ProvisionalResult {
  schema: typeof PROVISIONAL_RESULT_SCHEMA;
  summary: ProvisionalSummary;
  indicators: ProvisionalIndicator[];
  /** Ausente ⇒ a seção NÃO é renderizada (não se inventa recomendação). */
  recommendations?: ProvisionalRecommendation[];
}
