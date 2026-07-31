import { describe, expect, it, vi } from "vitest";
import {
  clearCanonicalCache,
  createCanonicalQueryClient,
  normalizeProblem,
  onWorkspaceSwitch,
  ProblemError,
  workspaceKeys,
} from "@/lib/v1";

describe("query keys — sempre tenant-scoped", () => {
  it("toda chave começa por [\"workspace\", workspaceId]", () => {
    const ws = "ws-1";
    const chaves = [
      workspaceKeys.root(ws),
      workspaceKeys.analyses(ws),
      workspaceKeys.list(ws, { limit: 2 }),
      workspaceKeys.detail(ws, "an-abc"),
      workspaceKeys.status(ws, "an-abc"),
      workspaceKeys.result(ws, "an-abc"),
    ];
    for (const k of chaves) {
      expect(k[0]).toBe("workspace");
      expect(k[1]).toBe(ws);
    }
    expect(workspaceKeys.list(ws, { limit: 2 })).toEqual(["workspace", ws, "analyses", "list", { limit: 2 }]);
    expect(workspaceKeys.status(ws, "an-abc")).toEqual(["workspace", ws, "analyses", "detail", "an-abc", "status"]);
  });
});

describe("política de retry (a wirada de verdade no QueryClient)", () => {
  const retry = createCanonicalQueryClient().getDefaultOptions().queries?.retry as (n: number, e: unknown) => boolean;

  it("erro TRANSITÓRIO (retryable) retenta até 2×", () => {
    const e = new ProblemError(normalizeProblem({ code: "temporarily_unavailable" }, 503, "c"));
    expect(retry(0, e)).toBe(true);
    expect(retry(1, e)).toBe(true);
    expect(retry(2, e)).toBe(false);
  });

  it("erro público NÃO-retryable (409/404/401/422) nunca retenta", () => {
    for (const code of ["idempotency_conflict", "forbidden_or_not_found", "authentication_required", "non_retryable_failure"]) {
      const e = new ProblemError(normalizeProblem({ code }, 409, "c"));
      expect(retry(0, e)).toBe(false);
    }
  });

  it("erro desconhecido (não-Problem) retenta no máximo 1×", () => {
    expect(retry(0, new Error("boom"))).toBe(true);
    expect(retry(1, new Error("boom"))).toBe(false);
  });
});

describe("troca de workspace — isola o cache por prefixo", () => {
  it("remove só o workspace anterior; preserva o novo", async () => {
    const qc = createCanonicalQueryClient();
    qc.setQueryData(workspaceKeys.status("A", "an-1"), { status: "running" });
    qc.setQueryData(workspaceKeys.status("B", "an-2"), { status: "queued" });

    await onWorkspaceSwitch(qc, "A");

    expect(qc.getQueryData(workspaceKeys.status("A", "an-1"))).toBeUndefined();
    expect(qc.getQueryData(workspaceKeys.status("B", "an-2"))).toEqual({ status: "queued" });
  });

  it("sem workspace anterior é no-op (não lança)", async () => {
    const qc = createCanonicalQueryClient();
    await expect(onWorkspaceSwitch(qc, null)).resolves.toBeUndefined();
  });
});

describe("logout — descarta todo o estado canônico", () => {
  it("clearCanonicalCache esvazia o cache", () => {
    const qc = createCanonicalQueryClient();
    qc.setQueryData(workspaceKeys.status("A", "an-1"), { status: "running" });
    clearCanonicalCache(qc);
    expect(qc.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe("sessão expirada — dispara onAuthRequired", () => {
  it("query que falha com authentication_required aciona o callback", async () => {
    const onAuthRequired = vi.fn();
    const qc = createCanonicalQueryClient({ onAuthRequired });
    await qc
      .fetchQuery({
        queryKey: workspaceKeys.status("A", "an-1"),
        queryFn: () => Promise.reject(new ProblemError(normalizeProblem({ code: "authentication_required" }, 401, "c"))),
      })
      .catch(() => undefined);
    expect(onAuthRequired).toHaveBeenCalledTimes(1);
  });

  it("query que falha com outro problema NÃO aciona o callback", async () => {
    const onAuthRequired = vi.fn();
    const qc = createCanonicalQueryClient({ onAuthRequired });
    await qc
      .fetchQuery({
        queryKey: workspaceKeys.status("A", "an-2"),
        queryFn: () => Promise.reject(new ProblemError(normalizeProblem({ code: "non_retryable_failure" }, 422, "c"))),
      })
      .catch(() => undefined);
    expect(onAuthRequired).not.toHaveBeenCalled();
  });
});
