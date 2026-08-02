import { describe, expect, it, vi } from "vitest";
import { createV1Client, ProblemError } from "@/lib/v1";

/**
 * `GET /v1/me` — a operação de IDENTIDADE.
 *
 * É a única sem escopo de tenant, e tinha de ser: `workspace_id` é a resposta que ela dá, então
 * exigi-lo como pergunta travaria o login no primeiro acesso. Estes testes congelam essa
 * assimetria dos dois lados — `me` sem workspace funciona, e as operações de análise continuam
 * falhando fechado sem workspace.
 */

const ME = {
  user: { id: "u-1", email: "ana@x.com", name: "Ana" },
  workspaces: [
    { id: "ws-1", name: "Acme", role: "owner" as const },
    { id: "ws-2", name: "Globex", role: "viewer" as const },
  ],
  capabilities: { canonical_analysis_enabled: true },
};

function jsonResponse(body: unknown, status = 200, contentType = "application/json"): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": contentType } });
}

function makeClient(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
  token: string | null = "tok",
) {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init ?? {}),
  );
  const client = createV1Client({
    baseUrl: "https://gw.test/",
    getAccessToken: async () => token,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    newCorrelationId: () => "corr-1",
    newIdempotencyKey: () => "idem-1",
  });
  return { client, fetchImpl };
}

describe("V1 client — /v1/me", () => {
  it("GET /v1/me sem workspace_id, com Bearer e correlação", async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(ME));
    const r = await client.me();
    expect(r).toEqual(ME);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://gw.test/v1/me");
    expect(url).not.toContain("workspace_id");
    expect(url).not.toContain("tenant_id");
    expect(init!.method).toBe("GET");
    const h = init!.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer tok");
    expect(h["X-Correlation-Id"]).toBe("corr-1");
    expect(h["Idempotency-Key"]).toBeUndefined();
  });

  it("sem token: authentication_required ANTES da rede", async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(ME), null);
    await expect(client.me()).rejects.toBeInstanceOf(ProblemError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("lista vazia de workspaces é resposta válida, não erro", async () => {
    // "não pertenço a nada" e "minha sessão morreu" pedem telas diferentes; colapsar os dois
    // num erro tiraria do frontend a informação que ele precisa para escolher.
    const vazio = { ...ME, workspaces: [] };
    const { client } = makeClient(() => jsonResponse(vazio));
    await expect(client.me()).resolves.toEqual(vazio);
  });

  it("a assimetria é só de /v1/me: análise sem workspace continua falhando fechado", async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(ME));
    await expect(client.prepare({ workspaceId: "" })).rejects.toBeInstanceOf(ProblemError);
    await expect(client.list({ workspaceId: "  " })).rejects.toBeInstanceOf(ProblemError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("problem+json de erro é normalizado como nas demais operações", async () => {
    const corpo = { type: "about:blank", title: "authentication_required", status: 401 };
    const { client } = makeClient(
      () =>
        new Response(JSON.stringify(corpo), {
          status: 401,
          headers: { "content-type": "application/problem+json" },
        }),
    );
    await expect(client.me()).rejects.toBeInstanceOf(ProblemError);
  });
});
