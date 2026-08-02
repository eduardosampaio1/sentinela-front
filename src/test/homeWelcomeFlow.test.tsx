import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomeWelcomePage from "@/pages/HomeWelcomePage";

/**
 * Lote 4A/2 — `HomeWelcomePage`.
 *
 * Esta tela **não é alcançável pelo app**: o `router.tsx` manda `/home/welcome` para a
 * `LaunchpadPage`, e o único import de `HomeWelcomePage` fora dela mesma é este arquivo, que
 * declara a rota por conta própria. Ela não foi removida aqui — remoção tem lote próprio, e a
 * regra do programa é não apagar sem prova de desuso registrada.
 *
 * O que mudou foi a chamada ao Supabase que ela fazia. `hasUserAnalysisRuns(user.id)` gravava
 * num estado que o componente **descartava** (`const [, setHasRuns]`): o valor nunca era lido,
 * nunca decidia nada, nunca chegava à tela. Era um acesso a `analysis_runs` que custava uma
 * requisição e não produzia informação.
 *
 * A asserção anterior — `expect(hasUserAnalysisRunsMock).toHaveBeenCalled()` — protegia
 * exatamente esse defeito. Trocá-la pela oposta não é enfraquecer o teste: é corrigir o que ele
 * guardava. O mock continua registrado justamente para que a ausência da chamada seja
 * **observada**, e não presumida.
 */

const hasUserAnalysisRunsMock = vi.fn();

let authState: Record<string, unknown> = {};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/analysisRuns", () => ({
  hasUserAnalysisRuns: (...args: unknown[]) => hasUserAnalysisRunsMock(...args),
}));

describe("home welcome first-access flow", () => {
  beforeEach(() => {
    hasUserAnalysisRunsMock.mockReset().mockResolvedValue(false);
    authState = {
      user: { id: "u-1", email: "first@user.com" },
      signOut: vi.fn(),
    };
  });

  it("shows only first-access decision actions", async () => {
    render(
      <MemoryRouter initialEntries={["/home/welcome"]}>
        <Routes>
          <Route path="/home/welcome" element={<HomeWelcomePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Your first analysis: Quick Scan or Deep Analysis?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quick Scan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deep Analysis" })).toBeInTheDocument();
    expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("System")).not.toBeInTheDocument();
    expect(screen.queryByText("Environment")).not.toBeInTheDocument();
  });

  it("NÃO consulta o Supabase — a chamada existia e o resultado era descartado", async () => {
    render(
      <MemoryRouter initialEntries={["/home/welcome"]}>
        <Routes>
          <Route path="/home/welcome" element={<HomeWelcomePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("button", { name: "Quick Scan" });
    // O efeito rodava no `useEffect`; esperar a tela pintar dá a ele a chance de disparar.
    await waitFor(() => expect(hasUserAnalysisRunsMock).not.toHaveBeenCalled());
  });
});
