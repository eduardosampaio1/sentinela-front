import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * AuthContext workspace-only: `/v1/me` é a ÚNICA autoridade de membership.
 *
 * O que estes casos protegem é uma assimetria: pedir um workspace nunca é prova de pertencer a
 * ele. A verificação acontece SEMPRE contra a projeção do Gateway, nunca contra o pedido — nem
 * quando o pedido vem de `localStorage`, nem quando vem da URL.
 *
 * Por isso o mock de `/v1/me` devolve uma lista fechada e os casos tentam sair dela por todos os
 * caminhos disponíveis. Um `switchWorkspace` que aceitasse o id pedido passaria no caso feliz e
 * falharia aqui — que é exatamente onde a falha importa.
 */

const meMock = vi.fn();
vi.mock("@/lib/v1/defaultClient", () => ({ getV1Client: () => ({ me: meMock }) }));

const signOutMock = vi.fn(async () => {});
let sessaoInicial: unknown = null;

// Ouvintes REAIS do provider: sem eles, a troca de usuario nunca acontece no teste, e o race
// entre a projecao antiga e a nova fica fora de alcance. Foi exatamente esse buraco que deixou
// o vazamento de membership passar despercebido.
let ouvintes: ((s: unknown) => void)[] = [];
function emitirSessao(s: unknown) {
  sessaoInicial = s;
  for (const cb of ouvintes) cb(s);
}

vi.mock("@/lib/auth/index", () => ({
  getAuthClient: () => ({
    getSession: async () => sessaoInicial,
    onAuthStateChange: (cb: (s: unknown) => void) => {
      ouvintes.push(cb);
      return () => {
        ouvintes = ouvintes.filter((x) => x !== cb);
      };
    },
    signOut: signOutMock,
  }),
}));
vi.mock("@/lib/auth/e2eBridge", () => ({ readE2EInjection: () => null }));

const { AuthProvider, useAuth, escolherWorkspace } = await import("./AuthContext");

const WS_A = { id: "ws-a", name: "Alpha", role: "owner" as const };
const WS_B = { id: "ws-b", name: "Beta", role: "member" as const };

function Sonda() {
  const { workspace, memberships, membershipsLoading, membershipsError, switchWorkspace, user } =
    useAuth();
  return (
    <div>
      <p data-testid="user">{user ? "autenticado" : "anonimo"}</p>
      <p data-testid="estado">
        {membershipsLoading ? "carregando" : membershipsError ? "erro" : "pronto"}
      </p>
      <p data-testid="ativo">{workspace?.id ?? "nenhum"}</p>
      <p data-testid="lista">{memberships.map((m) => m.id).join(",") || "vazia"}</p>
      <button onClick={() => switchWorkspace("ws-b")}>trocar-permitido</button>
      <button onClick={() => switchWorkspace("ws-intruso")}>trocar-proibido</button>
    </div>
  );
}

function montar() {
  return render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>,
  );
}

beforeEach(() => {
  ouvintes = [];
  meMock.mockReset();
  signOutMock.mockClear();
  window.localStorage.clear();
  sessaoInicial = { user: { id: "u1", email: "a@b.c" }, accessToken: "tok" };
});

afterEach(() => vi.restoreAllMocks());

describe("AuthContext — memberships de /v1/me", () => {
  it("as memberships permitidas vêm de /v1/me", async () => {
    meMock.mockResolvedValue({ user: { id: "u1" }, workspaces: [WS_A, WS_B], capabilities: {} });
    montar();
    await waitFor(() => expect(screen.getByTestId("lista")).toHaveTextContent("ws-a,ws-b"));
    expect(screen.getByTestId("ativo")).toHaveTextContent("ws-a");
  });

  it("switchWorkspace PERMITIDO troca o workspace ativo", async () => {
    meMock.mockResolvedValue({ user: { id: "u1" }, workspaces: [WS_A, WS_B], capabilities: {} });
    montar();
    await waitFor(() => expect(screen.getByTestId("ativo")).toHaveTextContent("ws-a"));
    await userEvent.click(screen.getByText("trocar-permitido"));
    await waitFor(() => expect(screen.getByTestId("ativo")).toHaveTextContent("ws-b"));
  });

  it("switchWorkspace NÃO permitido falha fechado: nada muda", async () => {
    meMock.mockResolvedValue({ user: { id: "u1" }, workspaces: [WS_A], capabilities: {} });
    montar();
    await waitFor(() => expect(screen.getByTestId("ativo")).toHaveTextContent("ws-a"));
    await userEvent.click(screen.getByText("trocar-proibido"));
    // Nem troca, nem limpa: o pedido é simplesmente descartado.
    expect(screen.getByTestId("ativo")).toHaveTextContent("ws-a");
    expect(screen.getByTestId("lista")).toHaveTextContent("ws-a");
  });

  it("preferência salva SUGERE a seleção quando está na projeção", async () => {
    window.localStorage.setItem("sentinela:workspace", "ws-b");
    meMock.mockResolvedValue({ user: { id: "u1" }, workspaces: [WS_A, WS_B], capabilities: {} });
    montar();
    await waitFor(() => expect(screen.getByTestId("ativo")).toHaveTextContent("ws-b"));
  });

  it("preferência salva NÃO concede acesso quando está fora da projeção", async () => {
    // Este é o caso que separa "sugerir" de "autorizar". O storage é do usuário, editável, e não
    // pode virar credencial: o id desconhecido é DESCARTADO e cai no primeiro permitido.
    window.localStorage.setItem("sentinela:workspace", "ws-de-outro-usuario");
    meMock.mockResolvedValue({ user: { id: "u1" }, workspaces: [WS_A], capabilities: {} });
    montar();
    await waitFor(() => expect(screen.getByTestId("ativo")).toHaveTextContent("ws-a"));
    expect(screen.getByTestId("ativo")).not.toHaveTextContent("ws-de-outro-usuario");
  });

  it("sem token não há usuário nem memberships", async () => {
    sessaoInicial = null;
    montar();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("anonimo"));
    expect(screen.getByTestId("lista")).toHaveTextContent("vazia");
    expect(screen.getByTestId("ativo")).toHaveTextContent("nenhum");
    // Sem sessão o contexto não pergunta ao Gateway: não há o que projetar.
    expect(meMock).not.toHaveBeenCalled();
  });

  it("autenticado sem nenhuma membership: estado explícito sem acesso", async () => {
    meMock.mockResolvedValue({ user: { id: "u1" }, workspaces: [], capabilities: {} });
    montar();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("pronto"));
    expect(screen.getByTestId("user")).toHaveTextContent("autenticado");
    expect(screen.getByTestId("ativo")).toHaveTextContent("nenhum");
  });

  it("401/erro na projeção é ERRO, não 'usuário sem workspaces'", async () => {
    // Colapsar os dois esconderia indisponibilidade atrás de uma afirmação sobre a conta.
    meMock.mockRejectedValue(Object.assign(new Error("unauthorized"), { status: 401 }));
    montar();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("erro"));
    expect(screen.getByTestId("ativo")).toHaveTextContent("nenhum");
  });
});

describe("AuthContext — troca de usuário não vaza membership", () => {
  it("membership de A some ANTES de a projeção de B chegar", async () => {
    // Achado de review (Alta): `session/user` mudavam na hora, mas `memberships`/`workspaceId`
    // so eram substituidos quando `/v1/me` de B respondia. Na janela entre as duas coisas, o
    // contexto afirmava `user = B` com `workspace = ws-a` — e um consumidor podia emitir uma
    // chamada com o token de B carregando o workspace de A.
    //
    // A prova precisa de uma projecao de B que DEMORA: com resposta imediata, a janela some e o
    // teste passaria mesmo com o defeito presente.
    meMock.mockResolvedValueOnce({ user: { id: "u1" }, workspaces: [WS_A], capabilities: {} });
    montar();
    await waitFor(() => expect(screen.getByTestId("ativo")).toHaveTextContent("ws-a"));

    let liberar!: (v: unknown) => void;
    meMock.mockReturnValueOnce(new Promise((res) => { liberar = res; }));
    emitirSessao({ user: { id: "u2", email: "b@b.c" }, accessToken: "tok-b" });

    // Janela: usuario ja e B. O workspace de A NAO pode continuar ativo aqui.
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("carregando"));
    expect(screen.getByTestId("ativo"), "workspace de A vazou para a sessao de B").toHaveTextContent("nenhum");
    expect(screen.getByTestId("lista"), "memberships de A vazaram para B").toHaveTextContent("vazia");

    liberar({ user: { id: "u2" }, workspaces: [WS_B], capabilities: {} });
    await waitFor(() => expect(screen.getByTestId("ativo")).toHaveTextContent("ws-b"));
  });

  it("logout limpa memberships e workspace ativo", async () => {
    meMock.mockResolvedValue({ user: { id: "u1" }, workspaces: [WS_A], capabilities: {} });
    montar();
    await waitFor(() => expect(screen.getByTestId("ativo")).toHaveTextContent("ws-a"));

    emitirSessao(null);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("anonimo"));
    expect(screen.getByTestId("ativo")).toHaveTextContent("nenhum");
    expect(screen.getByTestId("lista")).toHaveTextContent("vazia");
  });
});

describe("escolherWorkspace — fail-closed por construção", () => {
  it("id fora da projeção nunca vira workspace ativo", () => {
    expect(escolherWorkspace([WS_A], "ws-intruso")?.id).toBe("ws-a");
    expect(escolherWorkspace([], "ws-intruso")).toBeNull();
  });

  it("sem preferência, usa o primeiro permitido", () => {
    expect(escolherWorkspace([WS_A, WS_B], null)?.id).toBe("ws-a");
  });
});
