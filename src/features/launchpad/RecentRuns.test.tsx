import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "@/features/canonical-analysis/data/client";
import { RecentRuns } from "./RecentRuns";

/**
 * `RecentRuns` migrada para `/v1`.
 *
 * O que estes testes protegem, além de "renderiza a lista":
 *
 * 1. **O escopo é o workspace autenticado.** Nem `project_id` nem `environment_id` entram na
 *    requisição. Eles eram o eixo do histórico LEGADO; exigi-los aqui traria de volta a
 *    precondição que devolvia 400 no `/v1`.
 * 2. **Ausência não vira zero.** `observed_conversations` ausente aparece como indisponível, e
 *    `0` medido aparece como `0`. São coisas diferentes, e a tela precisa distingui-las porque
 *    é o usuário que lê o número.
 * 3. **Uma requisição por página**, não uma por linha. Abrir o resultado de cada análise para
 *    montar a lista seria N+1 numa tela de entrada.
 */

const auth = vi.hoisted(() => ({ ws: { id: "ws-1" } as { id: string } | null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: auth.ws }) }));

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});
beforeEach(() => {
  auth.ws = { id: "ws-1" };
});

function renderRecent(node: ReactNode = <RecentRuns />) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter>{node}</MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

type Item = Record<string, unknown>;
function responder(items: Item[], capturar?: (url: URL) => void) {
  server.use(
    http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
      capturar?.(new URL(request.url));
      return HttpResponse.json({ items, next_cursor: null });
    }),
  );
}

// Aceita sobrescrita, como o helper equivalente da HistoryPage. O caso que prova a ausencia
// da celula de Engine PRECISA mandar um valor nao-nulo: com `null`, "nao aparece na tela"
// seria ambiguo entre "o campo sumiu" e "o campo estava vazio".
const base = (id: string, extra: Record<string, unknown> = {}): Item => ({
  analysis_id: id,
  status: "completed",
  record_count: 100,
  result_available: true,
  created_at: "2026-08-01T10:00:00Z",
  ...extra,
});

describe("RecentRuns — jornada canônica", () => {
  it("pede /v1/analyses com workspace_id e SEM project/environment", async () => {
    let vista: URL | null = null;
    responder([base("an-1")], (u) => (vista = u));
    renderRecent();

    await waitFor(() => expect(vista).not.toBeNull());
    const url = vista as unknown as URL;
    expect(url.searchParams.get("workspace_id")).toBe("ws-1");
    expect(url.searchParams.has("project_id")).toBe(false);
    expect(url.searchParams.has("environment_id")).toBe(false);
    expect(url.searchParams.has("tenant_id")).toBe(false);
  });

  it("conversas ausentes aparecem como indisponível, não como zero", async () => {
    responder([base("an-1")]); // sem observed_conversations
    renderRecent();

    const celula = await screen.findByTestId("recent-conversations-an-1");
    expect(celula).toHaveAttribute("data-estado", "indisponivel");
    expect(celula.textContent).not.toMatch(/\b0\b/);
  });

  it("zero MEDIDO aparece como zero", async () => {
    responder([{ ...base("an-1"), observed_conversations: 0 }]);
    renderRecent();

    const celula = await screen.findByTestId("recent-conversations-an-1");
    expect(celula).toHaveAttribute("data-estado", "medido");
    expect(celula.textContent).toContain("0");
  });

  it("a linha NÃO tem célula de Engine — o cliente nunca vê Engine", async () => {
    // O caso afirmava que a célula existia e mostrava "indisponível" quando o campo vinha nulo.
    // A célula saiu: `engine_version` está em `nunca_publicos` do contrato congelado desde a
    // Onda 5.5, e a listagem o devolvia mesmo assim.
    //
    // A massa manda um valor NÃO nulo de propósito: com `null`, "não aparece na tela" seria
    // ambíguo entre "o campo sumiu" e "o campo estava vazio".
    //
    // O `findByTestId` da linha vem antes do `queryByTestId`: sem ele a consulta responderia
    // `null` por a lista ainda não ter renderizado, e o teste passaria por vacuidade.
    responder([base("an-1", { engine_version: "engine-9.9" })]);
    renderRecent();

    await screen.findByTestId("recent-conversations-an-1");
    expect(screen.queryByTestId("recent-engine-an-1")).toBeNull();
    expect(document.body.textContent).not.toContain("engine-9.9");
  });

  it("uma requisição para a página inteira — sem N+1 por linha", async () => {
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
        throw new Error("RecentRuns abriu o resultado de uma linha — N+1 de volta");
      }),
    );
    renderRecent();

    await screen.findByTestId("recent-conversations-an-3");
    expect(chamadas).toBe(1);
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
    renderRecent();

    await waitFor(() => expect(screen.queryByTestId("recent-loading")).toBeNull());
    expect(chamadas).toBe(0);
  });
});
