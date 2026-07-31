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
    server.use(http.post(`${MSW_BASE}/v1/analyses/:id/data`, () => HttpResponse.json(statusView("receiving"))));
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
});

describe("Jornada canônica — prepare cria a identidade durável (E2 itens 3-4)", () => {
  it("clicar iniciar → prepare → navega para /canonical/analyses/:analysis_id", async () => {
    let idem: string | null = null;
    server.use(
      http.post(`${MSW_BASE}/v1/analyses`, ({ request }) => {
        idem = request.headers.get("Idempotency-Key");
        return HttpResponse.json(HANDLE, { status: 201 });
      }),
    );
    render(wrap(<StartAnalysisPage />));
    await userEvent.click(screen.getByRole("button", { name: /start analysis|iniciar análise/i }));
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith("/canonical/analyses/an-abc"));
    expect(idem).toBeTruthy(); // Idempotency-Key da intenção foi enviada
  });
});
