// F4 — as regras da visão Analytics.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import { AnalyticsView } from "./AnalyticsView";

const chamadas: string[] = [];

/** Um snapshot mínimo que exercita as três ausências que não podem virar zero. */
const SNAPSHOT = {
  snapshot_contract_version: "analytics-snapshot-v9",
  record_count: 100,
  numeric: [
    {
      measure_id: "conversation_cost",
      unit: "USD",
      semantic_role: "sum",
      valid_count: 90,
      null_count: 10,
      invalid_count: 0,
      absent_count: 0,
      minimum: 0.1,
      maximum: 9.9,
      total: 100,
      mean: 1.1,
      suppression_applied: true,
      method_id: "m",
      method_version: 1,
      method_parameters: {},
      method_definition_digest: "d",
    },
  ],
  distributions: [
    {
      measure_id: "canal",
      value_type: "string",
      min_group_size: 5,
      value_count: 100,
      null_count: 0,
      invalid_count: 0,
      absent_count: 0,
      distinct_observed: 2,
      groups: [{ label: "web", count: 60 }],
      // `null` = nem a soma dos suprimidos alcançou o piso. NÃO é zero.
      other_count: null,
      suppression_applied: false,
      high_cardinality_suppressed: false,
      method_id: "m",
      method_version: 1,
      method_parameters: {},
      method_definition_digest: "d",
      privacy_policy_version: "p1",
      top_k: 10,
      max_tracked_categories: 50,
    },
  ],
  dimensions: [],
  concentrations: [
    {
      measure_id: "custo",
      unit: "USD",
      semantic_role: "sum",
      value_count: 100,
      null_count: 0,
      invalid_count: 0,
      absent_count: 0,
      total_volume: 100,
      bands: [],
      coarsening_applied: false,
      suppression_applied: false,
      high_cardinality_suppressed: false,
      statistics: [
        { statistic_id: "top_10_share", state: "published", calculation_precision: "exact", value: 0.42, lower_bound: null, upper_bound: null, reason_code: null },
        { statistic_id: "gini", state: "not_published", calculation_precision: null, value: null, lower_bound: null, upper_bound: null, reason_code: "below_min_group" },
      ],
      method_id: "m",
      method_version: 1,
      method_parameters: {},
      method_definition_digest: "d",
      privacy_policy_version: "p1",
      min_group_size: 5,
      max_tracked_values: 100,
    },
  ],
  time_series: [
    {
      dimension_id: "dia",
      effective_granularity: "day",
      timezone: "UTC",
      coarsening_applied: false,
      value_count: 2,
      null_count: 0,
      invalid_count: 0,
      windows: [
        { window_start: "2026-08-01", count: 7, status: "published" },
        // `count: null` só em `suppressed`. Zero é VALOR.
        { window_start: "2026-08-02", count: null, status: "suppressed" },
      ],
      temporal_series_suppressed: false,
      suppression_applied: false,
      method_id: "m",
      method_version: 1,
      method_parameters: {},
      method_definition_digest: "d",
      privacy_policy_version: "p1",
      min_group_size: 5,
      max_time_buckets: 100,
      series_contract_version: "s1",
    },
  ],
};

function vistaAnalytics(over: Record<string, unknown> = {}) {
  return {
    analysis_id: "an-abc",
    component_status: "ready",
    snapshot_contract_version: "analytics-snapshot-v9",
    snapshot_digest: "sd",
    snapshot: SNAPSHOT,
    disclosure_rule_version: "dr-1",
    projection_digest: "pd",
    withheld: null,
    generated_at: "2026-08-01T00:00:00Z",
    ...over,
  };
}

function montar(vista: unknown) {
  chamadas.length = 0;
  return {
    getAnalytics: vi.fn(async () => {
      chamadas.push("getAnalytics");
      return vista;
    }),
    getResult: vi.fn(async (_i: string, _s: unknown, _o: unknown, versao?: string) => {
      chamadas.push(`getResult:${versao ?? "SEM-VERSAO"}`);
      return {};
    }),
    getStatus: vi.fn(async () => {
      chamadas.push("getStatus");
      return { analysis_id: "an-abc", status: "running", result_available: false };
    }),
    getProgress: vi.fn(async () => {
      chamadas.push("getProgress");
      return {
        analysis_id: "an-abc",
        axes: [
          { axis: "analytics", state: "ready" },
          { axis: "export", state: "ready" },
          // O resultado final PENDENTE, de propósito: D13 diz que o Analytics aparece assim
          // mesmo, e é isso que uma das provas abaixo exige.
          { axis: "final_result", state: "pending" },
        ],
      };
    }),
  };
}

vi.mock("@/shell/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

let clienteAtual: ReturnType<typeof montar>;
vi.mock("../../data/client", () => ({ useV1Client: () => clienteAtual }));
vi.mock("../scope", () => ({ useCanonicalScope: () => ({ workspaceId: "ws-1" }) }));

function renderizar(vista: unknown = vistaAnalytics()) {
  window.localStorage.setItem("sentinela:language", "pt");
  clienteAtual = montar(vista);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/analyses/an-abc/analytics"]}>
          <Routes>
            <Route path="/analyses/:analysisId/analytics" element={<AnalyticsView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

beforeEach(() => {
  chamadas.length = 0;
});

describe("F4 · fonte ÚNICA", () => {
  it("lê `/analytics` e NUNCA pede o v3", async () => {
    renderizar();
    await waitFor(() => expect(chamadas).toContain("getAnalytics"));
    // O documento ARGOS é da outra visão. Buscá-lo aqui refundiria os dois motores pela porta
    // dos fundos — exatamente o que o v3 desfez no backend.
    expect(chamadas.some((c) => c.startsWith("getResult"))).toBe(false);
  });

  it("não espera o ARGOS para responder (D13)", async () => {
    // `final_result: pending` e `analytics: ready` — a visão precisa renderizar assim mesmo.
    renderizar();
    expect(
      await screen.findByRole("region", { name: pt.canonicalAnalysis.analyticsView.numeric }),
    ).toBeInTheDocument();
  });
});

describe("F4 · privacidade é conclusão do produtor, não interpretação da tela", () => {
  it("`withheld` é dito, e a razão interna não é impressa", async () => {
    renderizar(vistaAnalytics({ component_status: "withheld", snapshot: null }));
    await waitFor(() => expect(chamadas).toContain("getAnalytics"));
    expect(
      screen.queryByRole("region", { name: pt.canonicalAnalysis.analyticsView.numeric }),
    ).not.toBeInTheDocument();
  });

  it("supressão aparece como marca, sem número inventado no lugar", async () => {
    renderizar();
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.analyticsView.numeric,
    });
    expect(within(secao).getByText("conversation_cost"), "medida ausente — prova vazia").toBeInTheDocument();
    expect(within(secao).getByText(pt.canonicalAnalysis.analyticsView.suppressed)).toBeInTheDocument();
  });

  it("`other_count: null` não vira zero na tela", async () => {
    // `null` significa que nem a soma dos suprimidos alcançou o piso de privacidade. Escrever
    // `0` afirmaria que não há mais nada — afirmação que o produtor não fez.
    renderizar();
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.analyticsView.distributions,
    });
    // PISO. A primeira versão desta prova passou por vacuidade: a massa usava `flag_distributions`
    // e o leitor lê `distributions`, então a seção estava vazia e o `queryByText` não achava zero
    // porque não havia nada. Verde por não ter olhado.
    expect(within(secao).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(
      within(secao).queryByText(`${pt.canonicalAnalysis.analyticsView.other}: 0`),
    ).not.toBeInTheDocument();
  });

  it("janela suprimida não vira zero", async () => {
    renderizar();
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.analyticsView.series,
    });
    const linhas = within(secao).getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(linhas.length, "sem janelas — a prova seria vazia").toBeGreaterThan(0);
    const suprimida = linhas.find((l) => l.includes("2026-08-02")) ?? "";
    expect(suprimida, "a janela suprimida não chegou à tela").not.toBe("");
    expect(suprimida).toContain(pt.canonicalAnalysis.analyticsView.suppressed);
    expect(suprimida).not.toMatch(/2026-08-02\s*0$/);
  });

  // Decisão de owner (2026-08-15): o padrão do ARGOS para os ids de estatística.
  //
  // `statistic_id` é vocabulário ABERTO no contrato, como o `reason_code`. Traduzir tudo obrigaria
  // a adivinhar nomes que o backend ainda pode criar — o defeito que `descriptors.ts` existe para
  // impedir. Quem o registro conhece ganha rótulo; quem não conhece continua aparecendo como o id.
  //
  // As DUAS direções no mesmo caso. Só exigir o rótulo deixaria passar uma tradução geral, que é a
  // opção que o owner recusou; só exigir o id cru deixaria passar a correção desfeita. Este caso
  // nasceu de uma mutação SOBREVIVENTE: trocar o registro por `false` devolvia o id cru e nenhum
  // teste reclamava.
  it("id conhecido ganha rótulo; id desconhecido continua aparecendo cru", async () => {
    // CLONE. `vistaAnalytics()` devolve a mesma massa a todo mundo: mexer nela aqui apagava o
    // `gini` com `reason_code` que o caso seguinte afirma, e o vizinho reprovava por poluição —
    // um defeito de teste que parece defeito de produto.
    const vista = structuredClone(vistaAnalytics());
    const conc = (vista as { snapshot: { concentrations: { statistics: unknown[] }[] } }).snapshot
      .concentrations[0];
    conc.statistics = [
      { statistic_id: "top_10_share", state: "published", calculation_precision: "exact", value: 0.42, lower_bound: null, upper_bound: null, reason_code: null },
      { statistic_id: "estatistica_que_o_backend_inventou", state: "published", calculation_precision: "exact", value: 0.7, lower_bound: null, upper_bound: null, reason_code: null },
    ];
    renderizar(vista);
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.analyticsView.concentrations,
    });

    expect(
      within(secao).getByText(pt.canonicalAnalysis.analyticsView.statistic.top_10_share),
      "o id conhecido não recebeu rótulo",
    ).toBeInTheDocument();
    expect(within(secao).queryByText("top_10_share"), "o id cru sobrou ao lado do rótulo").toBeNull();

    expect(
      within(secao).getByText("estatistica_que_o_backend_inventou"),
      "um id novo do backend apareceu com rótulo adivinhado, ou sumiu",
    ).toBeInTheDocument();
  });

  it("estatística não publicada mostra o motivo, não um número", async () => {
    renderizar();
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.analyticsView.concentrations,
    });
    // A PALAVRA vem sempre, e o código fica ao lado.
    //
    // Este caso só afirmava o `below_min_group`, e por isso não media nada do que o seu nome
    // promete: a tela imprimia o código CRU quando havia motivo e guardava "não publicado" para
    // o caso mudo — invertido —, e a asserção passava igual. Exigir as duas coisas é o que torna
    // a inversão detectável. Traduzir o código não é opção: `reason_code` é string aberta no
    // contrato.
    expect(
      within(secao).getByText(pt.canonicalAnalysis.analyticsView.notPublished),
      "sem a palavra, sobra só um código para quem lê",
    ).toBeInTheDocument();
    expect(within(secao).getByText("below_min_group")).toBeInTheDocument();
  });
});

describe("F4 · as duas 'dimensões' não se confundem", () => {
  it("a seção de dimensões diz que é do ANALYTICS", async () => {
    // As dimensões de saúde do ARGOS (`semantic`/`behavioral`/`structural`/`economic`) são outro
    // conceito, de outro motor. Um rótulo "Dimensões" seco faria as duas telas parecerem falar
    // da mesma coisa.
    renderizar();
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.analyticsView.dimensions,
    });
    expect(secao).toBeInTheDocument();
    expect(pt.canonicalAnalysis.analyticsView.dimensions).toContain("Analytics");
  });

  it("nenhuma dimensão de saúde do ARGOS aparece aqui", async () => {
    renderizar();
    await screen.findByRole("region", { name: pt.canonicalAnalysis.analyticsView.numeric });
    for (const rotulo of Object.values(pt.canonicalAnalysis.argos.dimension)) {
      expect(screen.queryByText(rotulo)).not.toBeInTheDocument();
    }
  });
});

describe("F4 · o export canônico mora aqui", () => {
  it("a ação de export é apresentada na visão Analytics", async () => {
    renderizar();
    expect(
      await screen.findByRole("region", { name: pt.canonicalAnalysis.analyticsView.export }),
    ).toBeInTheDocument();
  });
});

describe("F4 · a contagem publicada também é dita por comprimento", () => {
  /** A barra preenchida do `Bar`. Suprimida NÃO tem esta parte — é o que se mede aqui. */
  function preenchimento(linha: HTMLElement): HTMLElement | null {
    return linha.querySelector<HTMLElement>('[style*="width"]');
  }

  function linhaCom(secao: HTMLElement, texto: string): HTMLElement {
    const alvo = within(secao)
      .getAllByRole("listitem")
      .find((li) => (li.textContent ?? "").includes(texto));
    if (!alvo) throw new Error(`nenhuma linha com "${texto}"`);
    return alvo;
  }

  it("a janela SUPRIMIDA não desenha barra — e a publicada desenha", async () => {
    // Este é o cadeado que o módulo de largura NÃO consegue dar. Lá, filtrar a suprimida é
    // no-op (somar zeros não abaixa um máximo, e a mutação provou). A diferença observável
    // está aqui: barra de largura zero e barra de valor zero são indistinguíveis, e afirmam o
    // oposto — "não houve" contra "não podemos dizer".
    renderizar();
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.analyticsView.series,
    });
    expect(preenchimento(linhaCom(secao, "2026-08-01"))).not.toBeNull();
    expect(preenchimento(linhaCom(secao, "2026-08-02"))).toBeNull();
    expect(linhaCom(secao, "2026-08-02").textContent).toContain(
      pt.canonicalAnalysis.analyticsView.suppressed,
    );
  });

  it("as FAIXAS de concentração aparecem na tela, não só dentro do mapa", async () => {
    // Elas sempre vieram publicadas. Esta visão mandava-as direto para o mapa de procedência, e
    // quem não abrisse o mapa nunca via a FORMA da concentração — que é a pergunta que a seção
    // existe para responder. A superfície congelada já as desenhava.
    const base = vistaAnalytics();
    renderizar({
      ...base,
      snapshot: {
        ...SNAPSHOT,
        concentrations: [
          {
            ...SNAPSHOT.concentrations[0],
            bands: [
              { lower_value: 0, upper_value: 10, entity_count: 8 },
              { lower_value: 10, upper_value: 20, entity_count: 2 },
            ],
          },
        ],
      },
    });
    const secao = await screen.findByRole("region", {
      name: pt.canonicalAnalysis.analyticsView.concentrations,
    });
    // Ancorar no RÓTULO da faixa, não na contagem: "2" casa com meia tela — inclusive com a
    // estatística `0.42` e com a própria faixa "10–20". A primeira versão deste caso reprovou
    // por isso, e o defeito era do instrumento.
    const maior = linhaCom(secao, "0–10");
    const menor = linhaCom(secao, "10–20");
    // A maior faixa ocupa a largura inteira; a menor, um quarto dela. A barra corresponde ao
    // número escrito ao lado — uma barra que mente é pior que barra nenhuma, porque é lida antes.
    expect(preenchimento(maior)?.style.width).toBe("100.0%");
    expect(preenchimento(menor)?.style.width).toBe("25.0%");
  });
});

// ══ MOLDE V4 · a fiação do hero e do retido ════════════════════════════════════════════════
//
// Estes casos existem porque duas mutações sobreviveram: remover `<Cabeca>` e remover
// `<Retido>` do fluxo da página. Os casos que eu tinha montavam os dois componentes DIRETO —
// eles provavam a peça, não a fiação.
//
// É o mesmo defeito que o teste da linha do tempo pública do Orchestrator existe para impedir:
// pontos de emissão fiados e nunca exercitados pelo caminho de verdade.

describe("Molde V4 · o denominador e o retido chegam à TELA", () => {
  it("o hero mostra os registros lidos e o digest da projeção", async () => {
    // O denominador estava no rodapé, depois de sete seções que dependem dele. E o
    // `projection_digest` é publicado e nunca aparecia em lugar nenhum.
    renderizar();
    await screen.findByRole("region", { name: pt.canonicalAnalysis.analyticsView.numeric });

    expect(screen.getByText(pt.canonicalAnalysis.analyticsView.projectionDigest)).toBeTruthy();
    expect(screen.getByText("pd")).toBeTruthy();
  });

  it("o retido aparece na procedência, com os quatro contadores", async () => {
    // Sempre os quatro, inclusive em zero: esconder o zero não distingue "perguntamos e a
    // resposta foi nenhum" de "ninguém perguntou".
    renderizar();
    await screen.findByRole("region", { name: pt.canonicalAnalysis.analyticsView.numeric });

    const legenda = screen.getByText(pt.canonicalAnalysis.analyticsView.retainedCaption);
    const tabela = legenda.closest("table");
    expect(tabela, "a tabela do retido não está na tela").toBeTruthy();
    expect(tabela?.querySelectorAll("tbody tr").length).toBe(4);
  });
});
