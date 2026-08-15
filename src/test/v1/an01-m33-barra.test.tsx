// M33 — a barra superior identifica a superfície em `preparing`, e SÓ nela.
//
// Trunk test: com a análise já reservada, a barra dizia "Nova análise" enquanto o título da seção
// dizia "Adicione sua base" — a mesma tela respondendo de duas formas a "onde estou?".
//
// `AnalysisPage` também atende `receiving` (AN-01) e os estados de AN-03/AN-04, que são de M34 e
// M35. Este arquivo varre `PUBLIC_STATES` inteiro para provar que **nenhum outro estado mudou** —
// sem isso, a microcorreção seria uma antecipação silenciosa de superfície futura.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import { PUBLIC_STATES, createV1Client, type V1Client } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "@/features/canonical-analysis/data/client";
import { AnalysisPage } from "@/features/canonical-analysis/ui/AnalysisPage";

// O `AppShell` real traz shell inteiro; aqui só o TÍTULO importa, e ele vira atributo observável.
vi.mock("@/shell/AppShell", () => ({
  AppShell: ({ topBarTitle, children }: { topBarTitle?: string; children: ReactNode }) => (
    <div data-testid="barra" data-titulo={topBarTitle}>
      {children}
    </div>
  ),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: { id: "ws-1" } }) }));

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

function montarEm(estado: string) {
  server.use(
    http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
      HttpResponse.json(statusView(estado as never, { analysis_id: "an-abc" })),
    ),
  );
  window.localStorage.setItem("sentinela:language", "pt");
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter initialEntries={["/analyses/an-abc"]}>
            <Routes>
              <Route path="/analyses/:analysisId" element={<AnalysisPage />} />
            </Routes>
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

const titulo = () => screen.getByTestId("barra").getAttribute("data-titulo");

describe("M33 · a barra superior em `preparing`", () => {
  it("responde UMA coisa só: barra e título da seção concordam", async () => {
    montarEm("preparing");
    await waitFor(() => expect(titulo()).toBe(pt.canonicalAnalysis.upload.topBar));
    // O título da seção continua sendo a tarefa, e a barra nomeia o lugar + a tarefa.
    expect(screen.getByRole("heading", { name: pt.canonicalAnalysis.upload.title })).toBeTruthy();
    // A identidade pública não sumiu do corpo — não há título humano para inventar.
    expect(screen.getByText("an-abc")).toBeTruthy();
    // E a barra NÃO passou a dizer "Nova análise" numa análise que já existe.
    expect(titulo()).not.toBe(pt.canonicalAnalysis.entry.title);
  });

  it("NENHUM estado desta rota diz 'Nova análise' — ela nunca é uma análise nova", async () => {
    // M45.2 — o guarda anterior exigia que os outros sete estados MANTIVESSEM `entry.title`.
    //
    // Ele foi escrito assim de propósito: a M33 corrigiu só `preparing` e disse, aqui mesmo, que
    // quem mexesse nos demais teria de passar por M34/M35. Esta tranche é a delas, e o princípio
    // que a própria M33 escreveu — *a barra não diz "Nova análise" numa análise que já existe* —
    // vale igual para os sete. As capturas 05 e 07 mostravam uma análise FALHADA e uma rodando
    // com "Nova análise" na barra.
    //
    // O guarda não sumiu: virou o invariante correto, e é mais forte. Ele varre `PUBLIC_STATES`
    // inteiro e recusa `entry.title` em qualquer um — inclusive num estado novo do contrato.
    for (const estado of PUBLIC_STATES) {
      const { unmount } = montarEm(estado);
      await waitFor(() => expect(titulo()).toBeTruthy());
      expect(titulo(), `o estado ${estado} anuncia a rota de criação`).not.toBe(
        pt.canonicalAnalysis.entry.title,
      );
      unmount();
    }
  });

  it("fora de `preparing`, a barra nomeia o LUGAR, e é sempre o mesmo nome", async () => {
    // Contraprova do caso acima: sem ela, apagar o `topBarTitle` inteiro passaria — vazio também
    // não é "Nova análise".
    for (const estado of PUBLIC_STATES.filter((e) => e !== "preparing")) {
      const { unmount } = montarEm(estado);
      await waitFor(() =>
        expect(titulo(), `o estado ${estado} não nomeia o lugar`).toBe(
          pt.canonicalAnalysis.topBar,
        ),
      );
      unmount();
    }
  });

  it("não existe tabela de títulos por estado esperando uso futuro", () => {
    // A ramificação tem de ser a MENOR possível: um ternário sobre `preparing`, e nada além.
    const f = readFileSync(
      resolve(__dirname, "../../..", "src/features/canonical-analysis/ui/AnalysisPage.tsx"),
      "utf-8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/.*$/gm, " ");
    for (const futuro of ["receiving:", "running:", "recovering:", "TITULOS", "topBarPor"]) {
      expect(f, `superfície futura antecipada: ${futuro}`).not.toContain(futuro);
    }
    expect(f).toContain('=== "preparing"');
  });
});
