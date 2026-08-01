// Adapter ÚNICO do resultado: documento canônico `analysis-result-v1` → view model.
// PURO (sem rede, sem React, sem componente), version-aware, explícito sobre ausência.
//
// Backend First — o que este arquivo PODE fazer: ler o campo, formatar número, aplicar unidade,
// moeda e a precisão QUE A ORIGEM DECLAROU, converter razão em percentual QUANDO o documento diz
// `kind:"ratio"`, localizar data, mapear enum→texto. O que NÃO pode: criar/recalcular/ponderar
// métrica, inferir veredito, severidade ou PARCIALIDADE, priorizar recomendação, substituir
// ausência por zero, misturar versões.

import type { AnalysisResultView } from "@/lib/v1";
import { descriptorDe, type IndicatorDescriptor } from "./descriptors";
import { validateCanonicalResult } from "./validator";
import {
  STATES_COM_VALOR,
  type CanonicalDenominator,
  type CanonicalIndicator,
  type CanonicalRecommendation,
  type IndicatorState,
} from "./canonicalSchema";

/** Como a UI deve exibir um indicador — já decidido aqui, nunca no componente. */
export interface IndicatorView {
  id: string;
  descriptor: IndicatorDescriptor;
  /** Estado declarado pela origem — governa zero REAL × parcial × ausente × falhou. */
  state: IndicatorState;
  /** Texto pronto do valor (`null` quando não há valor — a UI mostra o rótulo do estado). */
  display: string | null;
  /** Unidade a exibir junto do valor (ex.: "%"), ou `null`. */
  unitSuffix: string | null;
  /** Valor bruto (para testes/aria), sem transformação além da declarada. */
  rawValue: number | null;
  /** Sobre o que a razão foi calculada — o "porquê" auditável do número. */
  denominator: CanonicalDenominator | null;
  /** Fração da amostra coberta, quando a origem declarou. */
  coverage: number | null;
  /** Cobertura já formatada para exibição (`null` quando a origem não declarou).
   *  Fica AQUI e não no componente: multiplicar por 100 é formatação, e formatação mora num
   *  lugar só — no componente, ela vira o primeiro passo para o cálculo migrar para a UI. */
  coverageDisplay: string | null;
  /** true quando o valor está fora da faixa declarada para a unidade (ex.: ratio > 1). */
  outOfRange: boolean;
}

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

/** Formata um número preservando precisão significativa (sub-centavo não vira 0). */
function formatarNumero(valor: number, locale: string, casasDeclaradas: number): string {
  const abs = Math.abs(valor);
  let casas = casasDeclaradas;
  // Sub-centavo: usa casas suficientes para o valor não colapsar em zero na exibição.
  if (abs > 0 && abs < 0.01) {
    casas = Math.max(casas, Math.min(6, Math.ceil(-Math.log10(abs)) + 1));
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  }).format(valor);
}

function formatarMoeda(
  valor: number,
  moeda: string | null,
  locale: string,
  casasDeclaradas: number,
): string {
  if (!moeda) {
    // Sem moeda declarada pela origem: NÃO assumir BRL/USD — número puro, sem símbolo inventado.
    return formatarNumero(valor, locale, casasDeclaradas);
  }
  const abs = Math.abs(valor);
  const casas = abs > 0 && abs < 0.01 ? Math.min(6, Math.ceil(-Math.log10(abs)) + 1) : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: moeda,
      minimumFractionDigits: 2,
      maximumFractionDigits: casas,
    }).format(valor);
  } catch {
    return formatarNumero(valor, locale, casas);
  }
}

/** Apresentação de UM indicador. `ratio` → percentual SOMENTE porque a origem declarou razão. */
function apresentar(
  ind: CanonicalIndicator,
  descriptor: IndicatorDescriptor,
  locale: string,
): IndicatorView {
  const base: IndicatorView = {
    id: ind.id,
    descriptor,
    state: ind.state,
    display: null,
    unitSuffix: null,
    rawValue: ind.value,
    denominator: ind.denominator,
    coverage: ind.coverage,
    coverageDisplay:
      ind.coverage === null ? null : `${formatarNumero(ind.coverage * 100, locale, 0)}%`,
    outOfRange: false,
  };
  if (!STATES_COM_VALOR.includes(ind.state) || ind.value === null) return base;

  switch (ind.kind) {
    case "ratio": {
      // Fora da faixa declarada NÃO é limitado silenciosamente: é sinalizado.
      const fora = ind.value < 0 || ind.value > 1;
      // Percentual usa 2 casas a menos que a razão: 0,8123 (4 casas) → 81,23% (2 casas). É a
      // MESMA precisão declarada, expressa na outra escala — não uma escolha nova.
      const casas = Math.max(0, ind.display_precision - 2);
      return {
        ...base,
        display: formatarNumero(ind.value * 100, locale, casas),
        unitSuffix: "%",
        outOfRange: fora,
      };
    }
    case "count":
      // Contagem NUNCA vira percentual.
      return { ...base, display: formatarNumero(ind.value, locale, 0) };
    case "currency":
      return {
        ...base,
        display: formatarMoeda(ind.value, ind.currency, locale, ind.display_precision),
      };
    case "scalar":
      return { ...base, display: formatarNumero(ind.value, locale, ind.display_precision) };
  }
}

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
  // Sem descriptor ⇒ não renderiza (cadeado): indicador desconhecido não vira UI adivinhada.
  // Mas ele também não some em silêncio — o id fica registrado para a UI poder dizer que
  // recebeu algo que não sabe nomear.
  const views: IndicatorView[] = [];
  const naoSuportados: string[] = [];
  for (const ind of doc.indicators) {
    const d = descriptorDe(ind.id);
    if (d) views.push(apresentar(ind, d, locale));
    else naoSuportados.push(ind.id);
  }

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
