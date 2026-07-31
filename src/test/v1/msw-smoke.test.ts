import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { createV1Client, ProblemError, type V1Client } from "@/lib/v1";
import { server } from "@/test/msw/server";
import { setupMsw } from "@/test/msw/server";
import { MSW_BASE } from "@/test/msw/handlers";
import { problem } from "@/test/fixtures/public-v1/analyses";

setupMsw();

/** Prova o wiring REAL: cliente canônico E1 (sem fetch injetado) → MSW → parsing tipado. */
describe("MSW + cliente canônico /v1 (sem fetch injetado)", () => {
  let client: V1Client;
  // Construir DEPOIS do server.listen (setupMsw) — senão captura o fetch não-instrumentado.
  beforeAll(() => {
    client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
  });

  it("prepare devolve AnalysisHandle tipado", async () => {
    const h = await client.prepare({ workspaceId: "ws-1" });
    expect(h.analysis_id).toBe("an-abc");
    expect(h.status).toBe("preparing");
  });

  it("getStatus devolve um dos 7 estados públicos", async () => {
    const s = await client.getStatus("an-abc", { workspaceId: "ws-1" });
    expect(["preparing", "receiving", "queued", "running", "recovering", "completed", "failed"]).toContain(s.status);
  });

  it("problem+json do MSW vira ProblemError tipado", async () => {
    server.use(
      http.post(`${MSW_BASE}/v1/analyses`, () =>
        HttpResponse.json(problem("capacity_wait"), {
          status: 503,
          headers: { "content-type": "application/problem+json" },
        }),
      ),
    );
    await expect(client.prepare({ workspaceId: "ws-1" })).rejects.toBeInstanceOf(ProblemError);
  });

  it("workspace_id vazio nunca toca a rede (fail-closed) mesmo com MSW ligado", async () => {
    await expect(client.getStatus("an-abc", { workspaceId: "" })).rejects.toMatchObject({
      problem: { code: "invalid_input" },
    });
  });
});
