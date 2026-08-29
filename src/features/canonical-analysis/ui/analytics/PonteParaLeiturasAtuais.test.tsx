import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import en from "@/i18n/en.json";
import pt from "@/i18n/pt.json";
import { PonteParaLeiturasAtuais } from "./PonteParaLeiturasAtuais";

function montar(language: "pt" | "en") {
  window.localStorage.setItem("sentinela:language", language);
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <PonteParaLeiturasAtuais analysisId="analysis-123" />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe("PonteParaLeiturasAtuais", () => {
  beforeEach(() => window.localStorage.clear());

  it("recomenda Diagnóstico antes de Medidas e explica as duas rotas em PT-BR", () => {
    montar("pt");
    const nav = screen.getByRole("navigation", {
      name: pt.canonicalAnalysis.result.currentViews.title,
    });
    const links = within(nav).getAllByRole("link");

    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/analyses/analysis-123/argos");
    expect(links[1]).toHaveAttribute("href", "/analyses/analysis-123/analytics");
    expect(within(links[0]).getByText(pt.canonicalAnalysis.result.currentViews.recommended)).toBeTruthy();
    expect(within(links[0]).getByText(pt.canonicalAnalysis.result.currentViews.argosDescription)).toBeTruthy();
    expect(within(links[1]).getByText(pt.canonicalAnalysis.result.currentViews.analyticsDescription)).toBeTruthy();
  });

  it("mantém a mesma orientação em inglês", () => {
    montar("en");
    expect(screen.getByRole("heading", { name: en.canonicalAnalysis.result.currentViews.title })).toBeTruthy();
    expect(screen.getByText(en.canonicalAnalysis.result.currentViews.argosDescription)).toBeTruthy();
    expect(screen.getByText(en.canonicalAnalysis.result.currentViews.analyticsDescription)).toBeTruthy();
  });

  it("usa Motion sem reflow e oferece desligamento para movimento reduzido", () => {
    const { container } = montar("pt");
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("motion-safe:duration-300");
    expect(nav?.className).toContain("motion-reduce:animate-none");
    expect(nav?.className).not.toMatch(/animate-(width|height|top|left)/);
  });
});
