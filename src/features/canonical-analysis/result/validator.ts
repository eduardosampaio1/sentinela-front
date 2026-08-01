// Validador da fronteira do resultado. O contrato público declara `analysis-result-v1`;
// aqui o documento é INSPECIONADO campo a campo antes de virar view model. Sem `as` amplo,
// sem adivinhação.
//
// Três desfechos honestos:
//   supported    → o payload corresponde a `analysis-result-v1`
//   unsupported  → não corresponde (schema desconhecido/ausente/forma incompatível) → estado seguro
//   (parcialidade NÃO é desfecho daqui: ela vem DECLARADA dentro do documento)

import {
  CANONICAL_RESULT_SCHEMA,
  INDICATOR_KINDS,
  INDICATOR_STATES,
  STATES_COM_VALOR,
  type CanonicalDenominator,
  type CanonicalDimension,
  type CanonicalEvidenceSummary,
  type CanonicalIndicator,
  type CanonicalRecommendation,
  type CanonicalResult,
  type IndicatorKind,
  type IndicatorState,
} from "./canonicalSchema";

export type ValidationOutcome =
  | { status: "supported"; value: CanonicalResult }
  | {
      status: "unsupported";
      reason: "missing_schema" | "unknown_schema" | "schema_mismatch" | "malformed";
    };

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function numeroOuNulo(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function textoOuNulo(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function lerDenominador(bruto: unknown): CanonicalDenominator | null {
  if (!ehObjeto(bruto)) return null;
  const kind = textoOuNulo(bruto.kind);
  const value = numeroOuNulo(bruto.value);
  if (!kind || value === null) return null;
  return { kind, value };
}

/** Indicador válido ou `null` (descartado — nunca "consertado" com zero). */
function lerIndicador(bruto: unknown): CanonicalIndicator | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  if (!id) return null;

  const kind = bruto.kind;
  if (typeof kind !== "string" || !INDICATOR_KINDS.includes(kind as IndicatorKind)) return null;
  const state = bruto.state;
  if (typeof state !== "string" || !INDICATOR_STATES.includes(state as IndicatorState)) return null;

  const value = numeroOuNulo(bruto.value);
  // Coerência declarada: estado COM valor exige número; estado sem valor exige `null`.
  // Um indicador que se diz `not_measured` carregando um número é internamente
  // inconsistente — e o pior desfecho seria escolher em qual dos dois acreditar.
  const temValor = STATES_COM_VALOR.includes(state as IndicatorState);
  if (temValor && value === null) return null;
  if (!temValor && value !== null) return null;

  const precisao = numeroOuNulo(bruto.display_precision);
  if (precisao === null || precisao < 0 || !Number.isInteger(precisao)) return null;

  return {
    id,
    kind: kind as IndicatorKind,
    state: state as IndicatorState,
    value,
    unit: textoOuNulo(bruto.unit),
    currency: textoOuNulo(bruto.currency),
    denominator: lerDenominador(bruto.denominator),
    coverage: numeroOuNulo(bruto.coverage),
    display_precision: precisao,
  };
}

function lerRecomendacao(bruto: unknown): CanonicalRecommendation | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  const title = textoOuNulo(bruto.title);
  // Local em português de propósito: `const priority = ...` é indistinguível, para um leitor
  // (e para o cadeado backend-first), de FABRICAR uma prioridade. Aqui ela é LIDA do documento.
  const prioridadeDaOrigem = textoOuNulo(bruto.priority);
  if (!id || !title || !prioridadeDaOrigem) return null;
  const refs = Array.isArray(bruto.evidence_refs)
    ? bruto.evidence_refs.filter((r): r is string => typeof r === "string")
    : [];
  return {
    id,
    title,
    priority: prioridadeDaOrigem,
    category: textoOuNulo(bruto.category),
    evidence_refs: refs,
  };
}

function lerDimensao(bruto: unknown): CanonicalDimension | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  const state = bruto.state;
  if (!id) return null;
  if (typeof state !== "string" || !INDICATOR_STATES.includes(state as IndicatorState)) return null;
  return {
    id,
    state: state as IndicatorState,
    value: numeroOuNulo(bruto.value),
    coverage: numeroOuNulo(bruto.coverage),
  };
}

function lerEvidencia(bruto: unknown): CanonicalEvidenceSummary | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  const kind = textoOuNulo(bruto.kind);
  const observed = numeroOuNulo(bruto.observed_count);
  if (!id || !kind || observed === null) return null;
  return { id, kind, label: textoOuNulo(bruto.label), observed_count: observed };
}

function lista<T>(v: unknown, ler: (b: unknown) => T | null): T[] {
  return Array.isArray(v) ? v.map(ler).filter((x): x is T => x !== null) : [];
}

/**
 * Inspeciona o `result` do contrato público.
 * `unsupported` NUNCA vira renderização adivinhada — a UI mostra "resultado não suportado".
 */
export function validateCanonicalResult(
  versaoDeclarada: unknown,
  bruto: unknown,
): ValidationOutcome {
  // AUTORIDADE = `result_schema_version` do contrato público. É o campo CONTRATADO que
  // identifica a forma do `result`; um marcador dentro do próprio documento não pode se
  // autopromover a discriminador (Codex E5/E7 R3 [P2]). Consequências desta ordem:
  //   - documento sem o campo interno é aceito (o backend já declarou a versão);
  //   - versão desconhecida NÃO é resgatada por um marcador interno "mágico".
  if (typeof versaoDeclarada !== "string" || versaoDeclarada.trim() === "") {
    return { status: "unsupported", reason: "missing_schema" };
  }
  if (versaoDeclarada !== CANONICAL_RESULT_SCHEMA) {
    return { status: "unsupported", reason: "unknown_schema" };
  }
  if (!ehObjeto(bruto)) return { status: "unsupported", reason: "malformed" };

  // `analysis-result-v1` carrega a própria versão dentro do documento. Quando ela existe e
  // CONTRADIZ o contrato, a resposta é internamente inconsistente — estado seguro, sem
  // escolher um dos dois lados.
  const interna = bruto.result_schema_version;
  if (interna !== undefined && interna !== null && interna !== CANONICAL_RESULT_SCHEMA) {
    return { status: "unsupported", reason: "schema_mismatch" };
  }

  // `summary` e `partiality` são OBRIGATÓRIOS no contrato. Ausentes, o documento não é
  // `analysis-result-v1` — e fabricar defaults aqui inventaria uma análise que não houve.
  const summaryBruto = bruto.summary;
  if (!ehObjeto(summaryBruto)) return { status: "unsupported", reason: "malformed" };
  const recordCount = numeroOuNulo(summaryBruto.record_count);
  const analyzedAt = textoOuNulo(summaryBruto.analyzed_at);
  if (recordCount === null || analyzedAt === null) {
    return { status: "unsupported", reason: "malformed" };
  }

  const partialityBruto = bruto.partiality;
  if (!ehObjeto(partialityBruto) || typeof partialityBruto.complete !== "boolean") {
    return { status: "unsupported", reason: "malformed" };
  }
  const reasons = Array.isArray(partialityBruto.reasons)
    ? partialityBruto.reasons.filter((r): r is string => typeof r === "string")
    : [];

  return {
    status: "supported",
    value: {
      analysis_id: textoOuNulo(bruto.analysis_id) ?? "",
      result_schema_version: CANONICAL_RESULT_SCHEMA,
      measurement_contract_version: textoOuNulo(bruto.measurement_contract_version) ?? "",
      summary: { record_count: recordCount, analyzed_at: analyzedAt },
      partiality: { complete: partialityBruto.complete, reasons },
      indicators: lista(bruto.indicators, lerIndicador),
      dimensions: lista(bruto.dimensions, lerDimensao),
      recommendations: lista(bruto.recommendations, lerRecomendacao),
      evidence: lista(bruto.evidence, lerEvidencia),
    },
  };
}
