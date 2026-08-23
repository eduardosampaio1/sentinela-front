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
import { PorQueEstaVazio } from "./AnalyticsView";

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
    numeric,
    distributions: [],
    dimensions: [],
    concentrations: [],
    time_series: [],
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
    expect(screen.getByText("0.0896")).toBeTruthy();
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
      snapshot([medida({ minimum: null, maximum: null, total: null, mean: null })]),
    );

    for (const rotulo of ["minimum", "maximum", "total", "mean"]) {
      const par = screen.getByText(rotulo).closest("div");
      expect(par?.textContent ?? "", `\`${rotulo}\` não disse "não publicado"`).toMatch(
        /not published/i,
      );
      expect(par?.textContent ?? "", `\`${rotulo}\` virou zero`).not.toMatch(/\b0\b/);
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

/** O bloco irmão continua intacto — a faixa do vazio não pode ter sido afetada. */
describe("a faixa do vazio segue funcionando", () => {
  it("aparece quando nada está aberto por campo", () => {
    const { unmount } = render(
      <LanguageProvider>
        <PorQueEstaVazio snapshot={snapshot([])} />
      </LanguageProvider>,
    );
    expect(screen.getByText("Nothing is broken down by field")).toBeTruthy();
    unmount();
  });
});
