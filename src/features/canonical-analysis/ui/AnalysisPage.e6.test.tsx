import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import axe from "axe-core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client, type AnalysisStatus } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "../data/client";
import { AnalysisPage } from "./AnalysisPage";

// O estado que oferece SUBMETER mudou de `receiving` para `ready_to_submit`.
//
// O que estes casos medem nao mudou -- submit nao refaz upload, nao dispara duas vezes, e
// apresenta o erro pelo codigo. O que mudou e ONDE o botao vive: em `receiving` os bytes
// ainda estao chegando e o Orchestrator recusa com `analysis_not_ready`. O botao existia
// exatamente no estado em que nao podia funcionar.

vi.mock("@/shell/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: { id: "ws-1" } }) }));

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

function renderAt(id = "an-abc") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter initialEntries={[`/analyses/${id}`]}>
            <Routes>
              <Route path="/analyses/:analysisId" element={<AnalysisPage />} />
            </Routes>
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

const failed = (retry_allowed: boolean) => statusView("failed", { analysis_id: "an-abc", retry_allowed });
const problem = (code: string, status: number) =>
  HttpResponse.json({ type: `urn:sentinela:error:${code}`, title: code, status, code, detail: code }, {
    status,
    headers: { "content-type": "application/problem+json" },
  });

describe("E6 — retry canônico e falha não recuperável", () => {
  it("failed+retry_allowed: cria nova Analysis sobre o artefato, 0 prepare, 0 upload", async () => {
    const posts: string[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST") posts.push(new URL(request.url).pathname);
    });
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(failed(true))),
      http.post(`${MSW_BASE}/v1/analyses/:id/reprocess`, () => HttpResponse.json({ analysis_id: "an-new", status: "queued" as AnalysisStatus })),
    );
    renderAt();
    const botao = await screen.findByRole("button", { name: /run again|analisar novamente/i });
    await userEvent.click(botao);

    await waitFor(() => expect(posts).toContain("/v1/analyses/an-abc/reprocess"));
    await screen.findByText("an-new");
    expect(posts.filter((p) => p === "/v1/analyses").length, "0 prepare").toBe(0);
    expect(posts.filter((p) => p.endsWith("/data")).length, "0 upload").toBe(0);
  });

  it("duplo-clique no reprocessamento: só UM POST (bloqueio isPending||isSuccess)", async () => {
    let retries = 0;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(failed(true))),
      http.post(`${MSW_BASE}/v1/analyses/:id/reprocess`, async () => {
        retries += 1;
        return HttpResponse.json({ analysis_id: "an-new", status: "queued" as AnalysisStatus });
      }),
    );
    renderAt();
    const botao = await screen.findByRole("button", { name: /run again|analisar novamente/i });
    await userEvent.dblClick(botao);
    await new Promise((r) => setTimeout(r, 40));
    expect(retries).toBe(1);
  });

  it("failed+retry_allowed=false: SEM botão de retry; oferece Nova análise", async () => {
    server.use(http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(failed(false))));
    renderAt();
    await screen.findByText(/couldn't complete|não foi possível/i);
    expect(screen.queryByRole("button", { name: /run again|analisar novamente/i })).toBeNull();
    expect(screen.getByRole("link", { name: /new analysis|nova análise/i })).toBeTruthy();
  });
});

describe("E6 — apresentação por código (capacity/result/idempotency)", () => {
  it("completed: cria nova Analysis com a mesma base, sem prepare nem upload", async () => {
    const posts: string[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST") posts.push(new URL(request.url).pathname);
    });
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(statusView("completed", { analysis_id: "an-abc", result_available: true }))),
      http.post(`${MSW_BASE}/v1/analyses/:id/reprocess`, () => HttpResponse.json({ analysis_id: "an-new", status: "queued" as AnalysisStatus })),
    );
    renderAt();

    await userEvent.click(await screen.findByRole("button", { name: /run again with this dataset|analisar novamente com esta base/i }));

    await waitFor(() => expect(posts).toContain("/v1/analyses/an-abc/reprocess"));
    await screen.findByText("an-new");
    expect(posts.filter((p) => p === "/v1/analyses").length, "0 prepare").toBe(0);
    expect(posts.filter((p) => p.endsWith("/data")).length, "0 upload").toBe(0);
  });

  it("completed + result_available=false: explica a preparação sem esconder as visões", async () => {
    server.use(http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(statusView("completed", { analysis_id: "an-abc", result_available: false }))));
    renderAt();
    expect(await screen.findByRole("heading", { name: /results from this analysis/i })).toBeTruthy();
    expect(screen.getByText(/assessment appears after the final result/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /view result|ver resultado/i })).toBeNull();
  });

  it("submit capacity_wait: espera NEUTRA (status, não alert; sem retry; sem %)", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(statusView("ready_to_submit", { analysis_id: "an-abc" }))),
      http.post(`${MSW_BASE}/v1/analyses/:id/submit`, () => problem("capacity_wait", 503)),
    );
    renderAt();
    await userEvent.click(await screen.findByRole("button", { name: /submit for analysis|enviar para análise/i }));
    // capacity_wait → aparece uma região de espera (role=status), NUNCA um alert vermelho de erro
    await waitFor(() => expect(screen.getByText(/at capacity|em capacidade|capacidade/i)).toBeTruthy());
    const alerts = screen.queryAllByRole("alert");
    expect(alerts.length, "capacity_wait não é erro vermelho").toBe(0);
    // A leitura de progresso não respondeu nesta massa. Desde que a verdade operacional passou
    // a pertencer ao servidor, o Front não pode reconstruir quatro etapas a partir do status só
    // para preencher a tela: ausência vira explicação explícita, nunca uma barra inventada.
    expect(
      screen.getByText(
        /operational truth for this analysis is unavailable|verdade operacional.*indisponível/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("progressbar", {
        name: /analysis stage progress|progresso das etapas/i,
      }),
    ).toBeNull();
    expect(screen.queryByRole("progressbar", { name: /dataset upload|envio da base/i })).toBeNull();
  });

  it("submit idempotency_conflict: mensagem, SEM oferecer retry (não força nova chave)", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(statusView("ready_to_submit", { analysis_id: "an-abc" }))),
      http.post(`${MSW_BASE}/v1/analyses/:id/submit`, () => problem("idempotency_conflict", 409)),
    );
    renderAt();
    await userEvent.click(await screen.findByRole("button", { name: /submit for analysis|enviar para análise/i }));
    await waitFor(() => expect(screen.getByText(/already submitted|já foi enviad/i)).toBeTruthy());
    // idempotency_conflict → action "none": nenhum botão de retry no feedback
    const feedback = screen.getByText(/already submitted|já foi enviad/i).closest("[role]");
    expect(feedback?.querySelector("button")).toBeNull();
  });
});

describe("E6 — acessibilidade (axe) dos estados de erro/retry/espera", () => {
  async function violacoes(container: HTMLElement) {
    const r = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    return r.violations;
  }
  it("failed+retry (alert + botão nomeado): sem violações", async () => {
    server.use(http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(failed(true))));
    const { container } = renderAt();
    await screen.findByRole("button", { name: /run again/i });
    expect(await violacoes(container)).toEqual([]);
  });
  it("não recuperável (links nomeados): sem violações", async () => {
    server.use(http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(failed(false))));
    const { container } = renderAt();
    await screen.findByRole("link", { name: /new analysis/i });
    expect(await violacoes(container)).toEqual([]);
  });
});
