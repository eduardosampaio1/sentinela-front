// A parada de mapping CHEGA na tela — e para o relógio.
//
// Preparação local do Big Bang. Nada aqui ativa nada.
//
// Este arquivo existe por causa de um defeito real: `stateView` dizia todas as coisas certas
// sobre `needs_mapping` (não é erro, não é indeterminado, a ação não é retry) e NADA consumia
// isso. O estado caía no `default` dos dois switches — o de polling e o da página — e virava
// exatamente o que a máquina de apresentação existia para evitar: banner de "na fila" com
// consulta ao backend a cada poucos segundos, para sempre, sem ação nenhuma oferecida.
//
// Testar a função de apresentação isolada não pega isso. Só o consumidor pega.

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "../data/client";
import { intervaloDePolling, proximoPolling } from "../data/analysis";
import { AnalysisPage } from "./AnalysisPage";
import pt from "@/i18n/pt.json";

vi.mock("@/shell/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: { id: "ws-1" } }) }));

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

function renderAt(id: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter initialEntries={[`/analyses/${id}`]}>
            <Routes>
              <Route path="/analyses/:analysisId" element={<AnalysisPage />} />
            </Routes>
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

describe("o relógio para em needs_mapping", () => {
  it("não agenda nova consulta", () => {
    // `false` = sem polling. Qualquer número aqui e o app bate no backend para sempre por uma
    // resposta que não muda sem uma pessoa — e o indicador de atividade conta ao usuário que
    // algo está em curso.
    expect(intervaloDePolling("needs_mapping")).toBe(false);
    expect(proximoPolling("needs_mapping", false)).toBe(false);
  });

  it("os estados que DE FATO progridem continuam sendo consultados", () => {
    // O contraste é a prova. Sem ele, um `return false` incondicional passaria neste arquivo e
    // congelaria a tela de toda análise em execução.
    for (const emCurso of ["queued", "running", "recovering", "preparing", "receiving"] as const) {
      expect(intervaloDePolling(emCurso), `${emCurso} parou de ser consultado`).not.toBe(false);
    }
  });
});

describe("a parada de mapping chega na tela", () => {
  it("mostra o que falta e oferece reconsultar — não um banner de fila mudo", async () => {
    // O backend é FORÇADO a devolver `needs_mapping`: sem isto o teste renderiza o estado
    // padrão do handler e afirma que a página montou, o que é verdade em qualquer estado e
    // portanto não prova nada sobre este.
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/an-map`, () =>
        HttpResponse.json(statusView("needs_mapping", { analysis_id: "an-map" })),
      ),
    );
    const { unmount } = renderAt("an-map");

    // A mensagem do produto, palavra por palavra. O provider renderiza em `en` por padrão; o
    // texto pt é conferido contra o dicionário no teste de i18n abaixo.
    await waitFor(() =>
      expect(
        screen.getByText("We need to confirm how some fields should be interpreted."),
      ).toBeTruthy(),
    );
    // A ação existe e é clicável — a tela não fica muda.
    expect(screen.getByRole("button", { name: "Check again" })).toBeTruthy();
    // E NÃO oferece retry: reenviar o mesmo arquivo daria o mesmo resultado.
    expect(screen.queryByRole("button", { name: /try again|retry|tentar/i })).toBeNull();

    // M45.2 — E DIZ POR QUE NÃO ADIANTA INSISTIR.
    //
    // Esta frase existia só na Home. Quem clica no chip "Ação necessária" da lista aterrissa
    // AQUI, encontrava um botão de reconsultar e concluía que a confirmação dependia dela —
    // ficando a insistir num botão que nunca resolveria. O produto sabia o motivo e não o dizia
    // na tela onde a pessoa está.
    expect(
      screen.getByText("The operation that resolves this is not exposed in the public contract yet."),
      "a parada não diz que a operação que a resolve não existe",
    ).toBeTruthy();
    unmount();
  });

  it("o texto exato da parada existe e é o que o produto pediu", () => {
    const estado = (pt as Record<string, any>).canonicalAnalysis.state.needs_mapping;
    expect(estado.message).toBe("Precisamos confirmar como alguns campos devem ser interpretados.");
    // A ação existe em i18n: sem ela o botão renderizaria a chave crua na tela.
    expect(String((pt as Record<string, any>).canonicalAnalysis.action.checkAgain).trim().length)
      .toBeGreaterThan(0);
  });

  it("a página tem um `case` PRÓPRIO para needs_mapping, não o `default`", () => {
    // Cadeado estrutural, e o motivo dele é concreto: caindo no `default`, a parada renderiza
    // o mesmo banner de "na fila / executando" e nenhuma ação. O teste de render acima nao
    // discrimina isso sozinho porque os dois caminhos montam a pagina.
    const fonte = require("node:fs").readFileSync(
      require("node:path").resolve(__dirname, "AnalysisPage.tsx"),
      "utf-8",
    );
    expect(fonte).toContain('case "needs_mapping":');
    const trecho = fonte.slice(fonte.indexOf('case "needs_mapping":'), fonte.indexOf('case "completed":'));
    expect(trecho, "o case existe mas não oferece ação nenhuma").toContain("canonicalAnalysis.action.checkAgain");
  });
});

describe("statusView cobre o estado novo", () => {
  it("a fixture aceita needs_mapping (senão o teste de UI mede outra coisa)", () => {
    const v = statusView("needs_mapping", { analysis_id: "an-map" });
    expect(v.status).toBe("needs_mapping");
  });
});
