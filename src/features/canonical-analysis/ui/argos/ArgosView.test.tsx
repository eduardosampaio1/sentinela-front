// F3 — as regras da visão ARGOS, provadas contra o documento REAL do backend.
//
// A massa não é escrita nesta casa: é `analysis-result-v3.real.json`, a resposta literal de
// `GET /v1/analyses/{id}/result?result_schema_version=3`, gravada pela prova P10 do
// `sentinela-orchestrator`. Uma massa local provaria que a tela sabe ler o que a própria tela
// inventou.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import type { AnalysisResultV3Document } from "@/lib/v1/contract/public-v3.types";
import { ArgosView } from "./ArgosView";

const RAIZ = resolve(__dirname, "../../../../..");
const ARTEFATO = resolve(
  RAIZ,
  "../sentinela-facts/docs/contracts/e2e/analysis-result-v3.real.json",
);

/** O documento REAL, ou a recusa de fingir que ele existe. */
function documentoReal(): { envelope: unknown; doc: AnalysisResultV3Document } {
  const bruto = JSON.parse(readFileSync(ARTEFATO, "utf-8"));
  return { envelope: bruto.resposta, doc: bruto.resposta.result };
}

const chamadas: string[] = [];

function montar(envelope: unknown, statusHttp = 200) {
  chamadas.length = 0;
  const client = {
    getResult: vi.fn(async (_id: string, _scope: unknown, _opts: unknown, versao?: string) => {
      chamadas.push(`getResult:${versao ?? "SEM-VERSAO"}`);
      if (statusHttp !== 200) throw new Error(`http ${statusHttp}`);
      return envelope;
    }),
    getStatus: vi.fn(async () => {
      chamadas.push("getStatus");
      return { analysis_id: "an-abc", status: "completed", result_available: true };
    }),
    getAnalytics: vi.fn(async () => {
      chamadas.push("getAnalytics");
      return {};
    }),
  };
  return client;
}

vi.mock("@/shell/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

let clienteAtual: ReturnType<typeof montar>;
vi.mock("../../data/client", () => ({ useV1Client: () => clienteAtual }));
vi.mock("../scope", () => ({ useCanonicalScope: () => ({ workspaceId: "ws-1" }) }));

function renderizar(envelope: unknown, statusHttp = 200) {
  window.localStorage.setItem("sentinela:language", "pt");
  clienteAtual = montar(envelope, statusHttp);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/analyses/an-abc/argos"]}>
          <Routes>
            <Route path="/analyses/:analysisId/argos" element={<ArgosView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

beforeEach(() => {
  chamadas.length = 0;
});

describe("F3 · a visão ARGOS pede o v3 EXPLICITAMENTE", () => {
  it("o artefato real existe — sem ele estas provas não valeriam nada", () => {
    expect(existsSync(ARTEFATO), `artefato v3 ausente em ${ARTEFATO}`).toBe(true);
  });

  it("a requisição carrega `result_schema_version`", async () => {
    const { envelope } = documentoReal();
    renderizar(envelope);
    await waitFor(() => expect(chamadas).toContain("getResult:3"));
    // Nunca sem versão: sem ela a rota devolve o documento histórico, e a visão que existe para
    // mostrar o ARGOS inteiro mostraria o v1 achando que mostra o v3.
    expect(chamadas).not.toContain("getResult:SEM-VERSAO");
  });

  it("NÃO chama `/analytics` — a fonte é única", async () => {
    const { envelope } = documentoReal();
    renderizar(envelope);
    await waitFor(() => expect(chamadas).toContain("getResult:3"));
    expect(chamadas).not.toContain("getAnalytics");
  });
});

describe("F3 · sem v3 não há queda para o v1", () => {
  it("um documento de outra versão vira indisponibilidade explícita", async () => {
    // O pior desfecho seria adaptar o que veio: dez famílias ausentes lidas como "o ARGOS não
    // produziu nada", sem nada na tela que denuncie.
    renderizar({
      analysis_id: "an-abc",
      result_schema_version: "analysis-result-v1",
      indicator_registry_version: "1.0",
      result: { analysis_id: "an-abc", indicators: [] },
    });
    expect(
      await screen.findByText(pt.canonicalAnalysis.argos.unavailableTitle),
    ).toBeInTheDocument();
    expect(
      screen.getByText(pt.canonicalAnalysis.argos.refused.unknown_schema),
    ).toBeInTheDocument();
  });

  // M45.4 — os DOIS caminhos de indisponibilidade anunciam com a mesma polidez.
  //
  // Este caso nasceu de um defeito real: a recusa por esquema saía em `role="alert"` e a ausência
  // por `result_not_available` saía em `role="status"`, com o mesmo recado para quem lê. Nada
  // media isso — os testes daqui afirmavam o TEXTO, e texto não carrega polidez de anúncio.
  //
  // A asserção é dupla de propósito. Só exigir `status` deixaria passar uma tela que emite os
  // dois papéis ao mesmo tempo; exigir a ausência de `alert` é o que fecha.
  it("indisponibilidade é anunciada como estado, nunca como alerta", async () => {
    renderizar({
      analysis_id: "an-abc",
      result_schema_version: "analysis-result-v1",
      indicator_registry_version: "1.0",
      result: { analysis_id: "an-abc", indicators: [] },
    });
    const aviso = await screen.findByText(pt.canonicalAnalysis.argos.unavailableTitle);
    // O papel vive no CONTÊINER, não no parágrafo do título — subir por `closest` é o que mede
    // o elemento que o leitor de tela anuncia.
    expect(aviso.closest('[role="status"]'), "a recusa deveria anunciar como status").not.toBeNull();
    expect(aviso.closest('[role="alert"]'), "a recusa não pode interromper").toBeNull();
  });

  // M45.4 — a recusa diz o que RESTA acessível.
  //
  // O estado irmão (`noDocumentBody`) sempre terminou dizendo que o resultado histórico segue
  // disponível. A recusa não dizia nada, e quem lia saía achando que a análise inteira se perdeu.
  it("a recusa aponta o que continua acessível", async () => {
    renderizar({
      analysis_id: "an-abc",
      result_schema_version: "analysis-result-v1",
      indicator_registry_version: "1.0",
      result: { analysis_id: "an-abc", indicators: [] },
    });
    expect(
      await screen.findByText(pt.canonicalAnalysis.argos.stillAvailable),
      "recusa sem saída deixa a pessoa achando que perdeu a análise",
    ).toBeInTheDocument();
  });

  it("erro do produtor é apresentado, não substituído por outro documento", async () => {
    renderizar(null, 404);
    await waitFor(() => expect(chamadas).toContain("getResult:3"));
    expect(screen.queryByText(pt.canonicalAnalysis.argos.scores)).not.toBeInTheDocument();
  });
});

describe("F3 · o documento real na tela", () => {
  it("as quatro dimensões de saúde aparecem, e são quatro", async () => {
    const { envelope, doc } = documentoReal();
    renderizar(envelope);
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.argos.dimensions,
    });
    for (const rotulo of Object.values(pt.canonicalAnalysis.argos.dimension)) {
      expect(within(secao).getByText(rotulo)).toBeInTheDocument();
    }
    expect(doc.dimensions).toHaveLength(4);
  });

  it("família OMITIDA não vira seção vazia", async () => {
    // A distinção que a tela existe para carregar: ausente = a capacidade não foi produzida;
    // `[]` = ela rodou e não achou. Uma seção vazia para a ausente afirmaria "procuramos e não
    // há" — afirmação que ninguém fez.
    const { envelope, doc } = documentoReal();
    const omitidas = (["scores", "intents", "risks", "projections", "alerts", "issues"] as const)
      .filter((f) => doc[f] === undefined || doc[f] === null);
    expect(omitidas.length, "a massa não exercita omissão — a prova seria vazia").toBeGreaterThan(0);

    renderizar(envelope);
    await screen.findByRole("region", { name: pt.canonicalAnalysis.argos.dimensions });
    const titulos: Record<string, string> = {
      scores: pt.canonicalAnalysis.argos.scores,
      intents: pt.canonicalAnalysis.argos.intents,
      risks: pt.canonicalAnalysis.argos.risks,
      projections: pt.canonicalAnalysis.argos.projections,
      alerts: pt.canonicalAnalysis.argos.alerts,
      issues: pt.canonicalAnalysis.argos.issues,
    };
    for (const familia of omitidas) {
      expect(
        screen.queryByRole("region", { name: titulos[familia] }),
        `${familia} está omitida no documento e ganhou seção na tela`,
      ).not.toBeInTheDocument();
    }
  });

  it("nenhuma medição sem valor mostra zero", async () => {
    const { envelope } = documentoReal();
    renderizar(envelope);
    await screen.findByRole("region", { name: pt.canonicalAnalysis.argos.indicators });
    for (const linha of document.querySelectorAll('[data-sem-valor="true"]')) {
      expect(linha.textContent?.trim()).not.toBe("0");
      expect(linha.textContent?.trim()).not.toBe("0,00");
    }
  });

  it("a procedência da montagem é publicada", async () => {
    // É ela que explica um output que aparece ou some entre duas execuções.
    const { envelope, doc } = documentoReal();
    renderizar(envelope);
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.argos.provenance,
    });
    expect(within(secao).getByText(doc.argos_catalog_version)).toBeInTheDocument();
  });
});

describe("F3 · severidade e faixa vêm do produtor, nunca do navegador", () => {
  /** Um documento mínimo com alertas — a massa real não os exercita. */
  function comAlertas() {
    const { doc } = documentoReal();
    return {
      analysis_id: "an-abc",
      result_schema_version: "analysis-result-v3",
      indicator_registry_version: doc.indicator_registry_version,
      result: {
        ...doc,
        alerts: [
          { id: "a1", code: "COST_SPIKE", title: "Custo subiu", severity: "critical" },
          { id: "a2", code: "LOW_SAMPLE", title: "Amostra baixa", severity: "info" },
        ],
      },
    };
  }

  it("a severidade que SAI é a que ENTROU — nenhuma é recalculada", async () => {
    // Esta é a defesa que importa depois de o cadeado textual passar a permitir a palavra:
    // ele não distingue consumir de fabricar, e o comportamento distingue.
    renderizar(comAlertas());
    const secao = await screen.findByRole("region", { name: pt.canonicalAnalysis.argos.alerts });
    expect(within(secao).getByText("critical")).toBeInTheDocument();
    expect(within(secao).getByText("info")).toBeInTheDocument();
    // E nenhuma severidade que o documento não trouxe aparece na tela.
    for (const inventada of ["high", "medium", "low", "warning"]) {
      expect(within(secao).queryByText(inventada)).not.toBeInTheDocument();
    }
  });

  it("a ordem dos alertas é a do documento — a tela não reordena por severidade", async () => {
    // Reordenar por gravidade seria priorização decidida no navegador: `critical` viria antes de
    // `info` porque a tela achou que devia, não porque o produtor disse.
    renderizar(comAlertas());
    const secao = await screen.findByRole("region", { name: pt.canonicalAnalysis.argos.alerts });
    const titulos = within(secao)
      .getAllByRole("listitem")
      .map((li) => li.textContent ?? "");
    expect(titulos[0]).toContain("Custo subiu");
    expect(titulos[1]).toContain("Amostra baixa");
  });

  it("sem `band`, nenhuma faixa nasce na tela", async () => {
    const { doc } = documentoReal();
    renderizar({
      analysis_id: "an-abc",
      result_schema_version: "analysis-result-v3",
      indicator_registry_version: doc.indicator_registry_version,
      result: {
        ...doc,
        risks: [
          {
            id: "risco_x",
            measurement: {
              id: "risco_x",
              value: 0.42,
              availability: "available",
              reason: "ok",
              scale: { kind: "ratio_unit" },
            },
          },
        ],
      },
    });
    const secao = await screen.findByRole("region", { name: pt.canonicalAnalysis.argos.risks });
    expect(secao.querySelector("[data-band]")).toBeNull();
    expect(within(secao).queryByText(pt.canonicalAnalysis.argos.band)).not.toBeInTheDocument();
  });
});

describe("F3 · conclusão antes de evidência, sem escada de gravidade", () => {
  const G = pt.canonicalAnalysis.argos;

  /** Documento com as duas metades: uma conclusão e uma medição. */
  function comAsDuasMetades() {
    const { doc } = documentoReal();
    return {
      analysis_id: "an-abc",
      result_schema_version: "analysis-result-v3",
      indicator_registry_version: doc.indicator_registry_version,
      result: {
        ...doc,
        alerts: [{ id: "a1", code: "COST_SPIKE", title: "Custo subiu", severity: "critical" }],
        recommendations: [{ id: "r1", title: "Revisar prompt", priority: "P1" }],
        dimensions: [
          {
            id: "reliability",
            value: 0.9,
            availability: "available",
            reason: "ok",
            scale: { kind: "ratio_unit" },
          },
        ],
      },
    };
  }

  it("o grupo das conclusões vem ANTES do grupo das medições", async () => {
    // A ordem de leitura é a única priorização que o Front pode decidir: não depende de saber
    // qual severidade é pior, e vale igual para qualquer documento. Antes desta tranche quem
    // abria o laudo lia seis blocos de número antes de descobrir que havia alerta.
    renderizar(comAsDuasMetades());
    const conclusoes = await screen.findByRole("region", { name: G.groupConclusions });
    const medicoes = await screen.findByRole("region", { name: G.groupMeasurements });
    expect(
      conclusoes.compareDocumentPosition(medicoes) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("agrupar NÃO reordena por gravidade — a ordem dentro da família é a do documento", async () => {
    // O cadeado que já existia protegia uma lista plana. Agora que há grupo ele precisa valer
    // dentro do grupo: agrupar é editorial, rankear seria a escada que o contrato não publica.
    const base = comAsDuasMetades();
    renderizar({
      ...base,
      result: {
        ...base.result,
        alerts: [
          { id: "a1", code: "LOW_SAMPLE", title: "Amostra baixa", severity: "info" },
          { id: "a2", code: "COST_SPIKE", title: "Custo subiu", severity: "critical" },
        ],
      },
    });
    const secao = await screen.findByRole("region", { name: G.alerts });
    const titulos = within(secao)
      .getAllByRole("listitem")
      .map((li) => li.textContent ?? "");
    // `info` PRIMEIRO, porque é assim que o documento veio — e não `critical` por ser pior.
    expect(titulos[0]).toContain("Amostra baixa");
    expect(titulos[1]).toContain("Custo subiu");
  });

  it("sem conclusão nenhuma, o cartão de conclusões NÃO nasce", async () => {
    // Cartão com o título "O que o ARGOS concluiu" e nada dentro afirmaria que houve conclusão.
    // É a mesma afirmação que a seção vazia faria, e esta tela recusa as duas. O documento real
    // traz as dez famílias AUSENTES, então ele é exatamente a massa que prova isto.
    renderizar(documentoReal().envelope);
    await screen.findByTestId("argos-view");
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: G.groupConclusions })).not.toBeInTheDocument(),
    );
  });

  it("a prioridade da recomendação é anunciada como prioridade", async () => {
    // Sem o rótulo, o leitor de tela ouvia "Revisar prompt P1" e não tinha como saber o que era
    // `P1` — enquanto o irmão `alerts` já rotulava a severidade. Assimetria, não estilo.
    renderizar(comAsDuasMetades());
    const secao = await screen.findByRole("region", { name: G.recommendations });
    expect(within(secao).getByText(`${G.priority}:`)).toBeInTheDocument();
    expect(within(secao).getByText("P1")).toBeInTheDocument();
  });
});
