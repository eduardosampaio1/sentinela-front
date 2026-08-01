// Validador da fronteira do resultado (Onda 6 E5). O contrato público devolve `result: unknown`;
// aqui ele é INSPECIONADO campo a campo antes de virar view model. Sem `as` amplo, sem adivinhação.
//
// Três desfechos honestos:
//   supported    → o payload corresponde ao perfil provisório (pode ter seções ausentes)
//   unsupported  → não corresponde (schema desconhecido/ausente/forma incompatível) → estado seguro
//   (parcialidade é sinalizada DENTRO de `supported`, por seção)

import {
  PROVISIONAL_RESULT_SCHEMA,
  type IndicatorAvailability,
  type IndicatorKind,
  type ProvisionalIndicator,
  type ProvisionalRecommendation,
  type ProvisionalResult,
} from "./provisionalSchema";

export type ValidationOutcome =
  | { status: "supported"; value: ProvisionalResult }
  | {
      status: "unsupported";
      reason: "missing_schema" | "unknown_schema" | "schema_mismatch" | "malformed";
    };

const KINDS: IndicatorKind[] = ["ratio", "count", "currency", "scalar"];
const AVAILABILITIES: IndicatorAvailability[] = ["available", "not_measured", "not_applicable"];

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function numeroOuNulo(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function textoOuNulo(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** Indicador válido ou `null` (descartado — nunca "consertado" com zero). */
function lerIndicador(bruto: unknown): ProvisionalIndicator | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  const kind = bruto.kind;
  const availability = bruto.availability;
  if (!id) return null;
  if (typeof kind !== "string" || !KINDS.includes(kind as IndicatorKind)) return null;
  if (typeof availability !== "string" || !AVAILABILITIES.includes(availability as IndicatorAvailability)) return null;

  const value = numeroOuNulo(bruto.value);
  // Coerência declarada: "available" exige valor numérico; ausência exige value nulo.
  if (availability === "available" && value === null) return null;
  if (availability !== "available" && value !== null) return null;

  const currency = kind === "currency" ? textoOuNulo(bruto.currency) : null;
  return { id, kind: kind as IndicatorKind, availability: availability as IndicatorAvailability, value, currency };
}

function lerRecomendacao(bruto: unknown): ProvisionalRecommendation | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  const title = textoOuNulo(bruto.title);
  if (!id || !title) return null;
  return { id, title, description: textoOuNulo(bruto.description) };
}

/**
 * Inspeciona o `result` opaco do contrato público.
 * `unsupported` NUNCA vira renderização adivinhada — a UI mostra "resultado não suportado".
 */
export function validateProvisionalResult(
  versaoDeclarada: unknown,
  bruto: unknown,
): ValidationOutcome {
  // AUTORIDADE = `result_schema_version` do contrato público. É o campo CONTRATADO que identifica
  // a forma do `result` opaco; um marcador dentro do próprio blob não pode se autopromover a
  // discriminador (Codex E5/E7 R3 [P2]). Consequências desta ordem:
  //   - envelope válido SEM marcador interno é aceito (o backend já declarou a versão);
  //   - envelope com versão desconhecida NÃO é resgatado por um marcador interno "mágico".
  if (typeof versaoDeclarada !== "string" || versaoDeclarada.trim() === "") {
    return { status: "unsupported", reason: "missing_schema" };
  }
  if (versaoDeclarada !== PROVISIONAL_RESULT_SCHEMA) {
    return { status: "unsupported", reason: "unknown_schema" };
  }

  if (!ehObjeto(bruto)) return { status: "unsupported", reason: "malformed" };

  // O marcador interno é OPCIONAL; quando existe e CONTRADIZ o contrato, a resposta é
  // internamente inconsistente — estado seguro, sem escolher um dos dois lados.
  const marcador = bruto.schema;
  if (marcador !== undefined && marcador !== null && marcador !== PROVISIONAL_RESULT_SCHEMA) {
    return { status: "unsupported", reason: "schema_mismatch" };
  }

  const summaryBruto = ehObjeto(bruto.summary) ? bruto.summary : {};
  const summary = {
    total_records: numeroOuNulo(summaryBruto.total_records),
    useful_outcomes: numeroOuNulo(summaryBruto.useful_outcomes),
    // `analyzed_at` só é aceito se vier da ORIGEM. O frontend jamais preenche.
    analyzed_at: textoOuNulo(summaryBruto.analyzed_at),
  };

  const indicators = Array.isArray(bruto.indicators)
    ? bruto.indicators.map(lerIndicador).filter((i): i is ProvisionalIndicator => i !== null)
    : [];

  // Ausência da chave ⇒ seção não existe (não se inventa recomendação).
  const recomendacoesBrutas = bruto.recommendations;
  const recommendations = Array.isArray(recomendacoesBrutas)
    ? recomendacoesBrutas.map(lerRecomendacao).filter((r): r is ProvisionalRecommendation => r !== null)
    : undefined;

  return {
    status: "supported",
    value: { schema: PROVISIONAL_RESULT_SCHEMA, summary, indicators, recommendations },
  };
}
