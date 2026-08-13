// M39 · EVO-02 — a regra de comparação ARGOS, provada sobre a massa REAL.
//
// A massa é `v3-comparacao.json`: dois documentos que saíram do código analítico real rodado
// duas vezes. Contagens EXATAS, não `> 0` — uma massa que perdesse metade dos indicadores
// continuaria passando num `toBeGreaterThan(0)`, e a regra herdaria uma prova que não protege.

import { describe, expect, it } from "vitest";
import type { AnalysisResultV3Document } from "./contratoV3";
import { compararArgos } from "./comparacao";
import MASSA from "@/test/fixtures/canonical-result/v3-comparacao.json";

const A = MASSA.A as unknown as AnalysisResultV3Document;
const B = MASSA.B as unknown as AnalysisResultV3Document;
const BQ = MASSA.B_QUEBRA as unknown as AnalysisResultV3Document;

const PARES_DE_INDICADOR = 14;
const PARES_DE_DIMENSAO = 4;

/** Um documento com uma medição alterada — para exercitar pré-condição de PAR. */
function comIndicadorAlterado(
  base: AnalysisResultV3Document,
  id: string,
  patch: Record<string, unknown>,
): AnalysisResultV3Document {
  const copia = JSON.parse(JSON.stringify(base)) as AnalysisResultV3Document;
  const alvo = (copia.indicators ?? []).find((i) => i.id === id);
  Object.assign(alvo as object, patch);
  return copia;
}

describe("M39 · comparação ARGOS — documento", () => {
  it("documentos compatíveis produzem as duas famílias", () => {
    const c = compararArgos(A, B);
    expect(c.documentosComparaveis).toBe(true);
    expect(c.campoQueQuebrou).toBeNull();
    expect(c.indicadores).toHaveLength(PARES_DE_INDICADOR);
    expect(c.dimensoes).toHaveLength(PARES_DE_DIMENSAO);
  });

  it("todos os pares da massa compatível são COMPARÁVEIS", () => {
    // Anti-vacuidade pelo outro lado: uma regra que marcasse tudo como incompatível também
    // devolveria 14 linhas, e a contagem sozinha não a denunciaria.
    const c = compararArgos(A, B);
    const comparaveis = c.indicadores.filter((p) => p.estado === "comparavel");
    expect(comparaveis).toHaveLength(PARES_DE_INDICADOR);
    expect(c.dimensoes.every((p) => p.estado === "comparavel")).toBe(true);
  });

  it("quebra documental NÃO produz par nenhum", () => {
    // A descontinuidade é do DOCUMENTO. Montar linhas com carimbo de "incomparável" convidaria
    // a lê-las mesmo assim — e os ids batem dos dois lados, que é o que torna a leitura
    // tentadora.
    const c = compararArgos(A, BQ);
    expect(c.documentosComparaveis).toBe(false);
    expect(c.campoQueQuebrou).toBe("indicator_registry_version");
    expect(c.indicadores).toEqual([]);
    expect(c.dimensoes).toEqual([]);
  });

  it("os ids da massa quebrada CONTINUAM batendo — a quebra não é ausência de dado", () => {
    const idsA = new Set((A.indicators ?? []).map((i) => i.id));
    const idsBQ = (BQ.indicators ?? []).map((i) => i.id);
    expect(idsBQ.every((id) => idsA.has(id))).toBe(true);
    // E mesmo assim, nenhum par.
    expect(compararArgos(A, BQ).indicadores).toEqual([]);
  });
});

describe("M39 · comparação ARGOS — pré-condições de PAR", () => {
  it("escala diferente torna o par incompatível, e diz por quê", () => {
    const b2 = comIndicadorAlterado(B, "useful_outcome_rate", {
      scale: { kind: "score_100", minimum: null, maximum: null },
    });
    const par = compararArgos(A, b2).indicadores.find((p) => p.id === "useful_outcome_rate");
    expect(par?.estado).toBe("incompativel");
    expect(par?.motivo).toBe("escala");
  });

  it("unidade diferente torna o par incompatível", () => {
    const b2 = comIndicadorAlterado(B, "analyzed_conversation_count", { unit: "sessions" });
    const par = compararArgos(A, b2).indicadores.find(
      (p) => p.id === "analyzed_conversation_count",
    );
    expect(par?.motivo).toBe("unidade");
  });

  it("moeda diferente é INCOMPATÍVEL, nunca convertida", () => {
    // Não há câmbio no Front. Converter BRL em USD produziria um número que produtor nenhum
    // publicou, e ele apareceria com a mesma autoridade dos medidos.
    const b2 = comIndicadorAlterado(B, "total_estimated_cost", { currency: "BRL" });
    const par = compararArgos(A, b2).indicadores.find((p) => p.id === "total_estimated_cost");
    expect(par?.motivo).toBe("moeda");
    expect(par?.estado).toBe("incompativel");
  });

  it("um lado sem valor não vira par comparável — nem vira zero", () => {
    const b2 = comIndicadorAlterado(B, "conversion_rate", {
      value: null,
      state: "not_measured",
      reason: "no_input_data",
    });
    const par = compararArgos(A, b2).indicadores.find((p) => p.id === "conversion_rate");
    expect(par?.estado).toBe("incompativel");
    expect(par?.motivo).toBe("sem_valor");
    expect(par?.b?.value ?? null).toBeNull();
  });

  it("as demais linhas continuam comparáveis — a incompatibilidade é do PAR", () => {
    // A diferença que o v3 tornou expressável: um par incompatível NÃO contamina os outros,
    // enquanto a quebra documental contamina todos.
    const b2 = comIndicadorAlterado(B, "conversion_rate", { unit: "outra" });
    const c = compararArgos(A, b2);
    expect(c.documentosComparaveis).toBe(true);
    expect(c.indicadores.filter((p) => p.estado === "comparavel")).toHaveLength(
      PARES_DE_INDICADOR - 1,
    );
  });
});

describe("M39 · comparação ARGOS — presença", () => {
  it("medição só em A e só em B são estados PRÓPRIOS", () => {
    const a2 = JSON.parse(JSON.stringify(A)) as AnalysisResultV3Document;
    const b2 = JSON.parse(JSON.stringify(B)) as AnalysisResultV3Document;
    // Um id sai de cada lado — o que existe de um lado só continua visível.
    (a2 as { indicators: unknown[] }).indicators = (a2.indicators ?? []).filter(
      (i) => i.id !== "handoff_count",
    );
    (b2 as { indicators: unknown[] }).indicators = (b2.indicators ?? []).filter(
      (i) => i.id !== "conversion_count",
    );

    const c = compararArgos(a2, b2);
    expect(c.indicadores.find((p) => p.id === "conversion_count")?.estado).toBe("so_em_a");
    expect(c.indicadores.find((p) => p.id === "handoff_count")?.estado).toBe("so_em_b");
  });

  it("família omitida vira zero pares, e não uma família inventada", () => {
    // `omitted != []`: o documento sem dimensões não passa a ter dimensões vazias comparadas.
    const a2 = JSON.parse(JSON.stringify(A)) as AnalysisResultV3Document;
    delete (a2 as { dimensions?: unknown }).dimensions;
    const c = compararArgos(a2, B);
    expect(c.dimensoes).toHaveLength(PARES_DE_DIMENSAO);
    expect(c.dimensoes.every((p) => p.estado === "so_em_b")).toBe(true);
  });

  it("as quatro dimensões canônicas pareiam, e `ai_health_score` não entra", () => {
    const c = compararArgos(A, B);
    expect(c.dimensoes.map((p) => p.id).sort()).toEqual([
      "behavioral",
      "economic",
      "semantic",
      "structural",
    ]);
  });
});

describe("M39 · comparação ARGOS — o que ela NÃO produz", () => {
  it("nenhum campo de diferença, direção ou tendência no view model", () => {
    const c = compararArgos(A, B);
    const bruto = JSON.stringify(c);
    for (const proibido of ["delta", "trend", "direction", "variacao", "melhora", "piora"]) {
      expect(bruto.includes(proibido), `view model carrega \`${proibido}\``).toBe(false);
    }
  });

  it("os valores publicados atravessam sem alteração", () => {
    // O que sai é o que entrou. Uma normalização silenciosa apareceria aqui.
    const c = compararArgos(A, B);
    const origemA = new Map((A.indicators ?? []).map((i) => [i.id, i.value]));
    const origemB = new Map((B.indicators ?? []).map((i) => [i.id, i.value]));
    for (const par of c.indicadores) {
      expect(par.a?.value ?? null).toBe(origemA.get(par.id) ?? null);
      expect(par.b?.value ?? null).toBe(origemB.get(par.id) ?? null);
    }
  });

  it("a ordem é a do documento A — nada é reordenado por magnitude", () => {
    const c = compararArgos(A, B);
    expect(c.indicadores.map((p) => p.id)).toEqual((A.indicators ?? []).map((i) => i.id));
  });
});
