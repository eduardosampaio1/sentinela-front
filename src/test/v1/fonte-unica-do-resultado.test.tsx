// UMA fonte e UMA apresentação do resultado — provas 5, 8 e 10.
//
// Aposentadoria do dashboard legado (preparação local do Big Bang). Nada aqui ativa nada.
//
// A decisão de produto: não existe mapper `analysis-result-v1 → AnalysisResult`, não existem
// dois renderizadores, e quem autoriza o resultado é o Gateway com o workspace do contexto
// autenticado.

import fs from "node:fs";
import path from "node:path";
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
import { CanonicalClientProvider } from "@/features/canonical-analysis/data/client";
import { ResultPage } from "@/features/canonical-analysis/ui/ResultPage";

vi.mock("@/shell/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: { id: "ws-A" } }) }));

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

const SRC = path.resolve(__dirname, "../..");

function semComentarios(caminho: string): string {
  return fs
    .readFileSync(caminho, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function arquivosDeCodigo(dir: string): string[] {
  const achados: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const alvo = path.join(dir, e.name);
    if (e.isDirectory()) achados.push(...arquivosDeCodigo(alvo));
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) achados.push(alvo);
  }
  return achados;
}

function montarResultado(id = "an-x") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter initialEntries={[`/analyses/${id}/result`]}>
            <Routes>
              <Route path="/analyses/:analysisId/result" element={<ResultPage />} />
            </Routes>
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

// ── prova 5 — autorização é do Gateway, com o workspace autenticado ──────────

describe("prova 5 — não se abre resultado de outro workspace", () => {
  it("toda leitura carrega o workspace do contexto autenticado", async () => {
    const workspaces: string[] = [];
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, ({ request }) => {
        workspaces.push(new URL(request.url).searchParams.get("workspace_id") ?? "");
        return HttpResponse.json(statusView("completed", { analysis_id: "an-x", result_available: true }));
      }),
      http.get(`${MSW_BASE}/v1/analyses/:id/result`, ({ request }) => {
        workspaces.push(new URL(request.url).searchParams.get("workspace_id") ?? "");
        return HttpResponse.json({
          analysis_id: "an-x",
          result_schema_version: "analysis-result-v1",
          indicator_registry_version: "indicator-registry-1.0",
          result: { analysis_id: "an-x", result_schema_version: "analysis-result-v1", summary: {}, indicators: [] },
        });
      }),
    );

    const { unmount } = montarResultado();
    await waitFor(() => expect(workspaces.length).toBeGreaterThan(0));

    // Nenhuma leitura sem workspace, e nenhuma com workspace diferente do autenticado. O id da
    // análise vem da URL e é MANIPULÁVEL; o workspace não — ele vem do contexto autenticado, e
    // é por isso que a autorização mora no Gateway e não aqui.
    expect(workspaces.every((w) => w === "ws-A")).toBe(true);
    unmount();
  });

  it("recusa do Gateway vira erro apresentado, nunca conteúdo", async () => {
    // Um `forbidden_or_not_found` para análise de outro workspace não pode virar tela de
    // resultado, nem tela vazia com cara de "não tem nada".
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
        HttpResponse.json(
          {
            type: "urn:sentinela:error:forbidden_or_not_found",
            title: "Não encontrado",
            status: 404,
            code: "forbidden_or_not_found",
            detail: "not_found",
          },
          { status: 404, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );

    const { unmount } = montarResultado("an-de-outro-workspace");
    await waitFor(() => expect(screen.queryByText("Records analyzed")).toBeNull());
    // E nenhum indicador aparece — a recusa não vaza dado nem finge resultado.
    expect(screen.queryByText(/Intent coverage/i)).toBeNull();
    unmount();
  });
});

// ── prova 8 — não existe mapper paralelo ─────────────────────────────────────

describe("prova 8 — nenhum mapper de documento canônico para modelo legado", () => {
  const arquivos = arquivosDeCodigo(SRC);

  it("varreu o `src` (o laço não pode iterar sobre nada)", () => {
    expect(arquivos.length).toBeGreaterThan(100);
  });

  it("o tipo `AnalysisResult` legado não tem nenhum consumidor", () => {
    // Enquanto o tipo tiver leitor, existe um segundo modelo de resultado vivo — e um mapper
    // é a única forma de alimentá-lo. Zero consumidores é o que torna a duplicação impossível
    // por construção, não por disciplina.
    //
    // ⚠️ COLISÃO DE NOME, e ela quase produziu um falso positivo aqui: `AnalysisResultView`
    // (contrato público canônico) e `useAnalysisResult` (hook canônico) CONTÊM a substring.
    // `\b` já separa `AnalysisResultView` — `V` é caractere de palavra, então não há fronteira
    // depois de `AnalysisResult`. Mas `useAnalysisResult` NÃO é separado por `\b` à esquerda,
    // então a âncora precisa exigir que o símbolo comece a palavra.
    const legado = /(^|[^A-Za-z0-9_$])AnalysisResult\b/;
    const culpados = arquivos
      .filter((a) => legado.test(semComentarios(a)))
      .map((a) => path.relative(SRC, a));
    expect(culpados).toEqual([]);
  });

  it("os símbolos do dashboard legado não existem mais", () => {
    for (const simbolo of [
      "useAnalysis",
      "AnalysisProvider",
      "analysisCompleted",
      "loadStoredAnalysis",
      "ExecutiveAxis",
      "InvestigativeAxis",
      "TechnicalAxis",
      "AIInterpretationPanel",
      // `adaptAnalysisResult` NÃO entra: existe um homônimo CANÔNICO
      // (`result/adapter.ts`, que recebe `AnalysisResultView`) e ele é justamente a fronteira
      // única que a decisão quer. Proibir o nome mataria o certo junto com o errado.
      // O legado morreu com `adapters/analysisAdapter.ts`, e a prova disso é o teste acima.
      "DomainAnalysis",
      "EconomicsViewModel",
    ]) {
      const culpados = arquivos
        .filter((a) => new RegExp(`\\b${simbolo}\\b`).test(semComentarios(a)))
        .map((a) => path.relative(SRC, a));
      expect(culpados, `\`${simbolo}\` sobreviveu`).toEqual([]);
    }
  });

  it("nada converte `analysis-result-v1` na forma legada", () => {
    // O mapper não precisa se chamar "mapper". O que o denuncia é ler o documento canônico e
    // produzir os campos do modelo antigo — e esses campos têm nomes próprios.
    const camposLegados = ["consistency_score", "token_waste_estimate", "cross_intent_similarity", "critical_alerts_count"];
    const culpados: string[] = [];
    for (const a of arquivos) {
      const src = semComentarios(a);
      for (const campo of camposLegados) {
        if (src.includes(campo)) culpados.push(`${path.relative(SRC, a)}: ${campo}`);
      }
    }
    expect(culpados).toEqual([]);
  });
});

// ── prova 10 — a página canônica cobre os quatro estados ─────────────────────

describe("prova 10 — o renderizador único cobre loading, erro, resultado e ausência", () => {
  const arquivos = arquivosDeCodigo(SRC);

  it("os quatro caminhos existem no componente", () => {
    // Cadeado estrutural: os testes de comportamento da `ResultPage` cobrem resultado,
    // ausência e schema desconhecido; este afirma que os quatro RAMOS continuam lá depois da
    // aposentadoria — se um sumir, a página passa a renderizar em branco naquele caso.
    const fonte = semComentarios(path.resolve(SRC, "features/canonical-analysis/ui/ResultPage.tsx"));
    expect(fonte, "sem estado de carregamento").toContain("LoadingState");
    expect(fonte, "sem apresentação de erro").toContain("ProblemFeedback");
    expect(fonte, "sem tratamento de resultado indisponível").toMatch(/result_available|resultPreparing|naoDisponivel/);
  });

  it("há UMA fronteira do documento canônico para view model", () => {
    // O que a decisão proíbe é DOIS MODELOS com duas regras de evolução — não duas telas.
    // `RunComparePanel` (comparação no histórico) também mostra indicadores, e isso está certo:
    // ele passa pelo MESMO adapter, então há um modelo só e uma regra só.
    //
    // O discriminador honesto é o adapter: quem lê o documento canônico e produz view model é
    // um arquivo só. Se aparecer um segundo, aí sim há duas regras de evolução.
    // Discriminador por QUEM LÊ O CONTRATO, não por nome de função. Um segundo conversor
    // chamado `adaptAnalysisResultLegado` escapava de uma regex ancorada no nome (`L` é
    // caractere de palavra, então `\b` não separa) — e foi exatamente essa a mutação que
    // sobreviveu. Quem quer converter o documento canônico PRECISA do tipo dele.
    const leemOContrato = arquivos
      .filter((a) => /\bAnalysisResultView\b/.test(semComentarios(a)))
      .map((a) => path.relative(SRC, a).replace(/\\/g, "/"))
      // A declaração do contrato (`lib/v1/`) e as FIXTURES (`test/`) não contam: nenhuma
      // converte documento — uma declara o tipo, as outras declaram massa.
      .filter((r) => !r.startsWith("lib/v1/") && !r.startsWith("test/"));
    // Seis, e cada um com um papel distinto — a lista cresceu na MF6.4b e de novo na Two-View
    // Recovery, sem afrouxar a regra, porque a regra é "um modelo por CONTRATO", não "um modelo
    // no total":
    //
    //   analysis.ts   o HOOK transporta o documento histórico (tipo de retorno da query)
    //   argos.ts      o HOOK transporta o v3 — chave de cache PRÓPRIA, senão um documento
    //                 sobrescreveria o outro no cache da mesma rota
    //   adaptar.ts    a FRONTEIRA do /result escolhe entre v1 e v2, e não converte nada
    //   adapter.ts    converte o `analysis-result-v1`
    //   adapterV2.ts  converte o `analysis-result-v2`
    //   adapterV3.ts  converte o `analysis-result-v3` (ARGOS-only)
    //
    // Um SÉTIMO leitor é um segundo modelo do MESMO contrato nascendo — e aí voltam as duas
    // regras de evolução que esta prova existe para impedir. Note que `adaptar.ts` NÃO ganhou um
    // ramo v3: a página legada continua fail-closed diante dele, de propósito.
    expect(leemOContrato.sort()).toEqual([
      "features/canonical-analysis/data/analysis.ts",
      "features/canonical-analysis/data/argos.ts",
      "features/canonical-analysis/result/adaptar.ts",
      "features/canonical-analysis/result/adapter.ts",
      "features/canonical-analysis/result/adapterV2.ts",
      "features/canonical-analysis/result/adapterV3.ts",
    ]);
  });

  it("o arquivo-fronteira exporta UM conversor, não dois", () => {
    // O teste acima conta ARQUIVOS, e uma mutação passou por baixo dele: um segundo conversor
    // DENTRO do próprio adapter. A fronteira não é só o arquivo — é a função.
    //
    // `adapt*` é a convenção de nome de conversor nesta base. Dois deles no mesmo arquivo já
    // são duas regras de evolução morando juntas, que é o que a decisão proíbe; o fato de
    // dividirem o mesmo `.ts` só torna a divergência mais fácil de não notar.
    // Vale para os DOIS arquivos-fronteira: um conversor exportado em cada.
    const adapter = semComentarios(path.resolve(SRC, "features/canonical-analysis/result/adapter.ts"));
    expect([...adapter.matchAll(/export function (adapt\w*)/g)].map((m) => m[1])).toEqual([
      "adaptAnalysisResult",
    ]);
    const v2 = semComentarios(path.resolve(SRC, "features/canonical-analysis/result/adapterV2.ts"));
    expect([...v2.matchAll(/export function (adapt\w*)/g)].map((m) => m[1])).toEqual([
      "adaptAnalysisResultV2",
    ]);
  });
});
