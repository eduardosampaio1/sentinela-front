import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type {
  CatalogoDeExploracao,
  FamiliaAnalitica,
} from "../../result/analyticsProjection";
import { VisaoUniversalDeMedidas } from "./VisaoUniversalDeMedidas";

const FAMILIAS: FamiliaAnalitica[] = [
  "volume",
  "structure",
  "outcomes",
  "containment",
  "intent_coverage",
  "response_quality",
  "safety_privacy",
  "groundedness",
  "operations",
  "cost_resources",
  "custom",
];

const CATALOGO: CatalogoDeExploracao = {
  catalog_contract_version: "analytics-exploration-catalog-v1",
  query_contract_version: "analytics-query-v1",
  metric_families: FAMILIAS.map((family_id) => ({
    family_id,
    availability: family_id === "volume" ? "available" : "not_measured",
    reason_code: family_id === "volume" ? null : "no_published_metric",
    metric_ids: family_id === "volume" ? ["dataset.record_count"] : [],
  })),
  metrics: [
    {
      metric_id: "dataset.record_count",
      family_id: "volume",
      value_kind: "count",
      availability: "available",
      reason_code: null,
      compatible_dimension_ids: [],
      compatible_time_dimension_ids: [],
      not_materialized_dimension_ids: [],
      not_materialized_time_dimension_ids: [],
      incompatible_dimension_ids: [],
      incompatible_time_dimension_ids: [],
    },
  ],
  dimensions: [],
};

afterEach(() => window.localStorage.clear());

describe("visão universal de medidas", () => {
  it("mostra as dez perguntas e não converte família não medida em zero", () => {
    window.localStorage.setItem("sentinela:language", "pt");
    render(
      <LanguageProvider>
        <VisaoUniversalDeMedidas catalogo={CATALOGO} />
      </LanguageProvider>,
    );

    expect(screen.getByText("Volume")).toBeTruthy();
    expect(screen.getByText("Cobertura de intenções")).toBeTruthy();
    expect(screen.getByText("Custo e recursos")).toBeTruthy();
    expect(screen.getAllByText("Não medido")).toHaveLength(9);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("tem a mesma estrutura em inglês", () => {
    window.localStorage.setItem("sentinela:language", "en");
    render(
      <LanguageProvider>
        <VisaoUniversalDeMedidas catalogo={CATALOGO} />
      </LanguageProvider>,
    );

    expect(screen.getByText("Coverage of user intents")).toBeTruthy();
    expect(screen.getByText("Cost and resources")).toBeTruthy();
    expect(screen.getAllByText("Not measured")).toHaveLength(9);
  });

  it("explica honestamente snapshots históricos sem inferir disponibilidade", () => {
    window.localStorage.setItem("sentinela:language", "pt");
    render(
      <LanguageProvider>
        <VisaoUniversalDeMedidas catalogo={null} />
      </LanguageProvider>,
    );

    expect(screen.getByText("Esta análise é anterior ao catálogo universal")).toBeTruthy();
    expect(screen.queryByText("Não medido")).toBeNull();
  });

  it("não introduz violações automáticas de acessibilidade", async () => {
    const { container } = render(
      <LanguageProvider>
        <VisaoUniversalDeMedidas catalogo={CATALOGO} />
      </LanguageProvider>,
    );

    const resultado = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(resultado.violations).toEqual([]);
  });
});
