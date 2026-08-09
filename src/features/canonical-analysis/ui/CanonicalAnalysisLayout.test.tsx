import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O portão da jornada canônica responde a DUAS perguntas, e confundi-las produz a mensagem
 * errada para o usuário.
 *
 *   flag local  → este build quer a jornada
 *   capability  → o Gateway montou `/v1/analyses` NESTE ambiente
 *
 * Achado de review cruzado (Média): só a flag era consultada. Com ela ligada e
 * `SENTINELA_PUBLIC_API_V1_ENABLED` desligado no backend, a rota nem existe; o 404 do FastAPI
 * chega ao cliente e vira `forbidden_or_not_found`. O usuário lia "não existe ou não é seu"
 * quando a causa era configuração do ambiente.
 */

const flagMock = vi.fn();
vi.mock("../flag", () => ({ isCanonicalAnalysisEnabled: () => flagMock() }));

const authMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock() }));

const { CanonicalAnalysisLayout } = await import("./CanonicalAnalysisLayout");

function montar() {
  return render(
    <MemoryRouter initialEntries={["/analyses/new"]}>
      <Routes>
        <Route path="/" element={<CanonicalAnalysisLayout />}>
          <Route path="analyses/new" element={<p>jornada</p>} />
        </Route>
        <Route path="/home" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  flagMock.mockReset().mockReturnValue(true);
  authMock.mockReset().mockReturnValue({
    capabilities: { canonical_analysis_enabled: true },
    membershipsLoading: false,
  });
});

describe("portão da jornada canônica", () => {
  it("flag ON + capability ON abre a jornada", () => {
    montar();
    expect(screen.getByText("jornada")).not.toBeNull();
  });

  it("flag OFF fecha, mesmo com a capability ligada", () => {
    flagMock.mockReturnValue(false);
    montar();
    expect(screen.getByText("home")).not.toBeNull();
  });

  it("capability OFF fecha a jornada em vez de deixar a chamada tomar 404", () => {
    // O caso do achado: sem isto, a tela abriria e a primeira chamada devolveria um erro que a
    // UI apresenta como problema de permissão do usuário.
    authMock.mockReturnValue({
      capabilities: { canonical_analysis_enabled: false },
      membershipsLoading: false,
    });
    montar();
    expect(screen.getByText("home")).not.toBeNull();
  });

  it("capability AINDA NÃO projetada não é lida como desligada", () => {
    // `null` é ausência de resposta, não negativa. Tratar as duas como a mesma coisa fecharia
    // a jornada durante o carregamento normal de `/v1/me` — a cada navegação.
    authMock.mockReturnValue({ capabilities: null, membershipsLoading: true });
    const { container } = montar();
    expect(screen.queryByText("home")).toBeNull();
    expect(screen.queryByText("jornada")).toBeNull();
    expect(container.textContent).toBe("");
  });
});
