import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `hasHistory` vem do backend canônico — e a chamada precisa EXISTIR de verdade.
 *
 * ## Por que este arquivo existe
 *
 * A primeira versão chamava `getV1Client().analyses.list(...)`. O cliente `/v1` é PLANO: o método
 * é `list(...)`, sem o nível `analyses`. Em runtime isso é um `TypeError` — e o efeito o engolia,
 * porque o `.catch()` existe para não travar a navegação quando a rede falha. Resultado: histórico
 * silenciosamente sempre vazio, sem erro visível, sem teste vermelho.
 *
 * O typechecker da camada legada pegou. Nenhum teste pegaria, porque nenhum olhava a chamada.
 * Estes casos olham: um afirma o método e os argumentos exatos; o outro afirma que falha de rede
 * não é lida como "não tem histórico".
 */

const listMock = vi.fn();

vi.mock("@/lib/v1/defaultClient", () => ({
  getV1Client: () => ({ list: listMock }),
}));

const AUTH = { user: { id: "u1" }, workspace: { id: "ws-1" }, project: null, environment: null };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => AUTH }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const { AnalysisProvider, useAnalysis } = await import("./AnalysisContext");

function Sonda() {
  const { hasHistory, historyResolved } = useAnalysis();
  return (
    <p data-testid="sonda">
      {historyResolved ? "resolvido" : "pendente"}:{hasHistory ? "tem" : "nao-tem"}
    </p>
  );
}

function montar() {
  return render(
    <AnalysisProvider>
      <Sonda />
    </AnalysisProvider>,
  );
}

beforeEach(() => {
  listMock.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AnalysisContext — sonda de histórico", () => {
  it("chama `list` do cliente /v1 com o workspace autenticado e limite 1", async () => {
    listMock.mockResolvedValue({ items: [{ analysis_id: "an-1" }], next_cursor: null });
    montar();

    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    // O ARGUMENTO exato é a prova: `.analyses.list` teria estourado antes de chegar aqui, e
    // `limit` maior traria payload que ninguém usa.
    expect(listMock).toHaveBeenCalledWith({ workspaceId: "ws-1", limit: 1 });
    await waitFor(() => expect(screen.getByTestId("sonda")).toHaveTextContent("resolvido:tem"));
  });

  it("lista vazia significa sem histórico", async () => {
    listMock.mockResolvedValue({ items: [], next_cursor: null });
    montar();
    await waitFor(() => expect(screen.getByTestId("sonda")).toHaveTextContent("resolvido:nao-tem"));
  });

  it("falha da chamada não vira 'tem histórico' nem trava a navegação", async () => {
    // O `.catch()` existe para a navegação não ficar presa. O que ele NÃO pode fazer é inventar
    // uma resposta: `historyResolved` fica verdadeiro (a tela segue), `hasHistory` não é afirmado.
    vi.spyOn(console, "error").mockImplementation(() => {});
    listMock.mockRejectedValue(new Error("rede fora"));
    montar();
    await waitFor(() => expect(screen.getByTestId("sonda")).toHaveTextContent("resolvido:nao-tem"));
  });

  it("não usa o eixo project/environment no escopo da chamada", async () => {
    listMock.mockResolvedValue({ items: [], next_cursor: null });
    montar();
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    const [params] = listMock.mock.calls[0] as [Record<string, unknown>];
    expect(params).not.toHaveProperty("projectId");
    expect(params).not.toHaveProperty("environmentId");
  });
});

describe("AnalysisContext — a resposta do backend manda", () => {
  it("lista vazia APAGA a flag local de histórico", async () => {
    // Achado de review (Média): o `else if (!localFlag ...)` deixava a flag de `localStorage`
    // sobreviver a um backend que diz "nenhuma análise". `analysisCompleted` ficava verdadeiro e
    // `/dashboard` liberado sem histórico real — estado local mandando mais que o backend.
    window.localStorage.setItem("sentinela:history:ws-1", "1");
    listMock.mockResolvedValue({ items: [], next_cursor: null });
    montar();

    await waitFor(() => expect(screen.getByTestId("sonda")).toHaveTextContent("resolvido:nao-tem"));
    expect(window.localStorage.getItem("sentinela:history:ws-1")).toBeNull();
  });
});
