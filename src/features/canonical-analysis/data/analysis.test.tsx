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

describe("useUploadData — File/Blob direto, sem retry automático", () => {
  it("envia o Blob e devolve status público", async () => {
    server.use(http.post(`${MSW_BASE}/v1/analyses/:id/data`, () => HttpResponse.json(statusView("receiving"))));
    const { result } = renderHook(() => useUploadData(), { wrapper: makeWrapper(client) });
    const body = new Blob(["{}\n"], { type: "application/x-ndjson" });
    const view = await result.current.mutateAsync({ analysisId: "an-abc", scope: SCOPE, body });
    expect(view.status).toBe("receiving");
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
