import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { DefinicaoDeMedida } from "../../result/analyticsProjection";
import { CatalogoDeMedidas } from "./CatalogoDeMedidas";

const BASE: DefinicaoDeMedida = {
  measure_id: "declared_pairs",
  catalog_origin: "canonical",
  metric_catalog_version: "sentinela-metric-catalog-v1",
  metric_group: "volume",
  presentation_group: "volume",
  quality_direction: "context_only",
  eligible_population: "records_with_readable_value",
  eligible_count: 80,
  denominator: 100,
  coverage: 0.8,
  availability: "available",
  detector_id: null,
  detector_contract_version: null,
  detector_owner: null,
};

afterEach(() => window.localStorage.clear());

describe("catálogo público de medidas", () => {
  it("separa famílias e mostra a cobertura calculada pelo Analytics", () => {
    window.localStorage.setItem("sentinela:language", "pt");
    render(<LanguageProvider><CatalogoDeMedidas medidas={[BASE, { ...BASE, measure_id: "vague_response", metric_group: "quality", presentation_group: "detected_quality", coverage: null, availability: "no_eligible_population" }]} /></LanguageProvider>);

    expect(screen.getByText("Volume")).toBeTruthy();
    expect(screen.getByText("Qualidade detectada")).toBeTruthy();
    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.getByText("Sem população elegível")).toBeTruthy();
  });

  it("tem cópia completa em inglês", () => {
    window.localStorage.setItem("sentinela:language", "en");
    render(<LanguageProvider><CatalogoDeMedidas medidas={[BASE]} /></LanguageProvider>);

    expect(screen.getByText("Eligible population")).toBeTruthy();
    expect(screen.getByText("View technical contract")).toBeTruthy();
  });

  it("filtra o objetivo somente pelo grupo publicado, sem persistência paralela", () => {
    window.localStorage.setItem("sentinela:language", "pt");
    render(<LanguageProvider><CatalogoDeMedidas medidas={[BASE, { ...BASE, measure_id: "pii_detected", metric_group: "safety", presentation_group: "detected_quality" }]} /></LanguageProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Risco" }));
    expect(screen.queryByText("declared_pairs")).toBeNull();
    expect(screen.getByText("pii_detected")).toBeTruthy();
    expect(window.localStorage.getItem("sentinela:analytics:goal-view")).toBeNull();
  });
});
