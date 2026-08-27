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
import { intervaloDePolling, proximoPolling } from "../data/analysis";
import { AnalysisPage } from "./AnalysisPage";
import pt from "@/i18n/pt.json";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * O recorte do bundle PT que este arquivo lê — M46.
 *
 * Aqui havia `Record<string, any>`, e `any` desliga a checagem justamente onde ela pagaria: se
 * `state.needs_mapping` for renomeado, `any` deixa o acesso compilar e o teste quebra em runtime
 * com "cannot read property of undefined". Com este tipo, o compilador acusa antes.
 */
interface BundlePt {
  canonicalAnalysis: {
    state: { needs_mapping: { message: string } };
    action: { checkAgain: string };
    mapping: { title: string };
  };
}

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
  it("oferece o EDITOR — não mais um botão que reconsulta", async () => {
    // ## O que este caso media, e o que passou a medir
    //
    // Ele afirmava que a tela dizia *"a operação que resolve isto não está exposta no contrato
    // público"* e oferecia só reconsultar. As duas coisas estavam certas: a operação não
    // existia, e um botão que fingisse abrir algo seria pior que a ausência.
    //
    // As duas operações foram expostas (`GET`/`POST /v1/analyses/{id}/mapping`). A frase saiu do
    // produto junto com o motivo dela, e este caso passou a medir a saída em vez do impedimento.
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/an-map`, () =>
        HttpResponse.json(statusView("needs_mapping", { analysis_id: "an-map" })),
      ),
      http.get(`${MSW_BASE}/v1/analyses/an-map/mapping`, () =>
        HttpResponse.json({
          requires_decision: true,
          records_observed: 120,
          sample_truncated: false,
          format_id: "csv.v1",
          columns: [
            { name: "conversa", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 118 },
            { name: "resposta", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 90 },
          ],
          suggestion: { conversation_id: { source: "conversa" } },
          ambiguous: { assistant_text: ["resposta", "texto"] },
          required_fields: ["conversation_id", "assistant_text"],
          optional_fields: ["user_text"],
          groupable_fields: ["channel", "timestamp"],
        }),
      ),
    );
    const { unmount } = renderAt("an-map");

    // O editor chega, com o título que pede a decisão em vez de descrever a tela.
    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );
    expect(
      screen.getByRole("progressbar", { name: /analysis stage progress/i }),
    ).toHaveAttribute("aria-valuetext", expect.stringMatching(/Step 2 of 4.*Data protection/i));

    // A sugestão vem PREENCHIDA: obrigar a reconfirmar o que a máquina acertou transformaria
    // confirmação em digitação.
    const conversa = screen.getByLabelText(/Conversation ID/) as HTMLSelectElement;
    expect(conversa.value).toBe("conversa");

    // E o empate vem VAZIO, dito em texto: é o único campo onde a máquina chegou até o fim e
    // não conseguiu escolher.
    const resposta = screen.getByLabelText(/Assistant reply/) as HTMLSelectElement;
    expect(resposta.value).toBe("");
    expect(screen.getByText(/More than one column fits/)).toBeTruthy();

    // NÃO oferece retry: reenviar o mesmo arquivo daria o mesmo resultado.
    expect(screen.queryByRole("button", { name: /try again|retry|tentar/i })).toBeNull();
    // E não afirma mais que a operação não existe — ela existe.
    expect(screen.queryByText(/not exposed in the public contract/i)).toBeNull();
    unmount();
  });

  it("campo sem candidato NÃO usa a frase do empate", async () => {
    // ## Medido no arquivo real, em homologação
    //
    //   suggestion: channel, intent, session_id, timestamp, user_text
    //   ambiguous:  {}
    //   colunas:    assistant_response, ..., event_id, session_id, ...
    //
    // Os DOIS campos obrigatórios vieram sem sugestão E sem empate. A tela mostrava dois
    // seletores vazios e nenhuma frase — a explicação escrita só existia para o empate.
    //
    // Vazio sem explicação lê como defeito da tela, que é o oposto do que ela existe para
    // fazer: dizer o que a máquina soube e o que ela não soube.
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/an-map`, () =>
        HttpResponse.json(statusView("needs_mapping", { analysis_id: "an-map" })),
      ),
      http.get(`${MSW_BASE}/v1/analyses/an-map/mapping`, () =>
        HttpResponse.json({
          requires_decision: true,
          records_observed: 500,
          sample_truncated: false,
          format_id: "csv.v1",
          columns: [
            { name: "assistant_response", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 480 },
            { name: "event_id", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 500 },
            { name: "user_message", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 470 },
          ],
          // A máquina reconheceu o opcional e NENHUM dos obrigatórios.
          suggestion: { user_text: { source: "user_message" } },
          ambiguous: {},
          required_fields: ["conversation_id", "assistant_text"],
          optional_fields: ["user_text"],
          groupable_fields: ["channel", "timestamp"],
        }),
      ),
    );
    const { unmount } = renderAt("an-map");

    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );

    // Uma frase por campo obrigatório vazio — e são dois.
    const semCandidato = screen.getAllByText(
      "We did not recognize any column for this field. Pick it yourself.",
    );
    expect(semCandidato.length).toBe(2);

    // E NUNCA a frase do empate: dizer "mais de uma coluna serve" quando nenhuma serviu
    // manda a pessoa procurar um segundo candidato que não existe.
    expect(screen.queryByText(/More than one column fits/)).toBeNull();
    unmount();
  });

  it("não bloqueia a confirmação por contagem pequena do perfil", async () => {
    // `records_observed` vem do perfil de mapping, não da contagem final da base inteira. A
    // trava de volume mínimo mora depois que a Ingestão mede tudo; antes disso, bloquear aqui
    // penaliza base grande por uma leitura parcial/inicial.
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/an-small`, () =>
        HttpResponse.json(statusView("needs_mapping", { analysis_id: "an-small" })),
      ),
      http.get(`${MSW_BASE}/v1/analyses/an-small/mapping`, () =>
        HttpResponse.json({
          requires_decision: true,
          records_observed: 29,
          sample_truncated: false,
          format_id: "jsonl",
          columns: [
            { name: "assistant_text", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 21 },
            { name: "conversation_id", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 29 },
          ],
          suggestion: {
            assistant_text: { source: "assistant_text" },
            conversation_id: { source: "conversation_id" },
          },
          ambiguous: {},
          required_fields: ["assistant_text"],
          optional_fields: ["conversation_id"],
          groupable_fields: ["timestamp"],
        }),
      ),
    );
    const { unmount } = renderAt("an-small");

    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );

    expect(screen.queryByText("We need a larger dataset")).toBeNull();
    expect(screen.getByRole("button", { name: "Confirm and continue" })).toBeEnabled();
    unmount();
  });

  it("mantém o editor quando a amostra foi truncada, porque 29 observadas não é o total", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/an-sample`, () =>
        HttpResponse.json(statusView("needs_mapping", { analysis_id: "an-sample" })),
      ),
      http.get(`${MSW_BASE}/v1/analyses/an-sample/mapping`, () =>
        HttpResponse.json({
          requires_decision: true,
          records_observed: 29,
          sample_truncated: true,
          format_id: "jsonl",
          columns: [
            { name: "assistant_text", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 21 },
          ],
          suggestion: {
            assistant_text: { source: "assistant_text" },
          },
          ambiguous: {},
          required_fields: ["assistant_text"],
          optional_fields: [],
          groupable_fields: [],
        }),
      ),
    );
    const { unmount } = renderAt("an-sample");

    await waitFor(() =>
      expect(screen.getByText("Tell us which column is which")).toBeTruthy(),
    );
    expect(screen.queryByText("We need a larger dataset")).toBeNull();
    unmount();
  });

  it("não acusa antes da tentativa, e acusa depois dela", async () => {
    // ## O defeito que este caso trava
    //
    // O campo obrigatório vazio nascia com `border-destructive` — a tela abria em vermelho para
    // quem nem tinha tocado nela. A acusação era falsa duas vezes: ninguém errou nada ainda, e o
    // campo está vazio porque a MÁQUINA não conseguiu escolher entre duas colunas.
    //
    // Cor não é testável em jsdom; `aria-invalid` é — e é o mesmo fato, dito para quem não vê a
    // borda. Travar o atributo trava os dois: eles saem da mesma condição.
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/an-map`, () =>
        HttpResponse.json(statusView("needs_mapping", { analysis_id: "an-map" })),
      ),
      http.get(`${MSW_BASE}/v1/analyses/an-map/mapping`, () =>
        HttpResponse.json({
          requires_decision: true,
          records_observed: 120,
          sample_truncated: false,
          format_id: "csv.v1",
          columns: [
            { name: "conversa", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 118 },
            { name: "resposta", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 90 },
          ],
          suggestion: { conversation_id: { source: "conversa" } },
          ambiguous: { assistant_text: ["resposta", "texto"] },
          required_fields: ["conversation_id", "assistant_text"],
          optional_fields: [],
          groupable_fields: ["channel", "timestamp"],
        }),
      ),
    );
    const { unmount } = renderAt("an-map");

    const vazio = (await screen.findByLabelText(/Assistant reply/)) as HTMLSelectElement;
    expect(vazio.value).toBe("");
    // ANTES de tentar: vazio, sim; reprovado, não.
    expect(vazio.getAttribute("aria-invalid")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));

    // DEPOIS de tentar: agora é erro de verdade — a pessoa pediu para seguir e não dá.
    await waitFor(() => expect(vazio.getAttribute("aria-invalid")).toBe("true"));
    // E o erro NOMEIA o campo, em vez de dizer "preencha os campos obrigatórios".
    expect(screen.getByRole("alert").textContent).toContain("Assistant reply");

    // Escolher limpa a acusação sem exigir nova tentativa.
    await userEvent.selectOptions(vazio, "resposta");
    await waitFor(() => expect(vazio.getAttribute("aria-invalid")).toBeNull());
    unmount();
  });

  it("falha ao LER o perfil não vira \"a análise falhou\" nem \"a capability não existe\"", async () => {
    // Três coisas diferentes, e colapsá-las é o defeito clássico desta superfície: a análise
    // parada, a leitura do perfil falhando, e a operação inexistente. A terceira deixou de
    // existir; as duas primeiras continuam distintas, e a frase precisa dizer QUAL é.
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/an-map`, () =>
        HttpResponse.json(statusView("needs_mapping", { analysis_id: "an-map" })),
      ),
      http.get(`${MSW_BASE}/v1/analyses/an-map/mapping`, () =>
        HttpResponse.json({ code: "temporarily_unavailable" }, { status: 503 }),
      ),
    );
    const { unmount } = renderAt("an-map");

    await waitFor(() =>
      expect(screen.getByText("We could not read the file's columns right now.")).toBeTruthy(),
    );
    // Aqui o botão de reconsultar CONTINUA fazendo sentido: o que falhou foi a leitura.
    expect(screen.getByRole("button", { name: "Check again" })).toBeTruthy();
    unmount();
  });

  it("o texto exato da parada existe e é o que o produto pediu", () => {
    const estado = (pt as unknown as BundlePt).canonicalAnalysis.state.needs_mapping;
    expect(estado.message).toBe("Precisamos confirmar como alguns campos devem ser interpretados.");
    // A ação existe em i18n: sem ela o botão renderizaria a chave crua na tela.
    expect(String((pt as unknown as BundlePt).canonicalAnalysis.action.checkAgain).trim().length)
      .toBeGreaterThan(0);
    // O editor tem título próprio em PT: sem ele a tela renderizaria a chave crua.
    expect((pt as unknown as BundlePt).canonicalAnalysis.mapping.title)
      .toBe("Diga qual coluna \u00e9 qual");
  });

  it("a página tem um `case` PRÓPRIO para needs_mapping, não o `default`", () => {
    // Cadeado estrutural, e o motivo dele é concreto: caindo no `default`, a parada renderiza
    // o mesmo banner de "na fila / executando" e nenhuma ação. O teste de render acima nao
    // discrimina isso sozinho porque os dois caminhos montam a pagina.
    const fonte = readFileSync(resolve(__dirname, "AnalysisPage.tsx"), "utf-8");
    expect(fonte).toContain('case "needs_mapping"');
    const trecho = fonte.slice(fonte.indexOf('case "needs_mapping"'), fonte.indexOf('case "completed":'));
    // O que o `case` precisa oferecer MUDOU: era uma ação qualquer (reconsultar), passou a ser o
    // editor. Um `case` que só reconsultasse voltaria a ser o beco sem saída — com a agravante
    // de a capability existir e a tela não a alcançar.
    expect(trecho, "o case existe mas não abre o editor").toContain("<MappingStep");
  });
});

describe("statusView cobre o estado novo", () => {
  it("a fixture aceita needs_mapping (senão o teste de UI mede outra coisa)", () => {
    const v = statusView("needs_mapping", { analysis_id: "an-map" });
    expect(v.status).toBe("needs_mapping");
  });
});
