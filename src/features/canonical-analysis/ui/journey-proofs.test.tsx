import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import en from "@/i18n/en.json";
import { createV1Client, type V1Client, workspaceKeys } from "@/lib/v1";
import { HANDLE, statusView, problem } from "@/test/fixtures/public-v1/analyses";
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
      http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(statusView("ready_to_submit"))),
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
      http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(statusView("ready_to_submit"))),
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

describe("Upload longo — a leitura de status não pode derrubar o File", () => {
  it("preserva o File na transição preparing → receiving e em falha transitória", async () => {
    let estado: "preparing" | "receiving" = "preparing";
    let falharLeituraDeStatus = false;
    let liberarParte!: () => void;
    let avisarParteIniciada!: () => void;
    let avisarConclusao!: () => void;
    const parteIniciada = new Promise<void>((resolve) => {
      avisarParteIniciada = resolve;
    });
    const partePendente = new Promise<void>((resolve) => {
      liberarParte = resolve;
    });
    const conclusaoRecebida = new Promise<void>((resolve) => {
      avisarConclusao = resolve;
    });

    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
        falharLeituraDeStatus
          ? HttpResponse.json(problem("temporarily_unavailable"), {
              status: 503,
              headers: { "content-type": "application/problem+json" },
            })
          : HttpResponse.json(statusView(estado)),
      ),
      http.patch(`${MSW_BASE}/v1/analyses/:id`, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({ analysis_id: "an-abc", display_name: body.name });
      }),
      http.post(`${MSW_BASE}/v1/analyses/:id/data/uploads`, () => {
        estado = "receiving";
        return HttpResponse.json({
          analysis_id: "an-abc",
          status: "receiving",
          upload_session_id: "up-long",
          part_size_bytes: 5 * 1024 * 1024,
          uploaded_parts: [],
        });
      }),
      http.put(
        `${MSW_BASE}/v1/analyses/:id/data/uploads/:upload/parts/:part`,
        async () => {
          avisarParteIniciada();
          await partePendente;
          return HttpResponse.json({
            analysis_id: "an-abc",
            upload_session_id: "up-long",
            part_number: 1,
            etag: '"etag-long-1"',
          });
        },
      ),
      http.post(
        `${MSW_BASE}/v1/analyses/:id/data/uploads/:upload/complete`,
        () => {
          avisarConclusao();
          return HttpResponse.json(statusView("receiving"));
        },
      ),
    );

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <LanguageProvider>
        <QueryClientProvider client={qc}>
          <CanonicalClientProvider client={client}>
            <MemoryRouter>
              <AnalysisPage />
            </MemoryRouter>
          </CanonicalClientProvider>
        </QueryClientProvider>
      </LanguageProvider>,
    );

    expect(
      await screen.findByText(/Tell Sentinela what this analysis is about|Conte ao Sentinela/i),
    ).toBeTruthy();
    const inputAntes = (await waitFor(() => {
      const input = document.getElementById("canonical-file") as HTMLInputElement | null;
      expect(input).not.toBeNull();
      return input as HTMLInputElement;
    }));
    const arquivo = new File(["{}\n"], "base-grande.jsonl", {
      type: "application/x-ndjson",
    });
    await userEvent.upload(inputAntes, arquivo);
    await userEvent.click(
      screen.getByRole("button", { name: /send dataset|enviar base/i }),
    );
    await parteIniciada;

    await qc.invalidateQueries({
      queryKey: workspaceKeys.status("ws-1", "an-abc"),
    });
    await waitFor(() =>
      expect(
        screen.queryByText(/Tell Sentinela what this analysis is about|Conte ao Sentinela/i),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(document.getElementById("canonical-file")).toBe(inputAntes),
    );

    const inputDepois = document.getElementById("canonical-file") as HTMLInputElement;
    expect(inputDepois.files?.[0]).toBe(arquivo);

    falharLeituraDeStatus = true;
    await qc.invalidateQueries({
      queryKey: workspaceKeys.status("ws-1", "an-abc"),
    });
    await screen.findByRole("alert");
    expect(document.getElementById("canonical-file")).toBe(inputAntes);
    expect(
      (document.getElementById("canonical-file") as HTMLInputElement).files?.[0],
    ).toBe(arquivo);

    await act(async () => {
      liberarParte();
      await conclusaoRecebida;
    });
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
