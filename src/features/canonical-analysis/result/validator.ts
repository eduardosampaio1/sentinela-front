// Validador da fronteira do resultado. O contrato público declara `analysis-result-v1`;
// aqui o documento é INSPECIONADO campo a campo antes de virar view model. Sem `as` amplo,
// sem adivinhação.
//
// Três desfechos honestos:
//   supported    → o payload corresponde a `analysis-result-v1`
//   unsupported  → não corresponde (schema desconhecido/ausente/forma incompatível) → estado seguro
//   (parcialidade NÃO é desfecho daqui: ela vem DECLARADA dentro do documento)
//
// Os leitores de folha moram em `leitores.ts` desde a MF6.4b, compartilhados com o validador do
// v2 — ver o cabeçalho de lá. Este arquivo continua sendo o único dono da decisão de VERSÃO e da
// forma do cabeçalho do v1.

import { CANONICAL_RESULT_SCHEMA, type CanonicalResult } from "./canonicalSchema";
import {
  ehObjeto,
  lerDimensao,
  lerEvidencia,
  lerIndicador,
  lerParcialidade,
  lerRecomendacao,
  lista,
  numeroOuNulo,
  textoOuNulo,
} from "./leitores";

export type ValidationOutcome =
  | { status: "supported"; value: CanonicalResult }
  | {
      status: "unsupported";
      reason: "missing_schema" | "unknown_schema" | "schema_mismatch" | "malformed";
    };

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

  const parcialidade = lerParcialidade(bruto.partiality);
  if (parcialidade === null) return { status: "unsupported", reason: "malformed" };

  return {
    status: "supported",
    value: {
      analysis_id: textoOuNulo(bruto.analysis_id) ?? "",
      result_schema_version: CANONICAL_RESULT_SCHEMA,
      measurement_contract_version: textoOuNulo(bruto.measurement_contract_version) ?? "",
      summary: { record_count: recordCount, analyzed_at: analyzedAt },
      partiality: parcialidade,
      indicators: lista(bruto.indicators, lerIndicador),
      dimensions: lista(bruto.dimensions, lerDimensao),
      recommendations: lista(bruto.recommendations, lerRecomendacao),
      evidence: lista(bruto.evidence, lerEvidencia),
    },
  };
}
