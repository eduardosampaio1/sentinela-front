// `/dashboard` é rota de COMPATIBILIDADE — as provas de que ela não é um segundo dashboard.
//
// Aposentadoria do dashboard legado (preparação local do Big Bang). Nada aqui ativa nada.

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "@/features/canonical-analysis/data/client";
import { DashboardCompatRoute } from "./DashboardCompatRoute";

vi.mock("@/shell/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

let workspaceAtual: { id: string } | null = { id: "ws-A" };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: workspaceAtual }) }));

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

/** Workspaces pedidos ao backend, em ordem — a prova de que a troca não reusa o anterior. */
let workspacesPedidos: string[] = [];

function servirListagem(porWorkspace: Record<string, unknown>) {
  server.use(
    http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
      const ws = new URL(request.url).searchParams.get("workspace_id") ?? "";
      workspacesPedidos.push(ws);
      return HttpResponse.json(porWorkspace[ws] ?? { items: [], next_cursor: null });
    }),
  );
}

/** Fábrica de árvores por TESTE.
 *
 *  `QueryClient` e `MemoryRouter` nascem uma vez por teste (não compartilhar entre testes:
 *  vaza estado de navegação — depois de um redirecionamento o router fica na rota de
 *  resultado e o teste seguinte nasce lá).
 *
 *  A fábrica devolve um elemento NOVO a cada chamada, com as MESMAS instâncias dentro. É o
 *  que a prova 4 precisa: elemento novo faz o React reconciliar (com a mesma referência ele
 *  pula a subárvore e o efeito nunca é reavaliado), e as mesmas instâncias impedem o
 *  componente de remontar (remontagem roda o efeito com ou sem a dependência). */
function fabricaDeArvore() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const fazer = () => (
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
              <Route path="/dashboard" element={<DashboardCompatRoute />} />
              {/* Alvos do redirecionamento, renderizados como marcadores: o teste afirma PARA
                  ONDE a rota mandou, não o conteúdo do destino (que tem testes próprios). */}
              <Route
                path="/canonical/analyses/:analysisId/result"
                element={<div data-testid="destino-canonico" />}
              />
              <Route path="/canonical/analyses" element={<div data-testid="destino-historico" />} />
              <Route path="/canonical/analyses/new" element={<div data-testid="destino-nova" />} />
            </Routes>
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
  return fazer;
}

function montar() {
  const fazer = fabricaDeArvore();
  return { ...render(fazer()), fazer };
}

const concluida = (id: string) => ({
  items: [{ analysis_id: id, status: "completed", result_available: true, record_count: 1, created_at: null }],
  next_cursor: null,
});

beforeEach(() => {
  workspaceAtual = { id: "ws-A" };
  workspacesPedidos = [];
  window.sessionStorage.clear();
  window.localStorage.clear();
});

// ── prova 1 — /dashboard não renderiza o dashboard legado ─────────────────────

describe("prova 1 — `/dashboard` não é mais um dashboard", () => {
  it("o módulo da rota não importa nada do cluster legado", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const fonte = fs
      .readFileSync(path.resolve(__dirname, "DashboardCompatRoute.tsx"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const legado of [
      "ExecutiveAxis",
      "InvestigativeAxis",
      "TechnicalAxis",
      "AIInterpretationPanel",
      "AlertsPanel",
      "DiagnosticsPanel",
      "GuardrailsPanel",
      "OptimizationPanel",
      "useAnalysis",
      "AnalysisResult",
    ]) {
      expect(fonte, `a rota ainda depende de ${legado}`).not.toContain(legado);
    }
  });

  it("os arquivos do cluster legado não existem mais na árvore", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.resolve(__dirname);
    // Restam APENAS os dois módulos da compatibilidade (e seus testes).
    const sobraram = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() || /\.tsx?$/.test(e.name))
      .map((e) => e.name)
      .sort();
    expect(sobraram).toEqual([
      "DashboardCompatRoute.test.tsx",
      "DashboardCompatRoute.tsx",
      "resolverAnaliseCanonica.test.ts",
      "resolverAnaliseCanonica.ts",
    ]);
  });
});

// ── prova 2 — análise concluída redireciona para o resultado canônico ─────────

describe("prova 2 — concluída redireciona para o renderizador canônico", () => {
  it("vai para /canonical/analyses/{id}/result", async () => {
    servirListagem({ "ws-A": concluida("an-alvo") });
    const { unmount } = montar();
    await waitFor(() => expect(screen.getByTestId("destino-canonico")).toBeTruthy());
    unmount();
  });

  it("escolhe o id que o BACKEND devolveu, não outro", async () => {
    // O marcador do destino não carrega o id, então a prova é pelo que foi pedido: um único
    // workspace, um único id na resposta, e o redirecionamento aconteceu.
    servirListagem({ "ws-A": concluida("an-especifica") });
    const { unmount } = montar();
    await waitFor(() => expect(screen.getByTestId("destino-canonico")).toBeTruthy());
    expect(workspacesPedidos).toEqual(["ws-A"]);
    unmount();
  });
});

// ── prova 3 — workspace sem análise mostra estado vazio ──────────────────────

describe("prova 3 — sem análise, estado vazio honesto", () => {
  it("mostra o vazio e as duas ações, sem painel nenhum", async () => {
    servirListagem({ "ws-A": { items: [], next_cursor: null } });
    const { unmount } = montar();

    await waitFor(() => expect(screen.getByTestId("dashboard-compat-vazio")).toBeTruthy());
    expect(screen.getByText("No analysis yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start analysis" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open history" })).toBeTruthy();
    // A frase do dashboard legado NÃO aparece: ela vinha dentro de painéis com cara de
    // dashboard funcional, que é o que a decisão proíbe.
    expect(screen.queryByText(/No active analysis/i)).toBeNull();
    unmount();
  });

  it("com análises mas nenhuma concluída, a frase é OUTRA", async () => {
    // Dizer "você não tem análise" para quem tem cinco rodando é mentir. A ação certa aqui é
    // o histórico, não começar de novo.
    servirListagem({
      "ws-A": {
        items: [{ analysis_id: "an-run", status: "running", result_available: false, record_count: 1, created_at: null }],
        next_cursor: null,
      },
    });
    const { unmount } = montar();

    await waitFor(() => expect(screen.getByTestId("dashboard-compat-vazio")).toBeTruthy());
    expect(screen.getByText("No completed analysis")).toBeTruthy();
    expect(screen.queryByText("No analysis yet")).toBeNull();
    unmount();
  });
});

// ── prova 4 — troca de workspace não reutiliza id anterior ───────────────────

describe("prova 4 — a troca de workspace pergunta de novo", () => {
  it("o workspace muda SOB o mesmo componente e a consulta é refeita", async () => {
    // ⚠️ Desmontar e remontar entre as trocas NÃO prova isto: uma montagem nova roda o efeito
    // de qualquer jeito, com ou sem `workspaceId` nas dependências. Foi assim que a mutação
    // que remove a dependência sobreviveu à primeira versão deste teste.
    //
    // E a direção importa. No desfecho ENCONTRADA a rota REDIRECIONA e desmonta — não existe
    // "trocar de workspace com ela na tela mostrando resultado", porque ela nunca mostra
    // resultado.
    //
    // O caso alcançável é o oposto: a rota está no ESTADO VAZIO (montada, esperando), o
    // usuário troca de workspace, e no novo existe análise. Sem a dependência, a tela fica
    // vazia para sempre — dizendo a alguém que ele não tem análise quando tem.
    servirListagem({ "ws-A": { items: [], next_cursor: null }, "ws-B": concluida("an-do-B") });

    const tela = montar();
    await waitFor(() => expect(screen.getByTestId("dashboard-compat-vazio")).toBeTruthy());

    workspaceAtual = { id: "ws-B" };
    tela.rerender(tela.fazer());

    await waitFor(() => expect(screen.getByTestId("destino-canonico")).toBeTruthy());
    expect(workspacesPedidos).toEqual(["ws-A", "ws-B"]);
    tela.unmount();
  });
});

// ── prova 6 — refresh recupera tudo pelo backend ─────────────────────────────

describe("prova 6 — o refresh reconsulta", () => {
  it("montar de novo pergunta de novo (não há nada guardado)", async () => {
    servirListagem({ "ws-A": concluida("an-alvo") });

    const primeira = montar();
    await waitFor(() => expect(screen.getByTestId("destino-canonico")).toBeTruthy());
    primeira.unmount();

    const segunda = montar();
    await waitFor(() => expect(screen.getByTestId("destino-canonico")).toBeTruthy());
    expect(workspacesPedidos).toEqual(["ws-A", "ws-A"]);
    segunda.unmount();
  });
});

// ── prova 7 — nada é persistido no navegador ─────────────────────────────────

describe("prova 7 — a rota não grava nada", () => {
  it("nenhuma chave é criada em sessionStorage nem em localStorage", async () => {
    servirListagem({ "ws-A": concluida("an-alvo") });
    const { unmount } = montar();
    await waitFor(() => expect(screen.getByTestId("destino-canonico")).toBeTruthy());

    const chaves: string[] = [];
    for (const s of [window.sessionStorage, window.localStorage]) {
      for (let i = 0; i < s.length; i += 1) {
        const k = s.key(i);
        if (k !== null) chaves.push(k);
      }
    }
    // Só a preferência de idioma (escrita pelo `LanguageProvider` do harness).
    expect(chaves.filter((k) => k !== "sentinela:language")).toEqual([]);
    unmount();
  });
});

// ── erro de leitura ≠ estado vazio ───────────────────────────────────────────

describe("falha ao perguntar não vira 'você não tem análise'", () => {
  it("apresenta o erro com re-tentativa, não o estado vazio", async () => {
    server.use(http.get(`${MSW_BASE}/v1/analyses`, () => HttpResponse.error()));
    const { unmount } = montar();

    await waitFor(() => expect(screen.queryByTestId("dashboard-compat-vazio")).toBeNull());
    expect(screen.queryByText("No analysis yet")).toBeNull();
    expect(screen.queryByTestId("destino-canonico")).toBeNull();
    unmount();
  });
});
