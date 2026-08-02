import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RecommendationCard } from "./RecommendationCard";
import type { RecommendationModel } from "@/domain/verdict.types";

/**
 * Re-run: da dashboard legada para a jornada canônica.
 *
 * O caminho inline (`/api/analyze`) exige `project_id` + `environment_id` — o Gateway recusa sem
 * os três. Esse eixo deixa de existir quando a identidade vira workspace-only, e dar a ele uma
 * fonte própria seria persistência paralela sem dono.
 *
 * Este teste monta o componente com um router REAL e navega de verdade. A prova que importa não é
 * "chamou navigate": é que o clique chega à rota canônica, e que o componente não depende mais do
 * `useAnalysis` — se dependesse, ele quebraria fora do `AnalysisProvider`, e é exatamente por não
 * envolvê-lo aqui que o teste tem dentes.
 */

const RECOMENDACAO: RecommendationModel = {
  id: "r1",
  title: "Revisar intenções sem cobertura",
  description: null,
  escalated: false,
  secondaryCtaLabel: "Re-run",
} as RecommendationModel;

function montar() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<RecommendationCard recommendation={RECOMENDACAO} />} />
        <Route path="/canonical/analyses/new" element={<p>entrada canônica</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RecommendationCard — Re-run", () => {
  it("monta SEM AnalysisProvider", () => {
    // Cadeado de desacoplamento: enquanto o componente consumisse `useAnalysis`, este render
    // lançaria. Verde aqui = a dashboard legada não arrasta mais o contexto de análise só para
    // oferecer um botão de reexecutar.
    expect(() => montar()).not.toThrow();
  });

  it("o clique chega à rota canônica", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Re-run" }));
    expect(await screen.findByText("entrada canônica")).toBeInTheDocument();
  });

  it("não reexecuta inline: nenhuma requisição sai do clique", async () => {
    // O ponto da decisão de produto. Se alguém reintroduzir `runAnalysis` aqui, o fetch é
    // chamado e este caso falha — mesmo que a navegação continue funcionando.
    const chamadas: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (entrada: RequestInfo | URL) => {
      chamadas.push(String(entrada));
      throw new Error("nenhuma rede deveria sair daqui");
    }) as typeof fetch;
    try {
      montar();
      await userEvent.click(screen.getByRole("button", { name: "Re-run" }));
      expect(chamadas).toEqual([]);
    } finally {
      globalThis.fetch = original;
    }
  });
});
