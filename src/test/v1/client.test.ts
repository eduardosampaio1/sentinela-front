import { describe, expect, it, vi } from "vitest";
import { createV1Client, ProblemError, redactForLog } from "@/lib/v1";
import { HANDLE, LIST_PAGE_1, problem, RESULT_VIEW, STATUS_VIEWS } from "@/test/fixtures/public-v1/analyses";

const SCOPE = { workspaceId: "ws-1" };

function jsonResponse(body: unknown, status = 200, contentType = "application/json"): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": contentType } });
}
function problemResponse(code: Parameters<typeof problem>[0]): Response {
  const p = problem(code);
  return new Response(JSON.stringify(p), { status: p.status, headers: { "content-type": "application/problem+json" } });
}

function makeClient(handler: (url: string, init: RequestInit) => Response | Promise<Response>, token: string | null = "tok") {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init ?? {}));
  const client = createV1Client({
    baseUrl: "https://gw.test/",
    getAccessToken: async () => token,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    newCorrelationId: () => "corr-1",
    newIdempotencyKey: () => "idem-1",
  });
  return { client, fetchImpl };
}

describe("V1 client — as 7 operações canônicas", () => {
  it("prepare: POST /v1/analyses?workspace_id, Bearer, Idempotency-Key, correlation", async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(HANDLE, 201));
    const r = await client.prepare(SCOPE);
    expect(r).toEqual(HANDLE);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://gw.test/v1/analyses?workspace_id=ws-1");
    expect(init!.method).toBe("POST");
    const h = init!.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer tok");
    expect(h["Idempotency-Key"]).toBe("idem-1");
    expect(h["X-Correlation-Id"]).toBe("corr-1");
    expect(url).not.toContain("tenant_id"); // nunca tenant_id livre
  });

  it("submit/retry enviam Idempotency-Key; a chave do chamador é reusada", async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(HANDLE));
    await client.submit("an-abc", SCOPE, { idempotencyKey: "k-user" });
    await client.retry("an-abc", SCOPE);
    expect((fetchImpl.mock.calls[0]![1]!.headers as Record<string, string>)["Idempotency-Key"]).toBe("k-user");
    expect((fetchImpl.mock.calls[1]![1]!.headers as Record<string, string>)["Idempotency-Key"]).toBe("idem-1");
    expect(fetchImpl.mock.calls[0]![0]).toBe("https://gw.test/v1/analyses/an-abc/submit?workspace_id=ws-1");
  });

  it("getStatus/getResult/list leem o vocabulário público", async () => {
    const { client } = makeClient((url) => {
      if (url.includes("/result")) return jsonResponse(RESULT_VIEW);
      if (url.endsWith("/v1/analyses?workspace_id=ws-1&limit=2")) return jsonResponse(LIST_PAGE_1);
      return jsonResponse(STATUS_VIEWS.running);
    });
    expect((await client.getStatus("an-abc", SCOPE)).status).toBe("running");
    expect((await client.getResult("an-abc", SCOPE)).result_schema_version).toBe("analysis-result-v1");
    const page = await client.list({ workspaceId: "ws-1", limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.next_cursor).toBe("cursor-2");
  });

  it("uploadData: POST /data com corpo e content-type", async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(STATUS_VIEWS.preparing));
    await client.uploadData("an-abc", SCOPE, "{}\n", {});
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://gw.test/v1/analyses/an-abc/data?workspace_id=ws-1");
    expect((init!.headers as Record<string, string>)["Content-Type"]).toContain("ndjson");
    expect(init!.body).toBe("{}\n");
  });
});

describe("V1 client — auth, erros, cancelamento, sem-fallback", () => {
  it("sem token → authentication_required SEM chamar a rede", async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(HANDLE), null);
    await expect(client.getStatus("an-abc", SCOPE)).rejects.toMatchObject({
      problem: { code: "authentication_required", status: 401 },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("workspace_id vazio/em-branco → invalid_input SEM rede (fail-closed de tenant)", async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(HANDLE)); // token válido de propósito
    await expect(client.getStatus("an-abc", { workspaceId: "" })).rejects.toMatchObject({
      problem: { code: "invalid_input", status: 400 },
    });
    await expect(client.list({ workspaceId: "   " })).rejects.toMatchObject({ problem: { code: "invalid_input" } });
    expect(fetchImpl).not.toHaveBeenCalled(); // nunca uma requisição canônica sem escopo de tenant
  });

  it("problem+json do backend vira ProblemError tipado e seguro", async () => {
    const { client } = makeClient(() => problemResponse("idempotency_conflict"));
    await expect(client.prepare(SCOPE)).rejects.toMatchObject({
      problem: { code: "idempotency_conflict", status: 409, retryable: false },
    });
  });

  it("capacity_wait/temporarily_unavailable NÃO trocam de base (fetch chamado 1×)", async () => {
    const { client, fetchImpl } = makeClient(() => problemResponse("temporarily_unavailable"));
    await expect(client.list({ workspaceId: "ws-1" })).rejects.toBeInstanceOf(ProblemError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("resposta 200 malformada (não-JSON) não vira sucesso-lixo", async () => {
    const { client } = makeClient(() => new Response("<html>proxy</html>", { status: 200, headers: { "content-type": "text/html" } }));
    await expect(client.getStatus("an-abc", SCOPE)).rejects.toMatchObject({ problem: { code: "temporarily_unavailable" } });
  });

  it("erro de rede vira temporarily_unavailable (seguro)", async () => {
    const { client } = makeClient(() => { throw new TypeError("Failed to fetch"); });
    await expect(client.getStatus("an-abc", SCOPE)).rejects.toMatchObject({ problem: { code: "temporarily_unavailable" } });
  });

  it("AbortSignal: cancelamento propaga como AbortError (não vira problem)", async () => {
    const { client } = makeClient(() => { throw new DOMException("aborted", "AbortError"); });
    await expect(client.getStatus("an-abc", SCOPE, { signal: AbortSignal.abort() })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("redação: token/idempotency/dataset/result nunca em claro no log", () => {
    const red = redactForLog({ Authorization: "Bearer secret", "Idempotency-Key": "k", dataset: "x".repeat(9), result: { a: 1 }, ok: "visible" }) as Record<string, unknown>;
    expect(red.Authorization).toBe("[redacted]");
    expect(red["Idempotency-Key"]).toBe("[redacted]");
    expect(red.dataset).toBe("[redacted]");
    expect(red.result).toBe("[redacted]");
    expect(red.ok).toBe("visible");
  });
});
