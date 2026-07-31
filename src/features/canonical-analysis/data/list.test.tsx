import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { createV1Client, type V1Client } from "@/lib/v1";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "./client";
import { useAnalysesList } from "./list";

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
const item = (id: string) => ({
  analysis_id: id,
  status: "completed" as const,
  record_count: 3,
  result_available: true,
  created_at: "2020-01-01T00:00:00Z",
});

describe("useAnalysesList — listagem pública por cursor, workspace-scoped", () => {
  it("devolve items+next_cursor e envia workspace_id+cursor ao Gateway", async () => {
    let sentWs: string | null = null;
    let sentCursor: string | null = null;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
        const u = new URL(request.url);
        sentWs = u.searchParams.get("workspace_id");
        sentCursor = u.searchParams.get("cursor");
        return HttpResponse.json({ items: [item("an-1")], next_cursor: "cur-2" });
      }),
    );
    const { result } = renderHook(() => useAnalysesList(SCOPE, "cur-1"), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items[0].analysis_id).toBe("an-1");
    expect(result.current.data?.next_cursor).toBe("cur-2");
    expect(sentWs).toBe("ws-1");
    expect(sentCursor).toBe("cur-1");
  });

  it("sem cursor: primeira página (cursor ausente na query)", async () => {
    let hadCursor = true;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
        hadCursor = new URL(request.url).searchParams.has("cursor");
        return HttpResponse.json({ items: [item("an-a")], next_cursor: null });
      }),
    );
    const { result } = renderHook(() => useAnalysesList(SCOPE), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(hadCursor).toBe(false);
    expect(result.current.data?.next_cursor).toBeNull();
  });

  it("desabilitado sem scope: não dispara request", async () => {
    let chamou = 0;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () => {
        chamou += 1;
        return HttpResponse.json({ items: [], next_cursor: null });
      }),
    );
    const { result } = renderHook(() => useAnalysesList(null), { wrapper: makeWrapper(client) });
    // fica idle; nenhum fetch
    await new Promise((r) => setTimeout(r, 30));
    expect(chamou).toBe(0);
    expect(result.current.fetchStatus).toBe("idle");
  });
});
