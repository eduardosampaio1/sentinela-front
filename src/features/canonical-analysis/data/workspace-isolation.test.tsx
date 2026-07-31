import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { type ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createCanonicalQueryClient,
  createV1Client,
  onWorkspaceSwitch,
  workspaceKeys,
  type V1Client,
} from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "./client";
import { useAnalysisStatus } from "./analysis";

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

describe("Troca de workspace — resposta tardia de A não contamina B (E3 item 15)", () => {
  it("cancela+remove o cache do workspace anterior; a resposta tardia não repopula", async () => {
    // Resposta de A fica PENDENTE até liberarmos (simula latência de rede).
    let liberarA: () => void = () => {};
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/an-A`, async () => {
        await new Promise<void>((r) => {
          liberarA = r;
        });
        return HttpResponse.json(statusView("running"));
      }),
    );

    const qc = createCanonicalQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>{children}</CanonicalClientProvider>
      </QueryClientProvider>
    );

    // Observa A (dispara o fetch pendente).
    const { result } = renderHook(() => useAnalysisStatus({ workspaceId: "A" }, "an-A"), { wrapper });
    await waitFor(() => expect(result.current.fetchStatus).toBe("fetching"));

    // Usuário troca para B ANTES de A responder → cancela+remove o cache de A.
    await onWorkspaceSwitch(qc, "A");

    // A resposta de A chega DEPOIS: não pode repopular o cache de A (query cancelada/removida).
    liberarA?.();
    await new Promise((r) => setTimeout(r, 20));
    expect(qc.getQueryData(workspaceKeys.status("A", "an-A"))).toBeUndefined();
  });
});
