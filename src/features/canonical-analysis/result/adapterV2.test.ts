// Adapter do documento INTEGRADO — o que ele PODE e o que ele NÃO PODE fazer.
//
// As massas não são inventadas: saíram do reducer real do Analytics, do publicador real e do
// `assemble_v2` real (ver a procedência em `massasV2.ts`). Massa escrita à mão provaria só que o
// adapter concorda com a minha suposição do formato — e neste contrato há nove blocos, três
// estados e quatro formas de ausência para eu supor errado.
//
// PURO: nenhum React aqui. As áreas são provadas separadamente, contra view model já pronto.

import { describe, expect, it } from "vitest";
import { adaptAnalysisResultV2 } from "./adapterV2";
import { adaptAnalysisResult } from "./adapter";
import { envelopeV2, V2_PARTIAL, V2_READY, V2_WITHHELD } from "@/test/fixtures/canonical-result/massasV2";
import { MASSA_A, envelope } from "@/test/fixtures/canonical-result/massas";

function suportado(doc: unknown, versao?: string) {
  const r = adaptAnalysisResultV2(envelopeV2(doc, versao));
  if (r.status !== "supported") throw new Error(`esperava supported, veio ${r.reason}`);
  return r.view;
}

function recusa(doc: unknown, versao?: string) {
  const r = adaptAnalysisResultV2(envelopeV2(doc, versao));
  if (r.status !== "unsupported") throw new Error("esperava unsupported, veio supported");
  return r.reason;
}

/** O documento `ready` com o snapshot alterado. As massas são `as const` — congeladas de
 *  propósito —, então cada variação nasce de um spread em vez de mutar a original. */
function comDados(campos: Record<string, unknown>) {
  return {
    ...V2_READY,
    analytics: {
      ...V2_READY.analytics,
      data: { ...V2_READY.analytics.data, ...campos },
    },
  };
}

/** O conteúdo analítico, ou uma falha explícita — nunca um `?.` que engole o estado errado. */
function conteudo(doc: unknown) {
  const a = suportado(doc).analytics;
  if (a.status === "withheld") throw new Error("esperava conteúdo, veio withheld");
  return a.content;
}

// ── as duas contagens, com nomes próprios (MF6.3) ───────────────────────────

describe("as contagens não se confundem", () => {
  it("a janela da Engine tem nome próprio e NÃO se chama record_count", () => {
    const v = suportado(V2_READY);
    expect(v.summary.engineWindowRecordCount).toBe(100);
    // O denominador analítico é OUTRO campo, ainda que aqui os dois valham o mesmo número.
    expect(conteudo(V2_READY).recordCount).toBe(100);
  });

  it("um documento cujo denominador analítico contradiz o snapshot é RECUSADO", () => {
    // Os dois são o mesmo número por construção (o backend extrai um do outro). Divergirem
    // significa que algo os separou — e mostrar qualquer um seria apostar em qual sobreviveu.
    const adulterado = {
      ...V2_READY,
      analytics: { ...V2_READY.analytics, record_count: 99 },
    };
    expect(recusa(adulterado)).toBe("analytics_record_count_conflict");
  });

  it("o cabeçalho com o nome ANTIGO não passa por v2", () => {
    // `summary.record_count` é o nome do v1. Aceitá-lo aqui faria a janela da Engine e o
    // denominador analítico voltarem a ser lidos um pelo outro.
    const { engine_window_record_count: _, ...resto } = V2_READY.summary;
    expect(recusa({ ...V2_READY, summary: { ...resto, record_count: 100 } })).toBe("malformed");
  });
});

// ── os três estados ─────────────────────────────────────────────────────────

describe("os três estados do bloco analítico", () => {
  it("ready traz o conteúdo inteiro", () => {
    const v = suportado(V2_READY);
    expect(v.analytics.status).toBe("ready");
    const c = conteudo(V2_READY);
    expect(c.measures).toHaveLength(2);
    expect(c.dimensions).toHaveLength(1);
    expect(c.distributions).toHaveLength(1);
    expect(c.concentrations).toHaveLength(1);
    expect(c.series).toHaveLength(1);
  });

  it("partial traz conteúdo E declara que é parcial", () => {
    // O documento é publicável e a análise entregou menos. Colapsá-lo em `ready` esconderia a
    // omissão; colapsá-lo em `withheld` afirmaria que não há nada a mostrar.
    const v = suportado(V2_PARTIAL);
    expect(v.analytics.status).toBe("partial");
    expect(conteudo(V2_PARTIAL).recordCount).toBe(100);
  });

  it("withheld é CONCLUSÃO: sem conteúdo, e sem virar erro", () => {
    const r = adaptAnalysisResultV2(envelopeV2(V2_WITHHELD));
    expect(r.status).toBe("supported"); // não é `unsupported`, não é exceção
    const v = suportado(V2_WITHHELD);
    expect(v.analytics.status).toBe("withheld");
    // O tipo já garante que não há `content`; aqui se prova que ele não voltou por outro nome.
    expect(Object.keys(v.analytics).sort()).toEqual(["lineage", "status"]);
  });

  it("withheld preserva o resto do documento — a Engine não foi retida", () => {
    const v = suportado(V2_WITHHELD);
    expect(v.summary.engineWindowRecordCount).toBe(100);
    expect(v.indicators.length).toBeGreaterThan(0);
  });
});

// ── Pareto / concentração ───────────────────────────────────────────────────

describe("concentração de volume (Pareto)", () => {
  it("publica as duas perguntas com o valor e a exatidão DECLARADOS", () => {
    const [c] = conteudo(V2_READY).concentrations;
    const top = c.statistics.find((e) => e.id === "top_20_percent_volume_share");
    expect(top).toBeDefined();
    // 0,6233766233766234 → "62.3%". A escala percentual é a das participações declaradas.
    expect(top?.display).toBe("62.3%");
    expect(top?.precision).toBe("exact");
    expect(top?.withheldLabel).toBeNull();
  });

  it("as faixas saem na ordem publicada, com a de largura 1 escrita como valor", () => {
    const [c] = conteudo(V2_READY).concentrations;
    expect(c.bands.map((b) => b.label)).toEqual(["3", "12", "40"]);
    expect(c.bands.map((b) => b.entityCount)).toEqual([68, 20, 12]);
    // Escala VISUAL relativa ao maior — nenhum número da tela sai dela, e ela já sai como
    // valor CSS para nenhum componente precisar multiplicar nada.
    expect(c.bands[0].barWidth).toBe("100.0%");
  });

  it("estatística retida não ganha número, e o motivo vem de vocabulário FECHADO", () => {
    const original = V2_READY.analytics.data.concentrations[0];
    const doc = comDados({
      concentrations: [
        {
          ...original,
          statistics: [
            {
              ...original.statistics[0],
              state: "suppressed",
              calculation_precision: null,
              value: null,
              reason_code: "cohort_below_min_group_size",
            },
          ],
        },
      ],
    });
    const [c] = conteudo(doc).concentrations;
    expect(c.statistics[0].display).toBeNull();
    expect(c.statistics[0].withheldLabel).toBe("The described cohort is below the privacy floor");
  });

  it("código de retenção DESCONHECIDO não é ecoado na tela", () => {
    // Um código que esta versão não conhece pode carregar qualquer coisa que uma versão futura
    // do backend decida pôr ali. Imprimi-lo cru publicaria o desconhecido.
    const original = V2_READY.analytics.data.concentrations[0];
    const doc = comDados({
      concentrations: [
        {
          ...original,
          statistics: [
            {
              ...original.statistics[0],
              state: "suppressed",
              calculation_precision: null,
              value: null,
              reason_code: "populacao_do_cliente_x_y_z",
            },
          ],
        },
      ],
    });
    const [c] = conteudo(doc).concentrations;
    expect(c.statistics[0].withheldLabel).toBe("Not published");
    expect(JSON.stringify(c)).not.toContain("populacao_do_cliente");
  });
});

// ── série temporal ──────────────────────────────────────────────────────────

describe("série temporal", () => {
  it("rotula as janelas pela granularidade DECLARADA pela série", () => {
    const [s] = conteudo(V2_READY).series;
    expect(s.granularity).toBe("month");
    expect(s.windows).toHaveLength(6);
    // `month` ⇒ mês e ano, sem inventar um dia que a série não afirma.
    expect(s.windows[0].label).toBe("Jul 2026");
    expect(s.windows.map((w) => w.count)).toEqual([18, 18, 17, 16, 16, 15]);
  });

  it("janela SUPRIMIDA não vira zero, e não ganha altura", () => {
    // Zero diria "nada aconteceu aqui" sobre exatamente a janela cujo número foi retido.
    const doc = comDados({
      time_series: [
        {
          ...V2_READY.analytics.data.time_series[0],
          windows: [
            { window_start: "2026-07-01T00:00:00+00:00", count: null, status: "suppressed" },
            { window_start: "2026-08-01T00:00:00+00:00", count: 18, status: "observed" },
          ],
        },
      ],
    });
    const [s] = conteudo(doc).series;
    expect(s.windows[0].count).toBeNull();
    expect(s.windows[0].countDisplay).toBeNull();
    expect(s.windows[0].barWidth).toBe("0%");
  });

  it("janela sem contagem e sem supressão derruba a série — não vira zero", () => {
    const doc = comDados({
      time_series: [
        {
          ...V2_READY.analytics.data.time_series[0],
          windows: [
            { window_start: "2026-07-01T00:00:00+00:00", count: null, status: "observed" },
          ],
        },
      ],
    });
    // A série é descartada e CONTADA — não some em silêncio.
    const c = conteudo(doc);
    expect(c.series).toHaveLength(0);
    expect(c.notes.unreadableBlocks).toBe(1);
  });
});

// ── distribuições ───────────────────────────────────────────────────────────

describe("distribuições de rótulo", () => {
  it("preserva os grupos publicados e o piso sob o qual eles saíram", () => {
    const [d] = conteudo(V2_READY).dimensions;
    expect(d.groups.map((g) => [g.label, g.count])).toEqual([
      ["whatsapp", 45],
      ["chat", 30],
      ["email", 15],
      ["phone", 10],
    ]);
    expect(d.minGroupSize).toBe(10);
  });

  it("grupo ilegível derruba a distribuição — não some uma barra", () => {
    // Uma barra a menos não se anuncia sozinha: a tela mostraria uma distribuição menor com a
    // mesma cara de uma completa.
    const original = V2_READY.analytics.data.dimensions[0];
    const doc = comDados({
      dimensions: [{ ...original, groups: [original.groups[0], { label: "chat" }] }],
    });
    const c = conteudo(doc);
    expect(c.dimensions).toHaveLength(0);
    expect(c.notes.unreadableBlocks).toBe(1);
  });

  it("faixa ilegível derruba a concentração — a partição precisa fechar", () => {
    const original = V2_READY.analytics.data.concentrations[0];
    const doc = comDados({
      concentrations: [
        { ...original, bands: [original.bands[0], { lower_value: 12, upper_value: 12 }] },
      ],
    });
    const c = conteudo(doc);
    expect(c.concentrations).toHaveLength(0);
    expect(c.notes.unreadableBlocks).toBe(1);
  });

  it("`other_count` nulo NÃO vira zero", () => {
    // `null` significa "nem a soma dos suprimidos alcança o piso". Zero significaria "não havia
    // ninguém fora dos grupos nomeados" — que é outra afirmação, e falsa.
    const [d] = conteudo(V2_READY).dimensions;
    expect(d.otherCountDisplay).toBeNull();
  });
});

// ── o que a tela NÃO faz ────────────────────────────────────────────────────

describe("backend-first: o navegador formata, e não calcula", () => {
  it("não publica cobertura: as quatro contagens continuam CONTAGENS", () => {
    // `valid_count / record_count` seria uma linha — e seria um percentual que o backend não
    // publicou, com a mesma aparência dos que ele publicou.
    const [m] = conteudo(V2_READY).measures;
    expect(m.counts.map((c) => c.label)).toEqual([
      "With value",
      "Empty",
      "Unreadable",
      "Field absent",
    ]);
    expect(m.counts.map((c) => c.display)).toEqual(["100", "0", "0", "0"]);
    expect(JSON.stringify(m.counts)).not.toContain("%");
  });

  it("não converte contagem de grupo em percentual", () => {
    const [d] = conteudo(V2_READY).dimensions;
    expect(d.groups.map((g) => g.countDisplay)).toEqual(["45", "30", "15", "10"]);
    expect(JSON.stringify(d.groups.map((g) => g.countDisplay))).not.toContain("%");
  });

  it("preserva a ordem recebida — nenhuma reordenação por relevância inventada", () => {
    const c = conteudo(V2_READY);
    expect(c.measures.map((m) => m.id)).toEqual(["custo", "declared_turns"]);
  });

  it("o digest da projeção NÃO chega ao view model", () => {
    // Ele é campo público do documento, mas a tela não tem contra o que conferi-lo: a
    // conferência aconteceu no Orchestrator, contra metadados duráveis que o navegador não vê.
    const v = suportado(V2_READY);
    expect(JSON.stringify(v)).not.toContain(V2_READY.analytics.projection_digest);
  });

  it("a procedência que a tela mostra são as VERSÕES, e são duas", () => {
    const v = suportado(V2_READY);
    expect(v.analytics.lineage.snapshotContractVersion).toBe("analytics-snapshot-v9");
    expect(v.analytics.lineage.measurementContractVersion).toBe("measurement-1.0");
  });
});

// ── o que veio e não é mostrado ─────────────────────────────────────────────

describe("nada é descartado em silêncio", () => {
  it("conta os blocos que o documento trouxe e esta versão não apresenta", () => {
    // A massa `ready` traz um `flag_cross` publicável. "Não recebemos" e "não mostramos" são
    // coisas diferentes para quem lê a tela.
    expect(conteudo(V2_READY).notes.blocksNotPresented).toBe(1);
    expect(conteudo(V2_PARTIAL).notes.blocksNotPresented).toBe(0);
  });

  it("conta os blocos ILEGÍVEIS em vez de fingir que não vieram", () => {
    const doc = comDados({ numeric: [{ measure_id: "" }, {}] });
    const c = conteudo(doc);
    expect(c.measures).toHaveLength(0);
    expect(c.notes.unreadableBlocks).toBe(2);
  });

  it("as medidas não resumidas e não autorizadas são CONTADAS, nunca nomeadas", () => {
    const doc = comDados({
      unsupported_measure_ids: ["quando_o_cliente_ligou"],
      unauthorized_measure_ids: ["cpf_do_cliente", "email_do_cliente"],
    });
    const c = conteudo(doc);
    expect(c.notes.measuresNotSummarized).toBe(1);
    expect(c.notes.measuresNotAuthorized).toBe(2);
    // Um `measure_id` é chave de saída, e chave de saída não atravessa a fronteira pública.
    expect(JSON.stringify(c)).not.toContain("cpf_do_cliente");
    expect(JSON.stringify(c)).not.toContain("quando_o_cliente_ligou");
  });
});

// ── as recusas ──────────────────────────────────────────────────────────────

describe("contrato inválido é RECUSADO, nunca adivinhado", () => {
  it("versão ausente, desconhecida e contraditória têm razões distintas", () => {
    expect(recusa(V2_READY, "")).toBe("missing_schema");
    expect(recusa(V2_READY, "analysis-result-v9")).toBe("unknown_schema");
    expect(recusa({ ...V2_READY, result_schema_version: "analysis-result-v1" })).toBe(
      "schema_mismatch",
    );
  });

  it("bloco analítico AUSENTE não é tratado como withheld", () => {
    // "Não há bloco" e "decidiu-se não liberar nada" são coisas diferentes. Colapsá-las faria a
    // tela afirmar uma decisão de privacidade que ninguém tomou.
    const { analytics: _, ...semBloco } = V2_READY;
    expect(recusa(semBloco)).toBe("analytics_missing");
  });

  it("estado fora do vocabulário é recusado — não há quarto desfecho", () => {
    const doc = { ...V2_READY, analytics: { ...V2_READY.analytics, component_status: "degraded" } };
    expect(recusa(doc)).toBe("analytics_status_unknown");
  });

  it("ready sem conteúdo é recusado: publicar 'há resultado' sobre nada", () => {
    const doc = { ...V2_READY, analytics: { ...V2_READY.analytics, data: null } };
    expect(recusa(doc)).toBe("analytics_content_incoherent");
  });

  it("withheld COM conteúdo é recusado: se há o que liberar, não era withheld", () => {
    const doc = {
      ...V2_WITHHELD,
      analytics: { ...V2_WITHHELD.analytics, data: V2_READY.analytics.data },
    };
    expect(recusa(doc)).toBe("analytics_content_incoherent");
  });

  it("conteúdo ILEGÍVEL não vira 'não veio'", () => {
    const doc = { ...V2_READY, analytics: { ...V2_READY.analytics, data: { qualquer: 1 } } };
    expect(recusa(doc)).toBe("analytics_content_unreadable");
  });

  it("bloco sem digest ou sem versão é malformado, inclusive em withheld", () => {
    const { projection_digest: _, ...semDigest } = V2_WITHHELD.analytics;
    expect(recusa({ ...V2_WITHHELD, analytics: semDigest })).toBe("malformed");
  });
});

// ── as duas versões não se misturam ─────────────────────────────────────────

describe("v1 e v2 são contratos distintos, e nenhum resgata o outro", () => {
  it("um documento v1 não passa pelo adapter v2", () => {
    const r = adaptAnalysisResultV2(envelope(MASSA_A));
    expect(r.status).toBe("unsupported");
    if (r.status === "unsupported") expect(r.reason).toBe("unknown_schema");
  });

  it("um documento v2 não passa pelo adapter v1", () => {
    // Sem fallback silencioso: o v1 não tenta "aproveitar o que dá" de um v2.
    const r = adaptAnalysisResult(envelopeV2(V2_READY));
    expect(r.status).toBe("unsupported");
    if (r.status === "unsupported") expect(r.reason).toBe("unknown_schema");
  });

  it("o v1 continua funcionando exatamente como antes", () => {
    const r = adaptAnalysisResult(envelope(MASSA_A));
    expect(r.status).toBe("supported");
    if (r.status === "supported") expect(r.view.summary.recordCount).toBe(100);
  });
});
