import { beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { waitFor } from "@testing-library/react";
import {
  clearCanonicalCache,
  createCanonicalQueryClient,
  createV1Client,
  workspaceKeys,
  type V1Client,
} from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

const SCOPE = { workspaceId: "ws-1" };

describe("logout — cancela polling, limpa cache canônico e resposta tardia não reaparece", () => {
  it("AbortSignal dispara no request in-flight; cache removido; resposta tardia é descartada", async () => {
    const qc = createCanonicalQueryClient();
    let sawAbort = false;
    let liberar!: () => void;
    const segura = new Promise<void>((r) => {
      liberar = r;
    });

    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, async ({ request }) => {
        request.signal.addEventListener("abort", () => {
          sawAbort = true;
        });
        await segura; // mantém o polling in-flight até o logout
        return HttpResponse.json(statusView("running", { analysis_id: "an-1" }));
      }),
    );

    const key = workspaceKeys.status("ws-1", "an-1");
    // dispara o polling (NÃO aguarda — fica in-flight)
    const inflight = qc.fetchQuery({
      queryKey: key,
      queryFn: ({ signal }) => client.getStatus("an-1", SCOPE, { signal }),
    });
    await waitFor(() => expect(qc.getQueryState(key)?.fetchStatus).toBe("fetching"));

    // LOGOUT: cancela tudo + limpa o cache canônico
    clearCanonicalCache(qc);

    // libera a resposta tardia DEPOIS do logout
    liberar();
    await inflight.catch(() => {}); // o cancelamento rejeita a promise

    expect(sawAbort, "o AbortSignal do request in-flight disparou no logout").toBe(true);
    expect(qc.getQueryData(key), "o cache canônico foi removido").toBeUndefined();

    // a resposta tardia NÃO repopula o cache
    await new Promise((r) => setTimeout(r, 25));
    expect(qc.getQueryData(key), "resposta tardia não reaparece após logout").toBeUndefined();
    expect(qc.getQueryCache().getAll().length, "nenhuma query canônica sobrevive ao logout").toBe(0);
  });

  it("onAuthRequired é acionado quando uma query falha com authentication_required (401)", async () => {
    let chamou = 0;
    const qc = createCanonicalQueryClient({ onAuthRequired: () => (chamou += 1) });

    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "auth", status: 401, code: "authentication_required" },
          { status: 401, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );

    await qc
      .fetchQuery({
        queryKey: workspaceKeys.status("ws-1", "an-401"),
        queryFn: ({ signal }) => client.getStatus("an-401", SCOPE, { signal }),
      })
      .catch(() => {});

    expect(chamou, "401 numa query aciona o handler de sessão expirada (→ /session-expired)").toBe(1);
  });
});
