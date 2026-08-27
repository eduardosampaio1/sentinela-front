import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { createV1Client, type V1Client } from "@/lib/v1";
import { HANDLE, statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "./client";
import {
  intervaloDePolling,
  proximoPolling,
  useAnalysisStatus,
  useCreateAnalysis,
  useSubmitAnalysis,
  useUploadData,
} from "./analysis";

setupMsw();

let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

function makeWrapper(c: V1Client) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={c}>{children}</CanonicalClientProvider>
      </QueryClientProvider>
    );
  };
}

const SCOPE = { workspaceId: "ws-1" };

describe("intervaloDePolling — por estado, terminal encerra", () => {
  it("fila/execução/recuperação = ativo; preparo/recebendo = moderado; terminal = false", () => {
    expect(intervaloDePolling("queued")).toBe(2500);
    expect(intervaloDePolling("running")).toBe(2500);
    expect(intervaloDePolling("recovering")).toBe(2500);
    expect(intervaloDePolling("preparing")).toBe(4000);
    expect(intervaloDePolling("receiving")).toBe(4000);
    expect(intervaloDePolling("completed")).toBe(false);
    expect(intervaloDePolling("failed")).toBe(false);
  });
});

describe("proximoPolling — concluída SEM resultado ainda não é terminal (E6 item 23)", () => {
  it("completed + result_available=false → segue checando; =true → para", () => {
    expect(proximoPolling("completed", false)).toBe(4000); // resultado em preparação: continua
    expect(proximoPolling("completed", true)).toBe(false); // resultado pronto: terminal
    expect(proximoPolling("completed", undefined)).toBe(false); // sem sinal: terminal (default)
    expect(proximoPolling("running", false)).toBe(2500); // em execução independe do resultado
    expect(proximoPolling("failed", false)).toBe(false); // falha é terminal
  });
});

describe("useCreateAnalysis — prepare com Idempotency-Key da intenção", () => {
  it("devolve analysis_id e envia a Idempotency-Key recebida", async () => {
    let capturada: string | null = null;
    server.use(
      http.post(`${MSW_BASE}/v1/analyses`, ({ request }) => {
        capturada = request.headers.get("Idempotency-Key");
        return HttpResponse.json(HANDLE, { status: 201 });
      }),
    );
    const { result } = renderHook(() => useCreateAnalysis(), { wrapper: makeWrapper(client) });
    const handle = await result.current.mutateAsync({ scope: SCOPE, idempotencyKey: "intent-key-1" });
    expect(handle.analysis_id).toBe("an-abc");
    expect(capturada).toBe("intent-key-1");
  });
});

describe("useUploadData — multipart retomável para arquivos do navegador", () => {
  it("envia o Blob e devolve status público", async () => {
    server.use(http.post(`${MSW_BASE}/v1/analyses/:id/data`, () => HttpResponse.json(statusView("receiving"))));
    const { result } = renderHook(() => useUploadData(), { wrapper: makeWrapper(client) });
    const body = new Blob(["{}\n"], { type: "application/x-ndjson" });
    const view = await result.current.mutateAsync({ analysisId: "an-abc", scope: SCOPE, body });
    expect(view.status).toBe("receiving");
  });

  it("retoma a sessão e envia somente as partes ainda não confirmadas", async () => {
    const partesEnviadas: number[] = [];
    server.use(
      http.post(`${MSW_BASE}/v1/analyses/:id/data/uploads`, () => HttpResponse.json({
        analysis_id: "an-abc",
        status: "receiving",
        upload_session_id: "up-1",
        part_size_bytes: 5 * 1024 * 1024,
        uploaded_parts: [{ part_number: 1, etag: '"etag-1"' }],
      })),
      http.put(`${MSW_BASE}/v1/analyses/:id/data/uploads/:upload/parts/:part`, ({ params }) => {
        partesEnviadas.push(Number(params.part));
        return HttpResponse.json({
          analysis_id: "an-abc",
          upload_session_id: "up-1",
          part_number: Number(params.part),
          etag: `"etag-${params.part}"`,
        });
      }),
      http.post(`${MSW_BASE}/v1/analyses/:id/data/uploads/:upload/complete`, () =>
        HttpResponse.json(statusView("receiving")),
      ),
    );
    const { result } = renderHook(() => useUploadData(), { wrapper: makeWrapper(client) });
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "grande.jsonl");
    const view = await result.current.mutateAsync({ analysisId: "an-abc", scope: SCOPE, body: file });

    expect(view.status).toBe("receiving");
    expect(partesEnviadas).toEqual([2]);
  });
});

describe("useSubmitAnalysis — reusa analysis_id", () => {
  it("submit devolve handle enfileirado", async () => {
    server.use(http.post(`${MSW_BASE}/v1/analyses/:id/submit`, () => HttpResponse.json({ ...HANDLE, status: "queued" })));
    const { result } = renderHook(() => useSubmitAnalysis(), { wrapper: makeWrapper(client) });
    const handle = await result.current.mutateAsync({ analysisId: "an-abc", scope: SCOPE });
    expect(handle.status).toBe("queued");
  });
});

describe("useAnalysisStatus — lê um dos 7 estados por analysis_id", () => {
  it("resolve o status do backend", async () => {
    server.use(http.get(`${MSW_BASE}/v1/analyses/:id`, () => HttpResponse.json(statusView("running"))));
    const { result } = renderHook(() => useAnalysisStatus(SCOPE, "an-abc"), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(result.current.data?.status).toBe("running"));
  });

  it("desabilitado sem escopo/analysis_id (não consulta)", async () => {
    const { result } = renderHook(() => useAnalysisStatus(null, null), { wrapper: makeWrapper(client) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
