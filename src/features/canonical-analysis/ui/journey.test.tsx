import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { HANDLE, statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "../data/client";
import { UploadStep } from "./UploadStep";
import { StartAnalysisPage } from "./StartAnalysisPage";

// Shell vivo virado passthrough no teste (evita montar Sidebar/TopBar, que exigem auth completo).
vi.mock("@/shell/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
// Escopo/auth: workspace fixo (não montamos o AuthProvider pesado).
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: { id: "ws-1" } }) }));
const navigateSpy = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateSpy };
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
        <CanonicalClientProvider client={client}>{children}</CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

function multipartHandlers({
  onPart,
}: {
  onPart?: (request: Request) => Promise<Response> | Response;
} = {}) {
  return [
    http.patch(`${MSW_BASE}/v1/analyses/:id`, async ({ params, request }) => {
      const body = (await request.json()) as { name: string };
      return HttpResponse.json({ analysis_id: String(params.id), display_name: body.name });
    }),
    http.post(`${MSW_BASE}/v1/analyses/:id/data/uploads`, () =>
      HttpResponse.json({
        analysis_id: "an-abc",
        status: "receiving",
        upload_session_id: "up-1",
        part_size_bytes: 5 * 1024 * 1024,
        uploaded_parts: [],
      }),
    ),
    http.put(`${MSW_BASE}/v1/analyses/:id/data/uploads/:upload/parts/:part`, ({ request }) =>
      onPart
        ? onPart(request)
        : HttpResponse.json({
            analysis_id: "an-abc",
            upload_session_id: "up-1",
            part_number: 1,
            etag: '"etag-1"',
          }),
    ),
    http.post(`${MSW_BASE}/v1/analyses/:id/data/uploads/:upload/complete`, () =>
      HttpResponse.json(statusView("receiving")),
    ),
  ];
}

describe("Jornada canônica — upload SEM materialização (E2 item 5)", () => {
  it("envia o File direto; NÃO usa FileReader/.text()/.arrayBuffer()", async () => {
    // Spia só os métodos que existem neste runtime (jsdom); os ausentes não podem ser chamados.
    const alvos: [object, string][] = [
      [FileReader.prototype, "readAsText"],
      [FileReader.prototype, "readAsArrayBuffer"],
      [FileReader.prototype, "readAsBinaryString"],
      [Blob.prototype, "text"],
      [Blob.prototype, "arrayBuffer"],
    ];
    const spies = alvos
      .filter(([proto, m]) => typeof (proto as Record<string, unknown>)[m] === "function")
      .map(([proto, m]) => vi.spyOn(proto as never, m as never));
    server.use(...multipartHandlers());
    const onUploaded = vi.fn();

    render(wrap(<UploadStep analysisId="an-abc" scope={{ workspaceId: "ws-1" }} onUploaded={onUploaded} />));

    const file = new File(["{}\n{}\n"], "base.jsonl", { type: "application/x-ndjson" });
    const input = document.getElementById("canonical-file") as HTMLInputElement;
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole("button", { name: /send dataset|enviar base/i }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(spies.length).toBeGreaterThan(0); // pelo menos o FileReader foi vigiado
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });

  it("após enviar com sucesso, o botão fica bloqueado (sem 2º POST /data — Codex R5)", async () => {
    let dataCalls = 0;
    server.use(...multipartHandlers({ onPart: () => {
      dataCalls += 1;
      return HttpResponse.json({
        analysis_id: "an-abc", upload_session_id: "up-1", part_number: 1, etag: '"etag-1"',
      });
    } }));
    render(wrap(<UploadStep analysisId="an-abc" scope={{ workspaceId: "ws-1" }} onUploaded={vi.fn()} />));
    const input = document.getElementById("canonical-file") as HTMLInputElement;
    await userEvent.upload(input, new File(["{}\n"], "base.jsonl", { type: "application/x-ndjson" }));
    const botao = screen.getByRole("button", { name: /send dataset|enviar base/i });
    await userEvent.click(botao);
    await waitFor(() => expect(dataCalls).toBe(1));
    await waitFor(() => expect((botao as HTMLButtonElement).disabled).toBe(true));
    expect(dataCalls).toBe(1); // janela de refetch: bloqueado, não reenvia
  });

  it("mostra barra de progresso enquanto a base está sendo recebida", async () => {
    let liberarUpload!: () => void;
    const uploadPendente = new Promise<void>((resolve) => { liberarUpload = resolve; });
    server.use(...multipartHandlers({ onPart: async () => {
      await uploadPendente;
      return HttpResponse.json({
        analysis_id: "an-abc", upload_session_id: "up-1", part_number: 1, etag: '"etag-1"',
      });
    } }));
    render(wrap(<UploadStep analysisId="an-abc" scope={{ workspaceId: "ws-1" }} onUploaded={vi.fn()} />));

    const input = document.getElementById("canonical-file") as HTMLInputElement;
    await userEvent.upload(input, new File(["{}\n"], "base.jsonl", { type: "application/x-ndjson" }));
    await userEvent.click(screen.getByRole("button", { name: /send dataset|enviar base/i }));

    const barra = await screen.findByRole("progressbar", { name: /dataset upload|envio da base/i });
    expect(barra).toHaveAttribute("aria-valuetext");
    expect(screen.getByText(/keep this page open|mantenha esta página aberta/i)).toBeTruthy();

    liberarUpload();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
  });

  it("pausa só a transferência e permite continuar sem perder a Analysis", async () => {
    let chamadasDeParte = 0;
    server.use(...multipartHandlers({ onPart: async (request) => {
      chamadasDeParte += 1;
      if (chamadasDeParte === 1) {
        await new Promise<void>((resolve) => request.signal.addEventListener("abort", () => resolve(), { once: true }));
      }
      return HttpResponse.json({
        analysis_id: "an-abc", upload_session_id: "up-1", part_number: 1, etag: '"etag-1"',
      });
    } }));
    const onUploaded = vi.fn();
    render(wrap(<UploadStep analysisId="an-abc" scope={{ workspaceId: "ws-1" }} onUploaded={onUploaded} />));

    await userEvent.upload(
      document.getElementById("canonical-file") as HTMLInputElement,
      new File(["{}\n"], "base.jsonl", { type: "application/x-ndjson" }),
    );
    await userEvent.click(screen.getByRole("button", { name: /send dataset|enviar base/i }));
    await userEvent.click(await screen.findByRole("button", { name: /pause upload|pausar envio/i }));

    expect(await screen.findByText(/received parts are safe|partes recebidas estão seguras/i)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /continue upload|continuar envio/i }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(chamadasDeParte).toBe(2);
  });
});

describe("Jornada canônica — prepare cria a identidade durável (E2 itens 3-4)", () => {
  it("entrar na rota → prepare automático → navega para /analyses/:analysis_id", async () => {
    let idem: string | null = null;
    server.use(
      http.post(`${MSW_BASE}/v1/analyses`, ({ request }) => {
        idem = request.headers.get("Idempotency-Key");
        return HttpResponse.json(HANDLE, { status: 201 });
      }),
    );
    render(wrap(<StartAnalysisPage />));
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith("/analyses/an-abc"));
    expect(idem).toBeTruthy(); // Idempotency-Key da intenção foi enviada
  });
});
