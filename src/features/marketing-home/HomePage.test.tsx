import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicExperiencePage } from "../public-experience/PublicExperiencePage";
import axe from "axe-core";

describe("Sentinela portfolio home", () => {
  it("has no structural accessibility violations", async () => {
    const { container } = render(<PublicExperiencePage />);
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
  beforeEach(() => {
    localStorage.setItem("sentinela.public.locale", "pt-BR");
    vi.stubEnv("VITE_WEBSUMMIT_API_URL", "");
  });
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("introduces all three products and an assessment entry, with working destinations", () => {
    render(<PublicExperiencePage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    for (const name of ["AI Observability", "AI Control", "Brand Radar"]) {
      expect(
        screen.getByRole("link", {
          name: new RegExp(`0[123].*${name}`),
        }),
      ).toHaveAttribute("href", expect.stringMatching(/^#/));
      expect(screen.getByRole("button", { name: `Conversar sobre ${name}` })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("link", { name: "Criar minha conta" }),
    ).toHaveAttribute("href", "/register");
    expect(screen.getByRole("button", { name: /Conversar sobre o AI Assessment/ })).toBeInTheDocument();
    expect(screen.queryByText("by Sentinela")).not.toBeInTheDocument();
    expect(screen.getAllByText(/REPRESENTAÇÃO ILUSTRATIVA/)).toHaveLength(3);
  });

  it("switches the whole home to English and back, including metadata", () => {
    render(<PublicExperiencePage />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to English" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "KNOW WHAT",
    );
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toContain("Understand, control");
    expect(
      screen.getByRole("link", { name: "Create my account" }),
    ).toHaveAttribute("href", "/register");
    fireEvent.click(
      screen.getByRole("button", { name: "Mudar para português" }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "SAIBA O QUE",
    );
  });

  it("runs the illustrative risky request and shows its trace without inventing measured results", async () => {
    render(<PublicExperiencePage />);
    fireEvent.click(screen.getByRole("button", { name: /Ignore as regras/ }));
    expect(screen.getByRole("button", { name: /Analisando/ })).toBeDisabled();
    await screen.findByText(/Uma resposta confiante seria o resultado errado/);
    expect(screen.getByText("O CAMINHO DA DECISÃO")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Demonstração ilustrativa/).length,
    ).toBeGreaterThan(0);
  });

  it("does not display a stale result after a language change during analysis", async () => {
    vi.useFakeTimers();
    try {
      render(<PublicExperiencePage />);
      fireEvent.click(screen.getByRole("button", { name: /Olá, preciso/ }));
      fireEvent.click(
        screen.getByRole("button", { name: "Switch to English" }),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(
        screen.queryByText("O CAMINHO DA DECISÃO"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("THE DECISION PATH")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("makes both comparison states available with buttons", async () => {
    render(<PublicExperiencePage />);
    fireEvent.click(
      screen.getByRole("button", { name: "SEM UMA CAMADA DE CONTROLE" }),
    );
    expect(screen.getByText("O modelo é a rota padrão")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "SEM UMA CAMADA DE CONTROLE" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "COM AI CONTROL" }));
    await waitFor(() =>
      expect(
        screen.getByText("A necessidade de IA é avaliada"),
      ).toBeInTheDocument(),
    );
  });
});
