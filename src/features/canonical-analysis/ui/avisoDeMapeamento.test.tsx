// O AVISO de escolha implausível, na tela.
//
// `plausibilidadeDoMapeamento.test.ts` prova a REGRA. Este arquivo prova a FIAÇÃO: que a tela
// a consulta, mostra o texto e liga o aviso ao campo por `aria-describedby`. Sem ele, a regra
// poderia estar correta e nunca ser chamada — que é o defeito recorrente desta base.
//
// ## O caso que originou
//
// Em homologação (2026-08-24) a coluna `canal` foi mapeada em "Date and time". A ingestão
// recusou **os 360 registros** com `invalid_field_type`, e a tela disse apenas "Couldn't
// complete". Um erro de mapeamento custou um ciclo inteiro.

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";

import { CanonicalClientProvider } from "../data/client";
import { AnalysisPage } from "./AnalysisPage";

vi.mock("@/shell/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: { id: "ws-1" } }) }));

setupMsw();

let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

const ID = "an-aviso";

/** `canal` repete (2 em 120); `quando` não (120 em 120). É a diferença que a regra lê. */
const PERFIL = {
  requires_decision: true,
  records_observed: 120,
  sample_truncated: false,
  format_id: "csv.v1",
  columns: [
    { name: "conversa", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 118 },
    { name: "resposta", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 90 },
    { name: "canal", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 2 },
    { name: "quando", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 120 },
  ],
  suggestion: {
    conversation_id: { source: "conversa" },
    assistant_text: { source: "resposta" },
  },
  ambiguous: {},
  required_fields: ["conversation_id", "assistant_text"],
  optional_fields: ["timestamp"],
  groupable_fields: ["timestamp"],
};

function instalar() {
  server.use(
    http.get(`${MSW_BASE}/v1/analyses/${ID}`, () =>
      HttpResponse.json(statusView("needs_mapping", { analysis_id: ID })),
    ),
    http.get(`${MSW_BASE}/v1/analyses/${ID}/mapping`, () => HttpResponse.json(PERFIL)),
  );
}

function renderizar() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter initialEntries={[`/analyses/${ID}`]}>
            <Routes>
              <Route path="/analyses/:analysisId" element={<AnalysisPage />} />
            </Routes>
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

/** O seletor do campo temporal, esperando o editor montar. */
async function seletorDeData() {
  return waitFor(() => screen.getByLabelText(/date and time/i));
}

describe("o aviso de escolha implausível", () => {
  it("aparece quando uma coluna que se repete vai para Date and time", async () => {
    instalar();
    renderizar();

    const campo = await seletorDeData();
    await userEvent.selectOptions(campo, "canal");

    const aviso = await screen.findByText(/repeats too much to be a date/i);
    expect(aviso).toBeInTheDocument();
  });

  it("liga o aviso ao campo por `aria-describedby`", async () => {
    // Sem isto o aviso existe ao LADO do campo e não faz parte dele: um leitor de tela anuncia
    // o seletor sem a dúvida que o acompanha.
    instalar();
    renderizar();

    const campo = await seletorDeData();
    await userEvent.selectOptions(campo, "canal");

    await waitFor(() => expect(campo).toHaveAttribute("aria-describedby"));
    const id = campo.getAttribute("aria-describedby")!;
    expect(document.getElementById(id)).toHaveTextContent(/repeats too much/i);
  });

  it("NÃO aparece quando a coluna temporal correta é escolhida", async () => {
    // A contraparte. Sem ela, uma tela que avisasse SEMPRE passaria nos dois casos acima — e um
    // aviso que aparece em mapeamento bom treina a pessoa a ignorá-lo.
    instalar();
    renderizar();

    const campo = await seletorDeData();
    await userEvent.selectOptions(campo, "quando");

    await waitFor(() => expect(campo).toHaveValue("quando"));
    expect(screen.queryByText(/repeats too much to be a date/i)).not.toBeInTheDocument();
    expect(campo).not.toHaveAttribute("aria-describedby");
  });

  it("o aviso NÃO bloqueia — o campo continua utilizável", async () => {
    // Decisão registrada: o perfil da Ingestão é "descrição, nunca julgamento". Bloquear com
    // base nele barraria um dataset legítimo de forma incomum.
    instalar();
    renderizar();

    const campo = await seletorDeData();
    await userEvent.selectOptions(campo, "canal");
    await screen.findByText(/repeats too much to be a date/i);

    expect(campo).not.toBeDisabled();
    expect(campo).toHaveValue("canal");
  });
});
