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
    // A barra de referência lê o baseline da Instância. Ele entra no cliente BASE para que o tipo
    // exista em todos os casos — sem isto, `expect(cliente.getBaseline).not.toHaveBeenCalled()`
    // não compila, e a asserção mais importante da barra é justamente essa.
    //
    // O status base não manda `instance_id`, então nesta fábrica a barra nem pede: é o estado da
    // análise legada, e é o padrão certo para os outros casos deste arquivo.
    getBaseline: vi.fn(async () => {
      chamadas.push("getBaseline");
      return { instance_id: "", baseline_analysis_id: null, baseline_set_at: null };
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

/**
 * @param busca query string do domínio, incluindo o `?`. Vazio = Visão geral, que é a ausência do
 * parâmetro — a mesma URL que todo deep link já salvo carrega.
 */
function renderizar(envelope: unknown, statusHttp = 200, busca = "") {
  window.localStorage.setItem("sentinela:language", "pt");
  clienteAtual = montar(envelope, statusHttp);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/analyses/an-abc/argos${busca}`]}>
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

  it("um escore do catálogo aparece com NOME, e um id desconhecido continua cru", async () => {
    // A fiação, não o registro. O `catalogoArgos.test.ts` prova que a tabela de nomes está
    // coerente; este prova que a tela chega até ela — o caminho da chave pode estar errado e a
    // tabela, certíssima, sairia na tela como `canonicalAnalysis.argos.output.behavior_score`.
    const base = comAsDuasMetades();
    const medida = {
      value: 0.8,
      availability: "available",
      reason: "ok",
      scale: { kind: "ratio_unit" },
    };
    renderizar({
      ...base,
      result: {
        ...base.result,
        scores: [
          { measurement: { id: "behavior_score", ...medida } },
          // Saída que nenhum dos dois registros conhece: o cadeado anti-invenção manda mostrar
          // o id cru em vez de adivinhar um rótulo.
          { measurement: { id: "metrica_nova_do_backend", ...medida } },
        ],
      },
    });
    const secao = await screen.findByRole("region", { name: G.scores });
    expect(within(secao).getByText(pt.canonicalAnalysis.argos.output.behavior_score)).toBeInTheDocument();
    expect(within(secao).getByText("metrica_nova_do_backend")).toBeInTheDocument();
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

describe("F3 · a barra de referência tem TRÊS estados", () => {
  const B = pt.baseline;

  /** O status manda `instance_id`; o baseline manda o ponteiro. Os dois vêm de chamadas diferentes. */
  function montarComInstancia(instanceId: string | null, baselineId: string | null) {
    const { envelope } = documentoReal();
    chamadas.length = 0;
    clienteAtual = {
      getResult: vi.fn(async () => envelope),
      getStatus: vi.fn(async () => ({
        analysis_id: "an-abc",
        status: "completed",
        result_available: true,
        instance_id: instanceId,
      })),
      getAnalytics: vi.fn(async () => ({})),
      getBaseline: vi.fn(async () => ({
        instance_id: instanceId ?? "",
        baseline_analysis_id: baselineId,
        baseline_set_at: baselineId ? "2026-08-01T00:00:00Z" : null,
      })),
    } as unknown as ReturnType<typeof montar>;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    window.localStorage.setItem("sentinela:language", "pt");
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

  it("análise SEM Instância: a barra não aparece E nada é pedido", async () => {
    // O estado que se esquece. `instance_id: null` inclui toda a análise legada, e ali referência
    // não é conceito: dizer "sem referência" prometeria um controle que não existe — o erro que
    // custou a D21.
    //
    // ## Este caso mede DUAS coisas, e a segunda é a que tem dente
    //
    // Mutei o guarda `if (!instanceId) return null` e os 31 casos continuaram verdes. O motivo é
    // defesa em profundidade: com `instanceId` nulo o hook fica `enabled: false`, então
    // `baseline.isPending` nunca sai de `true` e o SEGUNDO guarda devolve `null` de qualquer forma.
    // Um guarda mascarando o outro é exatamente o padrão que faz mutação sobreviver.
    //
    // O que é observável, e portanto o que este caso afirma: `getBaseline` NÃO é chamado. Isso
    // protege duas coisas de verdade — requisição desperdiçada, e o dia em que alguém "consertar"
    // o hook passando `instanceId ?? ""` e a tela montar um link para `/instances/`.
    const { container } = montarComInstancia(null, null);
    await screen.findByTestId("argos-view");
    await waitFor(() => expect(container.querySelector("[data-referencia]")).toBeNull());
    expect(clienteAtual.getBaseline).not.toHaveBeenCalled();
  });

  it("Instância SEM referência: a barra diz isso e oferece o caminho", async () => {
    montarComInstancia("inst-1", null);
    const barra = await waitFor(() => {
      const el = document.querySelector('[data-referencia="ausente"]');
      if (!el) throw new Error("barra ausente não apareceu");
      return el as HTMLElement;
    });
    expect(barra.textContent).toContain(B.none);
    // A ação leva para a INSTÂNCIA: o Diagnóstico é leitura, e eleger referência é ato dela.
    expect(within(barra).getByRole("link", { name: B.set })).toHaveAttribute(
      "href",
      "/instances/inst-1",
    );
  });

  it("Instância COM referência: a barra diz QUAL, e não alerta", async () => {
    montarComInstancia("inst-1", "an-referencia-9");
    const barra = await waitFor(() => {
      const el = document.querySelector('[data-referencia="definida"]');
      if (!el) throw new Error("barra definida não apareceu");
      return el as HTMLElement;
    });
    expect(barra.textContent).toContain("an-referencia-9");
    // `status`, nunca `alert`: referência definida é informação, e ausência é configuração
    // pendente. Alertar por qualquer um dos dois ensina a ignorar alertas.
    expect(barra.getAttribute("role")).toBe("status");
  });

  it("o vocabulário é o de `baseline.*` — não há segundo nome para o mesmo ato", async () => {
    // Eu havia criado `setReference`/`noReference` próprios. Mesmo ato com dois nomes é o defeito
    // que a regra de copy existe para impedir, e a pessoa que abre as duas telas veria termos
    // diferentes para a mesma coisa.
    const argos = pt.canonicalAnalysis.argos as Record<string, unknown>;
    for (const inventada of ["setReference", "noReference", "referenceLabel", "changeReference"]) {
      expect(argos[inventada], `\`${inventada}\` voltou — use \`baseline.*\``).toBeUndefined();
    }
  });
});

describe("F3 · as abas de domínio filtram, e o domínio é o PUBLICADO", () => {
  const G = pt.canonicalAnalysis.argos;
  const base = { availability: "available", reason: "ok", scale: { kind: "ratio_unit" } } as const;

  /** Dois escores em domínios DIFERENTES, mais um sem domínio declarado. */
  /** O documento REAL, sem tocar em `scores` — que e como ele chega hoje: ausente.

      Ate a D5 esta era a massa de PRODUCAO: `behavior_score` nao existia no motor, nem em
      `compute_scores`, nem no retorno. A D5 lhe deu produtor — o agregado de
      `max(0, raw_governance_score - cross_intent_penalty)`, com a confianca em campo proprio —,
      entao hoje ela e a massa do documento que NAO traz o heroi, e nao mais o estado corrente.
      O `comDominios()` continua semeando o heroi para exercitar a primeira dobra. */
  function semEscores() {
    const { doc } = documentoReal();
    return {
      analysis_id: "an-abc",
      result_schema_version: "analysis-result-v3",
      indicator_registry_version: doc.indicator_registry_version,
      result: { ...doc, method: { ...doc.method, min_samples_per_intent: 30 } },
    };
  }

  function comDominios() {
    const { doc } = documentoReal();
    return {
      analysis_id: "an-abc",
      result_schema_version: "analysis-result-v3",
      indicator_registry_version: doc.indicator_registry_version,
      result: {
        ...doc,
        method: { ...doc.method, min_samples_per_intent: 30 },
        scores: [
          { measurement: { id: "behavior_score", value: 0.64, domain: "behavioral", confidence: 0.4, ...base } },
          { measurement: { id: "semantic_drift", value: 0.12, domain: "semantic", ...base } },
          // Publicado SEM `domain`. Não pode entrar em aba nenhuma.
          { measurement: { id: "global_confidence", value: 0.88, ...base } },
        ],
        risks: [{ id: "containment_risk", measurement: { id: "containment_risk", value: 0.3, domain: "economic", ...base } }],
        intents: [
          {
            intent_id: "cobranca.segunda_via",
            score: { id: "intent", value: 0.51, ...base },
            support: 214,
            underrepresented: true,
            response_variance: { id: "rv", value: 0.42, ...base },
            semantic_drift: { id: "sd", value: 0.73, ...base },
          },
        ],
      },
    };
  }

  it("a Visão geral é a AUSÊNCIA do parâmetro, e mostra tudo", async () => {
    // Isto é o que protege todo deep link já salvo: `/argos` sem query abre onde abria antes.
    renderizar(comDominios());
    const secao = await screen.findByRole("region", { name: G.scores });
    for (const id of ["behavior_score", "semantic_drift", "global_confidence"]) {
      expect(within(secao).getByText(G.output[id as keyof typeof G.output])).toBeInTheDocument();
    }
  });

  it("a aba NARROWS: o escore do outro domínio sai da tela", async () => {
    renderizar(comDominios(), 200, "?dominio=semantic");
    const secao = await screen.findByRole("region", { name: G.scores });
    expect(within(secao).getByText(G.output.semantic_drift)).toBeInTheDocument();
    expect(within(secao).queryByText(G.output.behavior_score)).not.toBeInTheDocument();
  });

  it("família SEM item no domínio é OMITIDA, e não diz 'rodou e não achou'", async () => {
    // A diferença que `recortarPorDominio` existe para preservar: `null` (não está neste corte)
    // contra `[]` (procuramos e não há). Riscos só existem em `economic`; na aba `semantic` a
    // seção não pode nascer afirmando ausência.
    renderizar(comDominios(), 200, "?dominio=semantic");
    await screen.findByRole("region", { name: G.scores });
    expect(screen.queryByRole("region", { name: G.risks })).not.toBeInTheDocument();
    expect(screen.queryByText(G.familyEmpty)).not.toBeInTheDocument();
  });

  it("o publicado SEM domínio não vira quinta aba — e a tela diz quantos são", async () => {
    renderizar(comDominios());
    const nav = await screen.findByRole("navigation", { name: G.domainsNavLabel });
    // Quatro domínios mais a Visão geral. Uma quinta aba seria um domínio que ninguém declarou.
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
    // A contagem tem que estar INTERPOLADA. Sem isto a tela mostraria `{{n}}` — e a primeira
    // versão deste caso não media o número, então passaria com o placeholder cru na tela.
    //
    // O número não é fixado de propósito: ele depende de quantos indicadores o artefato REAL
    // publica sem `domain`, e prender o teste a isso o quebraria quando o backend crescesse.
    expect(nav.textContent ?? "").toMatch(/\d+ publicados sem domínio declarado/);
  });

  it("o herói é o `behavior_score` e só existe na Visão geral", async () => {
    const { container } = renderizar(comDominios());
    await screen.findByRole("region", { name: G.scores });
    expect(container.querySelector('[data-heroi="true"]')).not.toBeNull();
  });

  it("na aba de um domínio NÃO há herói — ele é o resumo do documento, não do corte", async () => {
    const { container } = renderizar(comDominios(), 200, "?dominio=behavioral");
    await screen.findByRole("region", { name: G.scores });
    expect(container.querySelector('[data-heroi="true"]')).toBeNull();
  });

  it("sem herói, a ausência é DITA — não é espaço em branco", async () => {
    // O ramo era `: null`: a primeira dobra simplesmente não existia, e o documento começava
    // pelas conclusões sem nada explicando que faltava um número. Ausência silenciosa é a que
    // o leitor atribui a si mesmo — "não achei onde está o resumo".
    //
    // `behavior_score` NÃO é produzido pela cadeia hoje (medido: não existe no motor, nem em
    // `compute_scores`, nem no retorno). Então este é o estado REAL de produção, não uma borda
    // rara — e é por isso que ele precisa de palavra.
    renderizar(semEscores(), 200);
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.argos.noSummaryTitle,
    });
    expect(
      within(secao).getByText(pt.canonicalAnalysis.argos.noSummaryBody),
    ).toBeInTheDocument();
  });

  it("a ausência do resumo NÃO apaga o resto do laudo", async () => {
    // O contra-cadeado. Um texto de ausência que viesse no lugar da página inteira diria "a
    // análise não tem nada", quando o que ela não tem é UMA coisa — e as dimensões, os
    // indicadores e a procedência seguem ali.
    renderizar(semEscores(), 200);
    await screen.findByRole("region", { name: pt.canonicalAnalysis.argos.noSummaryTitle });
    expect(
      await screen.findByRole("region", { name: G.groupMeasurements }),
    ).toBeInTheDocument();
  });

  it("com herói, o texto de ausência NÃO aparece", async () => {
    // Sem isto, o par acima passaria com um texto que estivesse sempre na tela.
    renderizar(comDominios(), 200);
    await screen.findByRole("region", { name: G.scores });
    expect(
      screen.queryByText(pt.canonicalAnalysis.argos.noSummaryTitle),
    ).not.toBeInTheDocument();
  });

  it("`dominio` fora do vocabulário cai na Visão geral em vez de quebrar", async () => {
    renderizar(comDominios(), 200, "?dominio=inventado");
    const secao = await screen.findByRole("region", { name: G.scores });
    expect(within(secao).getByText(G.output.behavior_score)).toBeInTheDocument();
  });

  it("a confiança da medição aparece no herói, e não se confunde com `global_confidence`", async () => {
    // D5. A confiança saiu de DENTRO do valor — o escore legado fazia `qualidade x amostra` e,
    // com comportamento perfeito, reportava apenas `n/10`. Ela agora e dimensao propria, e
    // precisa APARECER: uma metade que sai do numero e nao chega a tela apenas sumiu.
    //
    // O rotulo e "Confiança da medição" e nao "Confiança" seco, porque a lista de escores da
    // mesma tela publica `Global confidence`, que e outra coisa — um escore sobre a analise
    // inteira. Dois numeros com o mesmo nome seria a confusao que o campo desfaz.
    // O heroi vive na PRIMEIRA DOBRA, fora da regiao `ESCORES` — procurar dentro dela era o
    // defeito da primeira versao deste teste.
    renderizar(comDominios(), 200);
    await screen.findByRole("region", { name: G.scores });
    expect(screen.getByText(`${G.measurementConfidence}:`)).toBeInTheDocument();
  });

  it("o `semantic_drift` por intenção aparece, e é o que permite o drill-down", async () => {
    // D4. O campo chegou ao contrato e ao tipo, e por um momento NINGUÉM o exibia — que é a
    // mesma "peça escrita e nunca ligada" que esta frente inteira persegue, só que do lado de
    // cá. Sem esta asserção, o drift chegaria à tela e sumiria na próxima refatoração.
    //
    // O rótulo é o nome OFICIAL da métrica, não traduzido: MAIOR É PIOR, e uma paráfrase
    // sugeriria qualidade.
    renderizar(comDominios());
    const secao = await screen.findByRole("region", { name: G.intents });
    expect(within(secao).getByText(`${G.output.semantic_drift}:`)).toBeInTheDocument();
  });

  it("os três campos de intenção que ninguém lia aparecem", async () => {
    renderizar(comDominios());
    const secao = await screen.findByRole("region", { name: G.intents });
    // `min_samples_per_intent` — piso DECLARADO, contexto da marca e não a origem dela.
    expect(within(secao).getByText(`${G.minSamples}:`)).toBeInTheDocument();
    // `response_variance` — publicado desde sempre e nunca renderizado.
    expect(within(secao).getByText(`${G.responseVariance}:`)).toBeInTheDocument();
    // `underrepresented` como selo próprio, não pedaço de frase depois de um ponto médio.
    expect(within(secao).getByText(G.underrepresented)).toBeInTheDocument();
  });

  /**
   * O PREÇO da emenda ao T4, virado prova — e a razão de o `Tabs` NÃO ter sido criado.
   *
   * A emenda (Product Freeze §10.1, 2026-08-18) autorizou o pattern e cobrou de volta o que a
   * aba não dá: deep link, refresh e histórico. Ao abrir a implementação, o pattern já existia
   * em outra forma — `<Link>` com query string e `aria-current="page"` —, e os três preços
   * foram medidos no navegador antes desta decisão. A autorização ficou registrada como
   * concedida e NÃO usada; estes testes existem para que isso não dependa de memória.
   *
   * O `role="tab"` é verificado aqui **além** do gate `two-view-gates.test.ts` §F6·15 de
   * propósito, e não é guarda redundante: aquele varre o FONTE por texto, e este observa a
   * árvore RENDERIZADA. Um `role="tab"` que chegasse por biblioteca, sem o literal no código,
   * passaria pelo primeiro e morre aqui.
   */
  describe("o preço da emenda ao T4 — porta no endereço, sem mentir no papel ARIA", () => {
    it("deep link DIRETO abre na porta pedida, e ela se anuncia por aria-current", async () => {
      renderizar(comDominios(), 200, "?dominio=economic");
      const ativa = await screen.findByRole("link", { current: "page", name: /econômica/i });
      expect(ativa.getAttribute("href")).toContain("dominio=economic");
    });

    it("sem parâmetro é a Visão geral — nenhum deep link antigo muda de destino", async () => {
      renderizar(comDominios(), 200, "");
      const ativa = await screen.findByRole("link", { current: "page", name: /visão geral/i });
      expect(ativa.getAttribute("href")).not.toContain("dominio=");
    });

    it("a porta é LINK: nenhum `role=tab` na árvore renderizada", async () => {
      const { container } = renderizar(comDominios(), 200, "?dominio=economic");
      await screen.findByRole("link", { current: "page", name: /econômica/i });
      expect(container.querySelectorAll('[role="tab"]').length).toBe(0);
      expect(container.querySelectorAll('[role="tablist"]').length).toBe(0);
      expect(container.querySelectorAll("a[href*='dominio=']").length).toBeGreaterThanOrEqual(4);
    });

    it("cada porta aponta para a SUA — nenhuma reaproveita o destino da ativa", async () => {
      const { container } = renderizar(comDominios(), 200, "?dominio=semantic");
      await screen.findByRole("link", { current: "page", name: /semântica/i });
      const destinos = [...container.querySelectorAll("a[href*='dominio=']")].map((a) =>
        new URL(a.getAttribute("href") as string, "http://x").searchParams.get("dominio"),
      );
      expect(new Set(destinos).size).toBe(destinos.length);
    });
  });
});
