import { describe, expect, it } from "vitest";
import { adaptAnalysisResult, type IndicatorView } from "./adapter";
import {
  MASSA_A,
  MASSA_B,
  MASSA_C,
  MASSA_D_PARCIAL,
  MASSA_E_FORA_DE_FAIXA,
  PAYLOAD_SCHEMA_DESCONHECIDO,
  resultViewCom,
} from "@/test/fixtures/provisional-result/massas";

function ind(views: IndicatorView[], id: string): IndicatorView {
  const v = views.find((x) => x.id === id);
  if (!v) throw new Error(`indicador ausente: ${id}`);
  return v;
}

describe("adapter — massa A (valores conferidos contra o código analítico real)", () => {
  const r = adaptAnalysisResult(resultViewCom(MASSA_A), "en");
  if (r.status !== "supported") throw new Error("massa A deveria ser suportada");
  const v = r.view;

  it("resumo vem do payload; analyzed_at NÃO é gerado no cliente", () => {
    expect(v.summary.totalRecords).toBe(100);
    expect(v.summary.usefulOutcomes).toBe(80);
    expect(v.summary.analyzedAt).toBe("2026-07-31T10:00:00Z"); // exatamente o do backend
  });

  it("useful_rate 0.8 → 80% (razão declarada; nunca 8.000%)", () => {
    const i = ind(v.indicators, "useful_rate");
    expect(i.display).toBe("80");
    expect(i.unitSuffix).toBe("%");
    expect(i.rawValue).toBe(0.8);
  });

  it("REGRESSÃO intent_coverage: 0.85 → 85%, jamais 8.500%", () => {
    const i = ind(v.indicators, "intent_coverage_rate");
    expect(i.display).toBe("85");
    expect(i.unitSuffix).toBe("%");
    expect(i.display).not.toBe("8,500");
    expect(i.display).not.toBe("8500");
  });

  it("REGRESSÃO token_waste: 20 é CONTAGEM — '20' sem '%'", () => {
    const i = ind(v.indicators, "token_waste_absolute");
    expect(i.display).toBe("20");
    expect(i.unitSuffix).toBeNull(); // nunca "%"
  });

  it("CPUO 0.125 (10.00/80) formatado sem símbolo inventado (currency null)", () => {
    const i = ind(v.indicators, "cost_per_useful_outcome");
    expect(i.rawValue).toBe(0.125);
    expect(i.display).toBe("0.13"); // 2 casas p/ valor ≥ 0.01
    expect(i.display).not.toMatch(/R\$|\$/); // sem moeda assumida
  });

  it("recomendações preservam a ORDEM recebida (sem priorização local)", () => {
    expect(v.recommendations?.map((x) => x.id)).toEqual(["rec-1", "rec-2"]);
  });

  it("só indicadores COM descriptor entram; nada de handoff_rate na UI", () => {
    expect(v.indicators.some((i) => i.id === "handoff_rate")).toBe(false);
    expect(v.partial).toBe(false);
  });
});

describe("adapter — massa B (ausência × zero real)", () => {
  const r = adaptAnalysisResult(resultViewCom(MASSA_B), "en");
  if (r.status !== "supported") throw new Error("massa B deveria ser suportada");
  const v = r.view;

  it("cost_per_useful_outcome sem úteis → NÃO APLICÁVEL, nunca 0", () => {
    const i = ind(v.indicators, "cost_per_useful_outcome");
    expect(i.availability).toBe("not_applicable");
    expect(i.display).toBeNull();
    expect(i.rawValue).toBeNull();
    expect(i.display).not.toBe("0");
  });

  it("cobertura 0 é ZERO REAL (disponível, exibido como 0%)", () => {
    const i = ind(v.indicators, "intent_coverage_rate");
    expect(i.availability).toBe("available");
    expect(i.display).toBe("0");
    expect(i.unitSuffix).toBe("%");
  });

  it("variância não medida → not_measured (distinto de zero e de não aplicável)", () => {
    expect(ind(v.indicators, "avg_variance_per_intent").availability).toBe("not_measured");
  });

  it("sem chave recommendations → seção inexistente (null), não vazia", () => {
    expect(v.recommendations).toBeNull();
  });
});

describe("adapter — massa C (sub-centavo e moeda declarada)", () => {
  const r = adaptAnalysisResult(resultViewCom(MASSA_C), "en");
  if (r.status !== "supported") throw new Error("massa C deveria ser suportada");
  const v = r.view;

  it("REGRESSÃO sub-centavo: 0.0042 não vira 0.00 nem $0", () => {
    const i = ind(v.indicators, "total_cost");
    expect(i.rawValue).toBe(0.0042);
    expect(i.display).toMatch(/0\.0042/);
    expect(i.display).not.toMatch(/^\$?0\.00$/);
  });

  it("moeda declarada (USD) é usada; sem duplicar símbolo", () => {
    const i = ind(v.indicators, "cost_per_useful_outcome");
    expect(i.display).toMatch(/\$/);
    expect((i.display?.match(/\$/g) ?? []).length).toBe(1);
    expect(i.display).toMatch(/0\.0014/);
  });

  it("razão 1 → 100%", () => {
    expect(ind(v.indicators, "useful_rate").display).toBe("100");
  });
});

describe("adapter — parcialidade, fronteira e incompatibilidade", () => {
  it("indicador sem descriptor é descartado e a view fica PARCIAL", () => {
    const r = adaptAnalysisResult(resultViewCom(MASSA_D_PARCIAL), "en");
    if (r.status !== "supported") throw new Error("deveria ser suportada");
    expect(r.view.indicators.map((i) => i.id)).toEqual(["useful_rate"]);
    expect(r.view.partial).toBe(true);
  });

  it("razão fora da faixa (1.4) é SINALIZADA, não limitada silenciosamente", () => {
    const r = adaptAnalysisResult(resultViewCom(MASSA_E_FORA_DE_FAIXA), "en");
    if (r.status !== "supported") throw new Error("deveria ser suportada");
    const i = ind(r.view.indicators, "useful_rate");
    expect(i.outOfRange).toBe(true);
    expect(i.rawValue).toBe(1.4); // não foi "consertado" para 1
  });

  it("schema desconhecido → unsupported (sem adivinhar)", () => {
    const r = adaptAnalysisResult(resultViewCom(PAYLOAD_SCHEMA_DESCONHECIDO), "en");
    expect(r.status).toBe("unsupported");
    if (r.status === "unsupported") expect(r.reason).toBe("unknown_schema");
  });

  it("payload sem schema / malformado → unsupported", () => {
    expect(adaptAnalysisResult(resultViewCom({ indicators: [] }), "en").status).toBe("unsupported");
    expect(adaptAnalysisResult(resultViewCom("texto"), "en").status).toBe("unsupported");
    expect(adaptAnalysisResult(resultViewCom(null), "en").status).toBe("unsupported");
  });

  // Codex E5/E7 R3 [P2]: a AUTORIDADE é o `result_schema_version` do contrato público, não um
  // marcador dentro do blob opaco. Estes três casos fixam a ordem.
  describe("autoridade do discriminador público", () => {
    const MIOLO = {
      summary: { total_records: 10, useful_outcomes: 8, analyzed_at: null },
      indicators: [{ id: "useful_rate", kind: "ratio", availability: "available", value: 0.8 }],
    };

    it("envelope declara a versão suportada e o blob NÃO repete o marcador → renderiza", () => {
      const r = adaptAnalysisResult(
        resultViewCom(MIOLO, "an-abc", "provisional-analysis-result-v1"),
        "en",
      );
      if (r.status !== "supported") throw new Error(`deveria ser suportada, veio ${r.status}`);
      expect(r.view.indicators).toHaveLength(1);
    });

    it("envelope declara versão DESCONHECIDA e o blob traz o marcador mágico → NÃO renderiza", () => {
      const comMarcador = { schema: "provisional-analysis-result-v1", ...MIOLO };
      const r = adaptAnalysisResult(resultViewCom(comMarcador, "an-abc", "outra-versao-v9"), "en");
      expect(r.status).toBe("unsupported");
      if (r.status === "unsupported") expect(r.reason).toBe("unknown_schema");
    });

    it("envelope e blob se CONTRADIZEM → estado seguro, sem escolher um lado", () => {
      const contraditorio = { schema: "outra-coisa-v2", ...MIOLO };
      const r = adaptAnalysisResult(
        resultViewCom(contraditorio, "an-abc", "provisional-analysis-result-v1"),
        "en",
      );
      expect(r.status).toBe("unsupported");
      if (r.status === "unsupported") expect(r.reason).toBe("schema_mismatch");
    });

    it("envelope sem versão declarada → missing_schema (não cai no blob)", () => {
      const comMarcador = { schema: "provisional-analysis-result-v1", ...MIOLO };
      const r = adaptAnalysisResult(resultViewCom(comMarcador, "an-abc", ""), "en");
      expect(r.status).toBe("unsupported");
      if (r.status === "unsupported") expect(r.reason).toBe("missing_schema");
    });
  });

  it("indicador incoerente (available sem valor / ausente com valor) é descartado", () => {
    const payload = {
      schema: "provisional-analysis-result-v1",
      summary: { total_records: 1, useful_outcomes: 1, analyzed_at: null },
      indicators: [
        { id: "useful_rate", kind: "ratio", availability: "available", value: null },
        { id: "total_cost", kind: "currency", availability: "not_measured", value: 5 },
      ],
    };
    const r = adaptAnalysisResult(resultViewCom(payload), "en");
    if (r.status !== "supported") throw new Error("deveria ser suportada");
    expect(r.view.indicators).toHaveLength(0);
    expect(r.view.partial).toBe(true);
  });
});
