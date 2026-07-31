// Adapter ÚNICO do resultado (Onda 6 E5): resultado público → view model de apresentação.
// PURO (sem rede, sem React, sem componente), version-aware, explícito sobre ausência.
//
// Backend First — o que este arquivo PODE fazer: ler o campo, formatar número, aplicar unidade e
// precisão, converter razão em percentual QUANDO o payload declara `kind:"ratio"`, localizar data,
// mapear enum→texto. O que NÃO pode: criar/recalcular/ponderar métrica, inferir veredito ou
// severidade, priorizar recomendação, substituir ausência por zero, misturar versões.

import type { AnalysisResultView } from "@/lib/v1";
import { descriptorDe, type IndicatorDescriptor } from "./descriptors";
import { validateProvisionalResult } from "./validator";
import type { ProvisionalIndicator, ProvisionalRecommendation } from "./provisionalSchema";

/** Como a UI deve exibir um indicador — já decidido aqui, nunca no componente. */
export interface IndicatorView {
  id: string;
  descriptor: IndicatorDescriptor;
  /** Estado de disponibilidade — governa zero REAL × não medido × não aplicável. */
  availability: ProvisionalIndicator["availability"];
  /** Texto pronto do valor (`null` quando indisponível — a UI mostra o rótulo de ausência). */
  display: string | null;
  /** Unidade a exibir junto do valor (ex.: "%"), ou `null`. */
  unitSuffix: string | null;
  /** Valor bruto (para testes/aria), sem transformação além da declarada. */
  rawValue: number | null;
  /** true quando o valor está fora da faixa declarada para a unidade (ex.: ratio > 1). */
  outOfRange: boolean;
}

export interface ResultViewModel {
  analysisId: string;
  schemaVersion: string;
  summary: { totalRecords: number | null; usefulOutcomes: number | null; analyzedAt: string | null };
  indicators: IndicatorView[];
  /** `null` = seção inexistente no payload (não renderizar). */
  recommendations: ProvisionalRecommendation[] | null;
  /** Alguma seção esperada veio vazia/sem indicadores suportados. */
  partial: boolean;
}

export type ResultAdaptation =
  | { status: "supported"; view: ResultViewModel }
  | { status: "unsupported"; schemaVersion: string; reason: "missing_schema" | "unknown_schema" | "malformed" };

/** Formata um número preservando precisão significativa (sub-centavo não vira 0). */
function formatarNumero(valor: number, locale: string, precisaoMinima?: number): string {
  const abs = Math.abs(valor);
  // Sub-centavo: usa casas suficientes para o valor não colapsar em zero na exibição.
  let casas = precisaoMinima ?? 2;
  if (abs > 0 && abs < 0.01) {
    casas = Math.max(casas, Math.min(6, Math.ceil(-Math.log10(abs)) + 1));
  }
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: casas }).format(valor);
}

function formatarMoeda(valor: number, moeda: string | null | undefined, locale: string): string {
  if (!moeda) {
    // Sem moeda declarada pela origem: NÃO assumir BRL/USD — número puro, sem símbolo inventado.
    return formatarNumero(valor, locale, 2);
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
function apresentar(ind: ProvisionalIndicator, descriptor: IndicatorDescriptor, locale: string): IndicatorView {
  const base: IndicatorView = {
    id: ind.id,
    descriptor,
    availability: ind.availability,
    display: null,
    unitSuffix: null,
    rawValue: ind.value,
    outOfRange: false,
  };
  if (ind.availability !== "available" || ind.value === null) return base;

  switch (ind.kind) {
    case "ratio": {
      // Fora da faixa declarada NÃO é limitado silenciosamente: é sinalizado.
      const fora = ind.value < 0 || ind.value > 1;
      return {
        ...base,
        display: formatarNumero(ind.value * 100, locale, descriptor.precision ?? 1),
        unitSuffix: "%",
        outOfRange: fora,
      };
    }
    case "count":
      // Contagem NUNCA vira percentual.
      return { ...base, display: formatarNumero(ind.value, locale, 0) };
    case "currency":
      return { ...base, display: formatarMoeda(ind.value, ind.currency, locale) };
    case "scalar":
      return { ...base, display: formatarNumero(ind.value, locale, descriptor.precision ?? 2) };
  }
}

/**
 * Fronteira única: `AnalysisResultView` (público, `result: unknown`) → view model.
 * `locale` só afeta formatação. Nenhum componente chama o validador diretamente.
 */
export function adaptAnalysisResult(publico: AnalysisResultView, locale = "en"): ResultAdaptation {
  const outcome = validateProvisionalResult(publico.result);
  if (outcome.status === "unsupported") {
    return { status: "unsupported", schemaVersion: publico.result_schema_version, reason: outcome.reason };
  }

  const { summary, indicators, recommendations } = outcome.value;
  // Sem descriptor ⇒ não renderiza (cadeado): indicador desconhecido não vira UI adivinhada.
  const views = indicators
    .map((ind) => {
      const d = descriptorDe(ind.id);
      return d ? apresentar(ind, d, locale) : null;
    })
    .filter((v): v is IndicatorView => v !== null);

  const partial = views.length === 0 || views.length < indicators.length;

  return {
    status: "supported",
    view: {
      analysisId: publico.analysis_id,
      schemaVersion: publico.result_schema_version,
      summary: {
        totalRecords: summary.total_records,
        usefulOutcomes: summary.useful_outcomes,
        analyzedAt: summary.analyzed_at, // vem do backend; nunca gerado aqui
      },
      indicators: views,
      recommendations: recommendations ?? null,
      partial,
    },
  };
}
