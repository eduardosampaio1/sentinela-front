import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import en from "@/i18n/en.json";
import { createV1Client, type V1Client } from "@/lib/v1";
import { HANDLE, statusView, problem } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "../data/client";
import { AnalysisPage } from "./AnalysisPage";

vi.mock("@/shell/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: { id: "ws-1" } }) }));
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ analysisId: "an-abc" }) };
});

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

function wrap(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          {/* E5: a ação terminal virou <Link> (deep link p/ o resultado) — exige contexto de Router. */}
          <MemoryRouter>{children}</MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

describe("E3 item 15 — submit NÃO refaz upload", () => {
  it("dois submits recuperáveis não disparam nenhum POST /data", async () => {
    let dataCalls = 0;
    let submitCalls = 0;
    const submitKeys: (string | null)[] = [];
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(statusView("receiving"))),
      http.post(`${MSW_BASE}/v1/analyses/:id/data`, () => {
        dataCalls += 1;
        return HttpResponse.json(statusView("receiving"));
      }),
      http.post(`${MSW_BASE}/v1/analyses/:id/submit`, ({ request }) => {
        submitCalls += 1;
        submitKeys.push(request.headers.get("Idempotency-Key"));
        // 1º submit falha (transitório recuperável), 2º sucede.
        if (submitCalls === 1) {
          return HttpResponse.json(problem("temporarily_unavailable"), {
            status: 503,
            headers: { "content-type": "application/problem+json" },
          });
        }
        return HttpResponse.json({ ...HANDLE, status: "queued" });
      }),
    );

    render(wrap(<AnalysisPage />));
    const botao = await screen.findByRole("button", { name: /submit for analysis|enviar para análise/i });
    await userEvent.click(botao);
    await waitFor(() => expect(submitCalls).toBe(1));
    await userEvent.click(screen.getByRole("button", { name: /submit for analysis|enviar para análise/i }));
    await waitFor(() => expect(submitCalls).toBe(2));

    expect(dataCalls).toBe(0); // NUNCA re-upload no retry de submit
    // A MESMA Idempotency-Key nos dois submits: o backend vê UMA intenção, não duas.
    expect(submitKeys[0]).toBeTruthy();
    expect(submitKeys[1]).toBe(submitKeys[0]);
  });
});

describe("Codex R5 — submit bem-sucedido não permite 2º disparo na janela de refetch", () => {
  it("após sucesso o botão fica desabilitado; segundo submit não ocorre", async () => {
    let submitCalls = 0;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(statusView("receiving"))),
      http.post(`${MSW_BASE}/v1/analyses/:id/submit`, () => {
        submitCalls += 1;
        return HttpResponse.json({ ...HANDLE, status: "queued" });
      }),
    );
    render(wrap(<AnalysisPage />));
    const botao = await screen.findByRole("button", { name: /submit for analysis|enviar para análise/i });
    await userEvent.click(botao);
    await waitFor(() => expect(submitCalls).toBe(1));
    // O status ainda é `receiving` (refetch), mas o botão fica BLOQUEADO (isSuccess) — sem 2º submit.
    await waitFor(() => expect((botao as HTMLButtonElement).disabled).toBe(true));
    expect(submitCalls).toBe(1);
  });
});

describe("E3 item 14 — refresh/deep-link resume por analysis_id", () => {
  it("montada do ZERO (só o id na rota) reconstrói o estado terminal via /v1", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
        HttpResponse.json(statusView("completed", { result_available: true })),
      ),
    );
    // Sem contexto anterior (nenhum File/estado em memória): só o analysis_id da rota (mock useParams).
    render(wrap(<AnalysisPage />));
    // Espera a query resolver: estado terminal + o caminho adiante.
    //
    // E5: a ação terminal virou LINK para a página canônica de resultado (deep-linkável).
    // Two-View Recovery: viraram DOIS links — o `analysis-result-v3` desfez a fusão dos motores,
    // e a jornada passou a oferecer a visão ARGOS e a visão Analytics em vez do documento
    // fundido. O que este caso prova continua o mesmo: montada do zero, só com o id na rota, a
    // tela reconstrói o estado terminal e oferece a saída.
    // Os nomes vêm do DICIONÁRIO, não cravados.
    //
    // Este caso reprovou no dia em que a visão ARGOS ganhou nome de produto ("Assessment"):
    // ele procurava `/^ARGOS$/i`, que era o rótulo interno do motor. O que o caso prova não é
    // COMO as visões se chamam — é que, montada do zero e só com o id na rota, a tela reconstrói
    // o estado terminal e oferece as duas saídas.
    //
    // Ancorado na chave, o próximo rename não volta a quebrar uma prova que não é sobre nome.
    expect(
      await screen.findByRole("link", { name: en.canonicalAnalysis.shell.view.argos }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: en.canonicalAnalysis.shell.view.analytics }),
    ).toBeTruthy();
  });
});

describe("E3 item 18 — sem fallback legado (teste discriminante)", () => {
  it("erro do /v1 fica no /v1: toda requisição é do Gateway canônico, nunca legado", async () => {
    const urls: string[] = [];
    const onReq = ({ request }: { request: Request }) => urls.push(request.url);
    server.events.on("request:start", onReq);
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
        HttpResponse.json(problem("temporarily_unavailable"), {
          status: 503,
          headers: { "content-type": "application/problem+json" },
        }),
      ),
    );

    render(wrap(<AnalysisPage />));
    // A UI mostra o erro público (traduzido pelo código), sem cair no legado.
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    server.events.removeListener("request:start", onReq);

    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u.startsWith(`${MSW_BASE}/v1/`)).toBe(true);
  });
});
