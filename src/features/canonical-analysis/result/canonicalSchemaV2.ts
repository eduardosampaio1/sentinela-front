// Contrato CANÔNICO do documento INTEGRADO: `analysis-result-v2` (MF6.2).
//
//     Engine facts  +  Analytics public projection  →  analysis-result-v2
//
// Reusa o vocabulário do v1 — indicador, dimensão, recomendação, evidência e parcialidade são os
// MESMOS tipos, porque a parte da Engine não mudou. O que o v2 acrescenta é o bloco analítico, e
// o que ele RENOMEIA é a contagem da janela.
//
// Regra de isolamento (herdada do v1): SOMENTE os validadores e os adapters conhecem este shape.
// Nenhum componente lê o payload bruto.
//
// ## Por que um arquivo à parte, e não um campo opcional no v1
//
// `analysis-result-v1` tem `additionalProperties: false` no schema publicado: qualquer acréscimo
// é quebra para quem valida contra ele. O backend criou o v2 por isso, e o frontend espelha a
// separação — misturar os dois shapes num tipo só faria `if (version === …)` vazar para dentro do
// próprio contrato.

import type {
  CanonicalDimension,
  CanonicalEvidenceSummary,
  CanonicalIndicator,
  CanonicalRecommendation,
} from "./canonicalSchema";

/** Versão do contrato INTEGRADO suportada por este frontend. */
export const CANONICAL_RESULT_V2_SCHEMA = "analysis-result-v2" as const;

/**
 * O que a projeção analítica CONCLUIU. Vocabulário do Analytics — o frontend não o infere.
 *
 * `withheld` é **conclusão**, não ausência: a análise terminou e nada pôde ser liberado, por
 * decisão de privacidade. Tratá-la como erro na UI reintroduziria como falha técnica o que o
 * backend congelou como decisão.
 */
export const COMPONENT_STATUSES = ["ready", "partial", "withheld"] as const;
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

/**
 * O bloco analítico do documento. **Wrapper obrigatório, conteúdo anulável.**
 *
 * Obrigatório porque "não há bloco" e "decidiu-se não liberar nada" são coisas diferentes, e um
 * documento que as confundisse deixaria o leitor adivinhar. Anulável porque `withheld` é
 * conclusão válida.
 */
export interface CanonicalAnalyticsBlock {
  component_status: ComponentStatus;
  /** Identidade do CONTEÚDO. Publicada para que o consumidor possa conferi-la. */
  projection_digest: string;
  /** Versão PRÓPRIA do snapshot — distinta da `measurement_contract_version` da Engine. */
  snapshot_contract_version: string;
  /** O denominador analítico (a contagem **C**). `null` em `withheld`. */
  record_count: number | null;
  /** A projeção pública. `null` em `withheld`. **Opaca para o frontend.** */
  data: Record<string, unknown> | null;
}

/** Cabeçalho do documento integrado. **Não existe `record_count` aqui**, e é deliberado. */
export interface CanonicalSummaryV2 {
  /**
   * A contagem **A**: a janela que a Engine analisou. Era `summary.record_count` no v1.
   *
   * O nome mudou porque o v2 carrega DUAS contagens, e um nome ambíguo faria a errada ser lida.
   * Quem quer o denominador analítico pede `analytics.record_count`.
   */
  engine_window_record_count: number;
  analyzed_at: string;
}

export interface CanonicalResultV2 {
  analysis_id: string;
  result_schema_version: string;
  measurement_contract_version: string;
  summary: CanonicalSummaryV2;
  indicators: CanonicalIndicator[];
  dimensions: CanonicalDimension[];
  recommendations: CanonicalRecommendation[];
  evidence: CanonicalEvidenceSummary[];
  partiality: { complete: boolean; reasons: string[] };
  /** **Obrigatório.** Ver `CanonicalAnalyticsBlock`. */
  analytics: CanonicalAnalyticsBlock;
}
