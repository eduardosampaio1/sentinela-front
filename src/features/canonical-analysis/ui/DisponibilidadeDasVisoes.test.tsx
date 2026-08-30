import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { DisponibilidadeDasVisoes } from "./DisponibilidadeDasVisoes";
import { VISOES_DA_ANALISE } from "./visoes";

function montar() {
  window.localStorage.setItem("sentinela:language", "en");
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <DisponibilidadeDasVisoes
          analysisId="an-123"
          estados={{ argos: "preparing", analytics: "available", review: "preparing" }}
          visoes={VISOES_DA_ANALISE}
        />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

describe("disponibilidade independente das visões", () => {
  it("abre Measures assim que Analytics fica pronto sem esconder Assessment", () => {
    montar();

    expect(screen.getByRole("link", { name: "Measures" })).toHaveAttribute(
      "href",
      "/analyses/an-123/analytics",
    );
    expect(screen.queryByRole("link", { name: "Open assessment" })).toBeNull();
    expect(screen.getByText("The assessment appears after the final result is assembled.")).toBeVisible();
    expect(screen.getByText("The measures are ready to explore and export.")).toBeVisible();
  });

  it("mantém semântica e navegação acessíveis", async () => {
    const { container } = montar();
    expect(screen.getByRole("heading", { name: "Results from this analysis" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Measures" })).toHaveClass("min-h-11");

    const resultado = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
