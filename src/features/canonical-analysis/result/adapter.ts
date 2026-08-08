// Adapter ÚNICO do resultado: documento canônico `analysis-result-v1` → view model.
// PURO (sem rede, sem React, sem componente), version-aware, explícito sobre ausência.
//
// Backend First — o que este arquivo PODE fazer: ler o campo, formatar número, aplicar unidade,
// moeda e a precisão QUE A ORIGEM DECLAROU, converter razão em percentual QUANDO o documento diz
// `kind:"ratio"`, localizar data, mapear enum→texto. O que NÃO pode: criar/recalcular/ponderar
// métrica, inferir veredito, severidade ou PARCIALIDADE, priorizar recomendação, substituir
// ausência por zero, misturar versões.

import type { AnalysisResultView } from "@/lib/v1";
import { apresentarIndicadores, type IndicatorView } from "./indicadores";
import { validateCanonicalResult } from "./validator";
import type { CanonicalRecommendation } from "./canonicalSchema";

// `IndicatorView` e a apresentação de indicador mudaram de casa na MF6.4b (`indicadores.ts`),
// compartilhadas com o adapter v2 — ver o cabeçalho de lá. Reexportado porque os componentes do
// v1 importam o tipo daqui, e mover o import deles seria churn sem ganho.
export type { IndicatorView };

export interface ResultViewModel {
  analysisId: string;
  schemaVersion: string;
  /** Registro de indicadores que produziu este documento — explica um indicador que mudou. */
  indicatorRegistryVersion: string;
  summary: { recordCount: number; analyzedAt: string };
  indicators: IndicatorView[];
  /** Vazio ⇒ a seção NÃO é renderizada (não se inventa recomendação). */
  recommendations: CanonicalRecommendation[];
  /**
   * Completude DECLARADA pela origem, com os motivos dela.
   *
   * A E5 inferia isto contando indicadores que sobreviveram à filtragem do frontend — o que
   * media a cobertura do PRÓPRIO frontend, não a da análise. As duas divergem justamente
   * quando o usuário precisa saber.
   */
  partial: boolean;
  partialityReasons: string[];
  /** Indicadores que o backend enviou e a UI não sabe nomear. Registrado, nunca silencioso. */
  unsupportedIndicatorIds: string[];
}

export type ResultAdaptation =
  | { status: "supported"; view: ResultViewModel }
  | {
      status: "unsupported";
      schemaVersion: string;
      reason: "missing_schema" | "unknown_schema" | "schema_mismatch" | "malformed";
    };

/**
 * Fronteira única: `AnalysisResultView` (contrato público) → view model.
 * `locale` só afeta formatação. Nenhum componente chama o validador diretamente.
 */
export function adaptAnalysisResult(publico: AnalysisResultView, locale = "en"): ResultAdaptation {
  // O discriminador do contrato público entra como AUTORIDADE (não o miolo do documento).
  const outcome = validateCanonicalResult(publico.result_schema_version, publico.result);
  if (outcome.status === "unsupported") {
    return {
      status: "unsupported",
      schemaVersion: publico.result_schema_version,
      reason: outcome.reason,
    };
  }

  const doc = outcome.value;
  const { views, naoSuportados } = apresentarIndicadores(doc.indicators, locale);

  return {
    status: "supported",
    view: {
      analysisId: publico.analysis_id,
      schemaVersion: publico.result_schema_version,
      indicatorRegistryVersion: publico.indicator_registry_version,
      summary: {
        recordCount: doc.summary.record_count,
        analyzedAt: doc.summary.analyzed_at, // vem do backend; nunca gerado aqui
      },
      indicators: views,
      recommendations: doc.recommendations,
      // DECLARADA, não inferida.
      partial: !doc.partiality.complete,
      partialityReasons: doc.partiality.reasons,
      unsupportedIndicatorIds: naoSuportados,
    },
  };
}
