// A medida numérica mostra o NÚMERO, não só a contabilidade dele.
//
// ## O defeito, medido campo a campo
//
// O contrato publica `minimum`, `maximum`, `total`, `mean` e `semantic_role` para toda medida
// numérica. Esta tela lia o objeto inteiro e **não renderizava nenhum dos cinco**.
//
// Mostrava id, unidade, as quatro contagens, o método e o mapa atrás de um gatilho — ou seja, a
// contabilidade da medida. A medida ficava de fora.
//
// Prova de que não era limitação do contrato: a tela legada RES-01 renderiza os quatro há ondas,
// com os rótulos Minimum/Maximum/Total/Mean. Dois renderizadores para o mesmo dado, e o mais novo
// mostrava menos.
//
// ## O caso que carrega o peso é o do `null`
//
// `null` significa NÃO PUBLICADO, e nunca zero. Uma implementação que caísse em `0` — por um
// `?? 0`, por um `Number(null)`, por um formatador tolerante — passaria no caso de presença e
// publicaria um fato falso sobre a massa do cliente.
//
// É o mesmo erro que este produto vem fechando em todo lugar: confundir ausência com valor.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { SnapshotAnalitico } from "../../result/analyticsProjection";
import { Cabeca, Retido } from "./AnalyticsView";

/** Uma medida publicada, na forma que a tela lê. */
function medida(troca: Record<string, unknown> = {}) {
  return {
    measure_id: "custo",
    unit: "BRL",
    semantic_role: "sum",
    valid_count: 100,
    null_count: 0,
    invalid_count: 0,
    absent_count: 0,
    minimum: 0.05,
    maximum: 0.13,
    total: 8.96,
    mean: 0.0896,
    suppression_applied: false,
    method_id: "numeric_summary",
    method_version: 1,
    method_parameters: {},
    method_definition_digest: "3374a4855b92",
    ...troca,
  } as unknown as SnapshotAnalitico["numeric"][number];
}

function snapshot(numeric: SnapshotAnalitico["numeric"]): SnapshotAnalitico {
  return {
    snapshot_contract_version: "analytics-snapshot-v9",
    record_count: 100,
    measure_definitions: [],
    catalogoDeExploracao: null,
    numeric,
    distributions: [],
    dimensions: [],
    concentrations: [],
    time_series: [],
    flag_crosses: [],
    numeric_crosses: [],
    flag_series: [],
    numeric_series: [],
    blocosNaoApresentados: 0,
    medidasNaoResumidas: 0,
    medidasNaoAutorizadas: 0,
    blocosIlegiveis: 0,
  };
}

/** Renderiza só o bloco das medidas numéricas, alimentado pela própria tela. */
async function numericas(snap: SnapshotAnalitico) {
  const mod = (await import("./AnalyticsView")) as unknown as {
    Numericos: (p: { snapshot: SnapshotAnalitico }) => JSX.Element;
  };
  return render(
    <LanguageProvider>
      <mod.Numericos snapshot={snap} />
    </LanguageProvider>,
  );
}

describe("a medida numérica mostra o número", () => {
  it("renderiza mínimo, máximo, total e média", async () => {
    // Os quatro campos que o contrato publica e a tela descartava.
    const { unmount } = await numericas(snapshot([medida()]));

    expect(screen.getByText("0.05")).toBeTruthy();
    expect(screen.getByText("0.13")).toBeTruthy();
    expect(screen.getByText("8.96")).toBeTruthy();
    expect(screen.getByText("0.09")).toBeTruthy();
    unmount();
  });

  it("mostra o PAPEL da medida junto da unidade", async () => {
    // Sem `semantic_role`, quem lê "total 8,96" não sabe se somar com outro total faz sentido.
    // Está publicado e não era renderizado.
    const { unmount } = await numericas(snapshot([medida()]));
    expect(screen.getByText(/BRL · sum/)).toBeTruthy();
    unmount();
  });

  it("`null` vira NÃO PUBLICADO e nunca zero", async () => {
    // O caso que carrega o peso. Um `?? 0` em qualquer lugar da cadeia publicaria um fato falso
    // sobre a massa do cliente — e passaria no primeiro caso deste arquivo sem reclamar.
    //
    // A asserção olha o PAR rótulo/valor de cada estatística. A primeira versão procurava um
    // "0" em qualquer lugar da tela e reprovava por motivo errado: o zero das contagens
    // (`null_count: 0`) é um fato legítimo — zero nulos é uma medição, não uma ausência.
    const { unmount } = await numericas(
      snapshot([
        medida({ minimum: null, maximum: null, total: null, mean: null }),
      ]),
    );

    for (const rotulo of ["minimum", "maximum", "total", "mean"]) {
      const par = screen.getByText(rotulo).closest("div");
      expect(
        par?.textContent ?? "",
        `\`${rotulo}\` não disse "não publicado"`,
      ).toMatch(/not published/i);
      expect(par?.textContent ?? "", `\`${rotulo}\` virou zero`).not.toMatch(
        /\b0\b/,
      );
    }
    unmount();
  });

  it("a ausência de UMA estatística não contamina as outras", async () => {
    // Cada uma se apresenta sozinha. Uma implementação que escondesse o bloco inteiro quando
    // qualquer campo fosse nulo apagaria três números publicados por causa de um ausente.
    const { unmount } = await numericas(snapshot([medida({ mean: null })]));

    expect(screen.getByText("8.96")).toBeTruthy();
    expect(screen.getAllByText(/not published/i).length).toBe(1);
    unmount();
  });
});

// ══ O HERO ═════════════════════════════════════════════════════════════════════════════════
//
// Tudo nesta tela é contado sobre `record_count`, e ele estava no rodapé — depois de sete
// seções que dependem dele. E o `projection_digest`, que é publicado, nunca aparecia.

/** O envelope da projeção, na forma que a tela lê. */
function envelope(troca: Record<string, unknown> = {}) {
  return {
    component_status: "ready",
    snapshot_contract_version: "analytics-snapshot-v9",
    projection_digest:
      "2a4b544c3a3e1aeb2787398d4bb6ff6d64cccfe46058e038112d6da21789bafa",
    generated_at: "2026-08-23T12:08:18.100734+00:00",
    ...troca,
  };
}

describe("o denominador vem primeiro, e o digest existe", () => {
  it("mostra os registros lidos e a identidade da projeção", () => {
    const { unmount } = render(
      <LanguageProvider>
        <Cabeca snapshot={snapshot([])} vista={envelope()} />
      </LanguageProvider>,
    );
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText(/analytics-snapshot-v9/)).toBeTruthy();
    unmount();
  });

  it("publica o digest INTEIRO", () => {
    // Um digest truncado não serve para conferir nada — e conferir é a única coisa para a qual
    // ele existe. Se a tela cortar, duas pessoas comparando projeções diferentes podem ver o
    // mesmo prefixo e concluir que falam do mesmo documento.
    const dig =
      "2a4b544c3a3e1aeb2787398d4bb6ff6d64cccfe46058e038112d6da21789bafa";
    const { unmount } = render(
      <LanguageProvider>
        <Cabeca snapshot={snapshot([])} vista={envelope()} />
      </LanguageProvider>,
    );
    expect(screen.getByText(dig)).toBeTruthy();
    unmount();
  });

  it("sem digest publicado, o bloco não aparece — e nada é inventado", () => {
    const { unmount } = render(
      <LanguageProvider>
        <Cabeca
          snapshot={snapshot([])}
          vista={envelope({ projection_digest: null })}
        />
      </LanguageProvider>,
    );
    expect(screen.queryByText(/Projection digest/i)).toBeNull();
    unmount();
  });
});

// ══ O RETIDO ═══════════════════════════════════════════════════════════════════════════════

describe("os quatro contadores dizem o que significam", () => {
  it("mostra os quatro SEMPRE, inclusive em zero", () => {
    // O caso que carrega o peso. Escondendo o zero, a tela não distinguia "perguntamos e a
    // resposta foi nenhum" de "ninguém perguntou" — a mesma confusão entre ausência e valor que
    // este produto vem fechando em todo lugar.
    const { unmount } = render(
      <LanguageProvider>
        <Retido snapshot={snapshot([])} />
      </LanguageProvider>,
    );
    const linhas = screen.getAllByRole("row");
    expect(linhas.length).toBe(4);
    unmount();
  });

  it("cada contador vem com o SIGNIFICADO dele", () => {
    // Quem lia `2` ao lado de "não apresentados" não tinha como saber o que aquilo era.
    const { unmount } = render(
      <LanguageProvider>
        <Retido snapshot={snapshot([])} />
      </LanguageProvider>,
    );
    expect(screen.getByText(/this screen chose not to show/i)).toBeTruthy();
    expect(screen.getByText(/could not summarise/i)).toBeTruthy();
    expect(screen.getByText(/did not authorise/i)).toBeTruthy();
    expect(screen.getByText(/did not match the contract/i)).toBeTruthy();
    unmount();
  });

  it("os quatro NÃO são somados", () => {
    // São quatro perguntas distintas: o que a tela escolheu não mostrar, o que o cálculo não
    // soube resumir, o que a política não autorizou, e o que não correspondia ao contrato.
    // Um total produziria um número que não responde a nenhuma delas — e é o tipo de soma que
    // esta tela existe para não fazer.
    const snap = {
      ...snapshot([]),
      blocosNaoApresentados: 2,
      medidasNaoResumidas: 3,
      medidasNaoAutorizadas: 1,
      blocosIlegiveis: 1,
    };
    const { unmount } = render(
      <LanguageProvider>
        <Retido snapshot={snap} />
      </LanguageProvider>,
    );
    expect(screen.queryByText("7")).toBeNull();
    unmount();
  });
});
