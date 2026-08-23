// A pergunta que faltava na jornada: **por quais campos agrupar?**
//
// ## O defeito que este arquivo fecha
//
// Medido na cadeia viva e com print em homologação: a visão **Medidas** nasce vazia em toda
// análise. Seis das sete seções em branco, e só a procedência preenchida.
//
// Não é defeito de tela. `AnalyticsView` tem o desenho inteiro — mapa de procedência em React
// Flow, distribuições, séries, concentração, índice de regiões. Ela não tem o que desenhar,
// porque **ninguém declara dimensão em nenhum momento da jornada**.
//
// O contrato de dimensões existe inteiro na Ingestão e é aceito por ela. O que faltava era a
// pergunta — e ela pertence a esta tela, onde a pessoa já está decidindo o que cada coluna é.
//
// ## Por que só os nomes
//
// Uma declaração de dimensão exige sete campos (tipo, papel semântico, classificação de
// privacidade, capacidades de agregação, teto de rótulo ou fuso). Perguntar "semantic role" a
// quem subiu uma planilha produz um carimbo que a pessoa não tem como conferir. Para o conjunto
// fechado de campos agrupáveis cada declaração é constante, e o Gateway a anexa.
//
// A tela pergunta a única coisa que só a pessoa sabe.

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

// Os mesmos dublês do arquivo irmão: sem eles a página tenta montar a casca e o contexto de
// autenticação, que não são o assunto aqui.
vi.mock("@/shell/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: { id: "ws-1" } }) }));

setupMsw();

let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

function renderAt(id: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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

/** O perfil que a tela recebe. `groupable_fields` vem do servidor, não de cor. */
function perfil(extra: Record<string, unknown> = {}) {
  return {
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
    optional_fields: ["channel", "timestamp"],
    groupable_fields: ["channel", "model", "policy", "source_type", "timestamp"],
    ...extra,
  };
}

/** Instala o perfil e captura o corpo REAL da confirmação. */
function instalar(perfilUsado: Record<string, unknown> = perfil()) {
  const enviados: Array<Record<string, unknown>> = [];
  server.use(
    http.get(`${MSW_BASE}/v1/analyses/an-dim`, () =>
      HttpResponse.json(statusView("needs_mapping", { analysis_id: "an-dim" })),
    ),
    http.get(`${MSW_BASE}/v1/analyses/an-dim/mapping`, () => HttpResponse.json(perfilUsado)),
    http.post(`${MSW_BASE}/v1/analyses/an-dim/mapping`, async ({ request }) => {
      enviados.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ analysis_id: "an-dim", ingestion_state: "mapped" });
    }),
  );
  return enviados;
}

describe("a tela pergunta por quais campos agrupar", () => {
  it("a seção nasce ESCONDIDA e aparece quando o campo ganha coluna", async () => {
    // Progressão, não omissão. Oferecer "agrupar por canal" antes de o canal ter coluna seria
    // um controle que não pode funcionar: a dimensão apontaria para uma coluna que o dataset
    // canônico não vai ter, e o Analytics projetaria grupos de nada.
    //
    // É a mesma disciplina do botão de submeter, que só existe no estado em que submeter
    // funciona.
    instalar();
    const { unmount } = renderAt("an-dim");

    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );
    expect(screen.queryByText("Group the results by")).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText(/Channel/) as HTMLSelectElement, "canal");

    await waitFor(() => expect(screen.getByText("Group the results by")).toBeTruthy());
    expect(screen.getByRole("checkbox", { name: /Channel/ })).toBeTruthy();
    // E os agrupáveis sem coluna continuam fora: `model`, `policy` e `source_type` estão na
    // lista do servidor e não têm origem escolhida.
    expect(screen.queryByRole("checkbox", { name: /Model/ })).toBeNull();
    unmount();
  });

  it("`source_type` e `policy` mostram ROTULO, nao o identificador tecnico", async () => {
    // Os dois campos entraram no contrato do Gateway na mesma fatia das dimensoes, e chegaram a
    // tela SEM rotulo: o `default` do `rotuloDoCampo` devolve o proprio nome, e a pessoa lia
    // `source_type` ao lado de "Channel" e "Date and time".
    //
    // O fallback esta certo — inventar rotulo para campo desconhecido seria pior. O defeito era
    // publicar campo no backend e nao ensinar o nome dele aqui.
    //
    // Medido em homologacao antes do conserto: os dois seletores saiam com o slug cru.
    instalar(perfil({ optional_fields: ["channel", "timestamp", "source_type", "policy"] }));
    const { unmount } = renderAt("an-dim");

    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );
    expect(screen.getByLabelText("Source type")).toBeTruthy();
    expect(screen.getByLabelText("Policy")).toBeTruthy();
    // E o identificador tecnico nao sobra em lugar nenhum da tela.
    expect(screen.queryByText("source_type")).toBeNull();
    unmount();
  });

  it("o corpo enviado carrega `group_by` com o que foi marcado", async () => {
    // A asserção que importa: a marcação tem de CHEGAR ao servidor. Um checkbox que muda estado
    // local e não viaja é decoração — a tela pareceria funcionar e Medidas continuaria vazia,
    // que é exatamente o defeito difícil de enxergar aqui.
    const enviados = instalar();
    const { unmount } = renderAt("an-dim");

    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );
    await userEvent.selectOptions(screen.getByLabelText(/Channel/) as HTMLSelectElement, "canal");
    await userEvent.click(await screen.findByRole("checkbox", { name: /Channel/ }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));

    await waitFor(() => expect(enviados.length).toBe(1));
    expect(enviados[0].group_by).toEqual(["channel"]);
    // E as regras continuam indo inteiras: o campo novo não pode ter comido o antigo.
    expect(enviados[0].rules).toMatchObject({
      conversation_id: { source: "conversa" },
      assistant_text: { source: "resposta" },
      channel: { source: "canal" },
    });
    unmount();
  });

  it("sem marcar nada, `group_by` viaja VAZIO — e viaja", async () => {
    // Vazio AFIRMA "ninguém quis agrupar"; ausente não diz nada. A Ingestão distingue os dois,
    // e é por isso que a chave vai mesmo vazia.
    const enviados = instalar();
    const { unmount } = renderAt("an-dim");

    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));

    await waitFor(() => expect(enviados.length).toBe(1));
    expect(enviados[0].group_by).toEqual([]);
    unmount();
  });

  it("desmarcar a COLUNA tira o campo do envio, mesmo já marcado", async () => {
    // O caso que um estado guardado esconderia: a pessoa marca "agrupar por canal", muda de
    // ideia sobre a coluna e deixa o canal sem origem. Se o agrupamento fosse enviado como
    // está, o corpo pediria para agrupar por um campo que não vai existir — e o Gateway
    // recusaria a confirmação inteira, na cara de quem clicou.
    const enviados = instalar();
    const { unmount } = renderAt("an-dim");

    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );
    const canal = screen.getByLabelText(/Channel/) as HTMLSelectElement;
    await userEvent.selectOptions(canal, "canal");
    await userEvent.click(await screen.findByRole("checkbox", { name: /Channel/ }));
    await userEvent.selectOptions(canal, "");

    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    await waitFor(() => expect(enviados.length).toBe(1));
    expect(enviados[0].group_by).toEqual([]);
    unmount();
  });

  it("sem nenhum campo agrupável, a seção nunca aparece", async () => {
    // Uma seção vazia explicando que está vazia é a mesma armadilha da visão Medidas: parece
    // defeito quando está certa. Aqui não há decisão a tomar, e o silêncio é honesto.
    instalar(perfil({ groupable_fields: [], optional_fields: [] }));
    const { unmount } = renderAt("an-dim");

    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );
    expect(screen.queryByText("Group the results by")).toBeNull();
    unmount();
  });
});
