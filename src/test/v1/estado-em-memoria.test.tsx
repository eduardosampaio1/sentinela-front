// Prova 4 — logout e troca de workspace removem o estado EM MEMÓRIA.
//
// Preparação local do Big Bang. Nada aqui ativa nada.
//
// Com o resultado vivendo só em memória, a pergunta muda: não basta que nada seja gravado, é
// preciso que o que está na memória SUMA quando a sessão ou o tenant muda. Um resultado do
// workspace A visível depois de trocar para o B é vazamento entre tenants — pior que cache.

import { type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `useAuth` é a fonte do workspace ativo. O mock é mutável para simular logout (workspace
// ausente) e troca de tenant (workspace diferente) sem tocar na cadeia real de autenticação.
let workspaceAtual: { id: string } | null = { id: "ws-A" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ workspace: workspaceAtual }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

// A listagem canônica responde "existe análise" para qualquer workspace: assim, se algum
// resultado sobrevivesse à troca, não seria por falta de resposta do backend.
const listar = vi.fn(async () => ({ items: [{ analysis_id: "an-1" }], next_cursor: null }));
vi.mock("@/lib/v1/defaultClient", () => ({ getV1Client: () => ({ list: listar }) }));

const { AnalysisProvider, useAnalysis } = await import("@/contexts/AnalysisContext");

function Sonda() {
  const { result, hasHistory } = useAnalysis();
  return (
    <div>
      <span data-testid="resultado">{result ? "COM-RESULTADO" : "SEM-RESULTADO"}</span>
      <span data-testid="historico">{hasHistory ? "COM-HISTORICO" : "SEM-HISTORICO"}</span>
    </div>
  );
}

function montar(): ReturnType<typeof render> {
  return render(
    <AnalysisProvider>
      <Sonda />
    </AnalysisProvider> as ReactNode,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  workspaceAtual = { id: "ws-A" };
  listar.mockClear();
});

describe("prova 4 — logout e troca de workspace limpam o estado em memória", () => {
  it("sem workspace (logout) o resultado é nulo", async () => {
    workspaceAtual = null;
    const { unmount } = montar();
    expect(screen.getByTestId("resultado").textContent).toBe("SEM-RESULTADO");
    unmount();
  });

  it("trocar de workspace NÃO carrega resultado do anterior", async () => {
    const primeira = montar();
    expect(screen.getByTestId("resultado").textContent).toBe("SEM-RESULTADO");
    primeira.unmount();

    // Mesmo com o storage carregado à mão com a forma ANTIGA do cache, a troca não restaura
    // nada: o leitor não existe mais. É a prova de que a limpeza não depende só do escritor
    // ter sumido.
    window.sessionStorage.setItem(
      "sentinela:analysis:antigo",
      JSON.stringify({ consistency_score: 99, alerts: [] }),
    );
    window.sessionStorage.setItem("sentinela:last_cache_key:ws-B:none:none", "sentinela:analysis:antigo");

    workspaceAtual = { id: "ws-B" };
    const segunda = montar();
    expect(screen.getByTestId("resultado").textContent).toBe("SEM-RESULTADO");
    segunda.unmount();
  });

  it("a flag de histórico do workspace A não vale para o B", async () => {
    // A flag é por workspace. Se valesse global, o B herdaria "já tem análise" do A — e a
    // navegação liberaria uma tela sem base para ela.
    window.localStorage.setItem("sentinela:history:ws-A", "1");

    workspaceAtual = { id: "ws-B" };
    const { unmount } = montar();
    expect(screen.getByTestId("historico").textContent).toBe("SEM-HISTORICO");
    unmount();
  });

  it("a flag do PRÓPRIO workspace é lida — senão o teste acima passa por engano", async () => {
    // Contraste obrigatório: sem ele, um provider que ignora a flag inteira passaria no teste
    // anterior sem provar isolamento nenhum.
    window.localStorage.setItem("sentinela:history:ws-A", "1");

    workspaceAtual = { id: "ws-A" };
    const { unmount } = montar();
    expect(screen.getByTestId("historico").textContent).toBe("COM-HISTORICO");
    unmount();
  });
});
