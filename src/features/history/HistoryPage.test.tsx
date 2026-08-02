import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "@/features/canonical-analysis/data/client";
import { HistoryPage } from "./HistoryPage";

/**
 * Cluster de histórico migrado — `HistoryPage` + `RunRow` + `RunComparePanel`.
 *
 * Os invariantes protegidos aqui são os que um refactor futuro reintroduz sem perceber:
 *
 * 1. **escopo é o workspace** — `project_id`/`environment_id` fora da requisição;
 * 2. **uma requisição por página** — abrir `/result` para montar a lista faz o teste explodir;
 * 3. **ausência ≠ zero** — cada célula carrega `data-estado`, e ausência nunca imprime `0`;
 * 4. **campo não contratado não vira coluna** — risco e intents não aparecem em nenhuma forma;
 * 5. **comparar custa duas chamadas, disparadas pela AÇÃO** — não pela listagem.
 */

vi.mock("@/shell/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
const auth = vi.hoisted(() => ({ ws: { id: "ws-1", name: "Acme" } as { id: string; name?: string } | null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: auth.ws }) }));

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});
beforeEach(() => {
  auth.ws = { id: "ws-1", name: "Acme" };
});

function renderHistory() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter>
            <HistoryPage />
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

type Item = Record<string, unknown>;
const base = (id: string, extra: Item = {}): Item => ({
  analysis_id: id,
  status: "completed",
  record_count: 120,
  result_available: true,
  created_at: "2026-08-01T10:00:00Z",
  ...extra,
});

function listar(items: Item[], capturar?: (u: URL) => void) {
  server.use(
    http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
      capturar?.(new URL(request.url));
      return HttpResponse.json({ items, next_cursor: null });
    }),
  );
}

describe("HistoryPage — jornada canônica", () => {
  it("pede a listagem com workspace_id e SEM project/environment", async () => {
    let vista: URL | null = null;
    listar([base("an-1")], (u) => (vista = u));
    renderHistory();

    await waitFor(() => expect(vista).not.toBeNull());
    const url = vista as unknown as URL;
    expect(url.searchParams.get("workspace_id")).toBe("ws-1");
    expect(url.searchParams.has("project_id")).toBe(false);
    expect(url.searchParams.has("environment_id")).toBe(false);
    expect(url.searchParams.has("tenant_id")).toBe(false);
  });

  it("uma requisição para a página — nenhum /result é aberto para montar a lista", async () => {
    let chamadas = 0;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () => {
        chamadas += 1;
        return HttpResponse.json({
          items: [base("an-1"), base("an-2"), base("an-3")],
          next_cursor: null,
        });
      }),
      http.get(`${MSW_BASE}/v1/analyses/:id/result`, () => {
        throw new Error("a listagem abriu /result — N+1 de volta");
      }),
    );
    renderHistory();

    await screen.findByTestId("run-row-an-3");
    expect(chamadas).toBe(1);
  });

  it("conversas ausentes ficam indisponíveis; zero medido mostra zero", async () => {
    listar([base("an-sem"), base("an-zero", { observed_conversations: 0 })]);
    renderHistory();

    const ausente = await screen.findByTestId("run-convs-an-sem");
    expect(ausente).toHaveAttribute("data-estado", "indisponivel");
    expect(ausente.textContent).not.toMatch(/\b0\b/);

    const zero = screen.getByTestId("run-convs-an-zero");
    expect(zero).toHaveAttribute("data-estado", "medido");
    expect(zero.textContent).toContain("0");
  });

  it("a linha NÃO tem célula de Engine — o cliente nunca vê Engine", async () => {
    // Antes este caso afirmava que a célula existia e mostrava "indisponível" quando o campo
    // vinha nulo. A célula deixou de existir: `engine_version` está em `nunca_publicos` do
    // contrato congelado desde a Onda 5.5, e a listagem o devolvia mesmo assim.
    //
    // O invariante "ausência não vira texto inventado" não se perdeu — ele continua provado no
    // caso das conversas, logo acima, que é onde ainda há um valor opcional para exibir. Aqui a
    // afirmação é outra e mais forte: não há o que exibir, porque o dado não atravessa a
    // fronteira pública.
    //
    // A prova é por AUSÊNCIA, e o `findByTestId` da linha vem antes de propósito: sem ele o
    // `queryByTestId` responderia `null` por a lista ainda não ter renderizado, e o teste
    // passaria por vacuidade.
    listar([base("an-1", { engine_version: "engine-9.9" })]);
    renderHistory();

    await screen.findByTestId("run-row-an-1");
    expect(screen.queryByTestId("run-engine-an-1")).toBeNull();
    expect(screen.getByTestId("run-row-an-1").textContent).not.toContain("engine-9.9");
  });

  it("risco, intents e os filtros que dependiam deles não existem mais", async () => {
    listar([base("an-1", { risk_level: "LOW", n_intents: 9 })]);
    const { container } = renderHistory();
    await screen.findByTestId("run-row-an-1");

    // Nem coluna, nem valor: campo NÃO CONTRATADO some da interface — não vira "indisponível".
    const texto = container.textContent ?? "";
    for (const proibido of ["Risk", "Intents", "Score", "LOW"]) {
      expect(texto).not.toContain(proibido);
    }
  });

  it("comparar dispara DUAS chamadas a /result — pela ação, não pela listagem", async () => {
    let resultados = 0;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () =>
        HttpResponse.json({ items: [base("an-1"), base("an-2")], next_cursor: null }),
      ),
      http.get(`${MSW_BASE}/v1/analyses/:id/result`, ({ params }) => {
        resultados += 1;
        return HttpResponse.json({
          analysis_id: String(params.id),
          result_schema_version: "analysis-result-v1",
          indicator_registry_version: "reg-1",
          result: {},
        });
      }),
    );
    const usuario = userEvent.setup();
    renderHistory();

    await screen.findByTestId("run-row-an-1");
    expect(resultados).toBe(0); // listagem sozinha: zero resultados abertos

    await usuario.click(screen.getByRole("button", { name: /enter compare mode/i }));
    await usuario.click(screen.getByTestId("run-row-an-1"));
    await usuario.click(screen.getByTestId("run-row-an-2"));
    await usuario.click(screen.getByTestId("compare-now"));

    await screen.findByTestId("compare-panel");
    await waitFor(() => expect(resultados).toBe(2));
  });

  it("sem workspace ativo, não chama a rede", async () => {
    auth.ws = null;
    let chamadas = 0;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () => {
        chamadas += 1;
        return HttpResponse.json({ items: [], next_cursor: null });
      }),
    );
    renderHistory();

    await screen.findByText(/workspace required/i);
    expect(chamadas).toBe(0);
  });
});
