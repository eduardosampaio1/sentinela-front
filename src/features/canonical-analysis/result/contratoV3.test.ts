// O contrato v3 na FRONTEIRA — o que a tela aceita antes de desenhar.
//
// Este arquivo nasceu de um defeito encontrado ao pôr a tela no ar, e não em teste: um
// documento sem `summary.record_count` passava na validação, e a tela escrevia
// **"medido sobre NaN conversas"**. O contrato declara o campo obrigatório
// (`PublicSummary.record_count: number`); a checagem só exigia que `summary` fosse um objeto.

import { describe, expect, it } from "vitest";

import { validarResultadoV3 } from "./contratoV3";

describe("v3 · o DENOMINADOR não pode faltar", () => {
  // Encontrado ao pôr a tela no ar, não em teste: um documento sem `summary.record_count`
  // passava na validação e a tela escrevia "medido sobre NaN conversas".
  //
  // `NaN` é pior que zero, e zero já é o que esta casa proíbe: não é número, não é ausência
  // declarada, e o leitor não tem como saber se o problema é o dado ou a tela.
  const base = () => ({
    analysis_id: "an-1",
    indicator_registry_version: "indicator-registry-1.1",
    measurement_contract_version: "measurement-1.0",
    argos_catalog_version: "argos-catalog-1.0",
    summary: { analyzed_at: "2026-08-18T00:00:00Z", record_count: 12480 },
    partiality: { complete: true, reasons: [] },
    method: { min_samples_per_intent: 5 },
  });

  it("documento COM `record_count` passa", () => {
    const r = validarResultadoV3("analysis-result-v3", base());
    expect(r.status).toBe("ok");
  });

  it("SEM `record_count` é recusado — nunca renderizado com `NaN`", () => {
    const doc = base();
    delete (doc.summary as Record<string, unknown>).record_count;
    expect(validarResultadoV3("analysis-result-v3", doc)).toMatchObject({
      status: "recusado",
      reason: "malformed_document",
    });
  });

  it("`record_count` não-finito também é recusado", () => {
    // `NaN` e `Infinity` são `typeof "number"`: checar só o tipo deixaria os dois passarem, e
    // eles são exatamente o que produz o defeito na tela.
    for (const ruim of [Number.NaN, Number.POSITIVE_INFINITY, "12480", null]) {
      const doc = base();
      (doc.summary as Record<string, unknown>).record_count = ruim;
      expect(
        validarResultadoV3("analysis-result-v3", doc).status,
        `aceitou record_count = ${String(ruim)}`,
      ).toBe("recusado");
    }
  });

  it("`record_count` ZERO é válido — análise vazia é fato, não erro", () => {
    const doc = base();
    (doc.summary as Record<string, unknown>).record_count = 0;
    expect(validarResultadoV3("analysis-result-v3", doc).status).toBe("ok");
  });
});
