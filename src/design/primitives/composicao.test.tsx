// A barra de COMPOSIÇÃO, e as três afirmações que ela precisa saber separar.
//
//   medido e vale X   → fatia colorida, valor escrito
//   medido e vale 0   → fatia de largura zero, e o `0` escrito
//   NÃO medido        → fatia com TEXTURA, e "não medido" escrito
//
// Sem a terceira, "não medimos a transferência" e "a transferência não custou nada" viram a
// mesma barra — e são conclusões opostas para quem decide. É o caso REAL do documento hoje:
// `total = 1.68`, `token = 1.68`, `handoff = null`.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarraDeComposicao } from "./BarraDeComposicao";
import { fatiasDaComposicao, type ParteDaComposicao } from "./composicao";

const p = (id: string, valor: number | null, escrito = String(valor)): ParteDaComposicao => ({
  id,
  rotulo: id,
  valor,
  escrito,
});

describe("Composição · a aritmética, e o que ela se recusa a esconder", () => {
  it("as partes medidas viram largura proporcional ao TOTAL", () => {
    const f = fatiasDaComposicao([p("a", 25), p("b", 75)], 100);
    expect(f?.map((x) => x.largura)).toEqual(["25.00%", "75.00%"]);
  });

  it("o TOTAL manda, não a soma — o que falta APARECE", () => {
    // Escalar as partes para preencher 100% esconderia exatamente a diferença que o leitor
    // precisa ver: uma parte do custo que ninguém atribuiu.
    const f = fatiasDaComposicao([p("a", 30)], 100);
    expect(f).toHaveLength(2);
    expect(f?.[1]).toMatchObject({ id: "__nao_atribuido", largura: "70.00%", ausente: true });
  });

  it("parte NÃO medida RECEBE a sobra, e sai com textura", () => {
    // A primeira versão deste caso usava `total = 1.68` e `token = 1.68` — sobra ZERO —, e
    // então a mutação que OMITE as partes não medidas sobreviveu: sem sobra, a fatia ausente
    // não existiria de nenhum jeito. O nome prometia o que a asserção não verificava.
    const f = fatiasDaComposicao([p("token", 60), p("handoff", null)], 100);
    expect(f).toHaveLength(2);
    expect(f?.[0]).toMatchObject({ id: "token", largura: "60.00%", ausente: false });
    expect(f?.[1]).toMatchObject({ id: "handoff", largura: "40.00%", ausente: true });
  });

  it("duas partes não medidas DIVIDEM a sobra", () => {
    const f = fatiasDaComposicao([p("a", 50), p("b", null), p("c", null)], 100);
    expect(f?.filter((x) => x.ausente).map((x) => x.largura)).toEqual(["25.00%", "25.00%"]);
  });

  it("o caso REAL de hoje: sobra zero, e a barra fecha sem fatia ausente", () => {
    // `total = 1.68`, `token = 1.68`, `handoff = null`. Aqui a hachura não aparece na barra
    // — e é a LEGENDA que carrega o "não medido". Os dois canais existem por isso.
    const f = fatiasDaComposicao([p("token", 1.68), p("handoff", null)], 1.68);
    expect(f).toHaveLength(1);
    expect(f?.[0]).toMatchObject({ id: "token", ausente: false });
  });

  it("zero MEDIDO e ausência não se confundem", () => {
    const medidoZero = fatiasDaComposicao([p("a", 0), p("b", 100)], 100);
    const ausente = fatiasDaComposicao([p("a", null), p("b", 100)], 100);
    expect(medidoZero?.find((x) => x.id === "a")?.ausente).toBe(false);
    // Com sobra zero, a ausente não vira fatia — e é a legenda que a nomeia.
    expect(ausente?.find((x) => x.id === "a")).toBeUndefined();
  });

  it("soma MAIOR que o total não é normalizada — não há barra", () => {
    // Produtor incoerente. Uma barra plausível e errada é pior que nenhuma: ela é lida como fato.
    expect(fatiasDaComposicao([p("a", 80), p("b", 80)], 100)).toBeNull();
  });

  it("sem total, sem barra — total não se infere somando as partes", () => {
    expect(fatiasDaComposicao([p("a", 30), p("b", 70)], null)).toBeNull();
    expect(fatiasDaComposicao([p("a", 30)], 0)).toBeNull();
  });
});

describe("Composição · a tela, e o canal que não depende de cor", () => {
  const partes = [p("Tokens", 1.68, "US$ 1,68"), p("Transferência", null, "—")];

  it("a legenda escreve nome e valor de cada parte", () => {
    render(
      <BarraDeComposicao
        partes={partes}
        total={1.68}
        rotuloAusente="não medido"
        descricao="composição do custo"
      />,
    );
    expect(screen.getByText("Tokens")).toBeInTheDocument();
    expect(screen.getByText("US$ 1,68")).toBeInTheDocument();
  });

  it("a parte NÃO medida ganha PALAVRA, não um traço", () => {
    // A hachura resolve para quem vê. Quem usa leitor de tela precisa da palavra.
    render(
      <BarraDeComposicao
        partes={partes}
        total={1.68}
        rotuloAusente="não medido"
        descricao="composição do custo"
      />,
    );
    expect(screen.getByText("não medido")).toBeInTheDocument();
  });

  it("a figura tem nome", () => {
    render(
      <BarraDeComposicao
        partes={partes}
        total={1.68}
        rotuloAusente="não medido"
        descricao="Custo total US$ 1,68: tokens US$ 1,68, transferência não medida"
      />,
    );
    expect(screen.getByRole("img", { name: /Custo total/ })).toBeInTheDocument();
  });

  it("sem total, o componente não desenha NADA", () => {
    const { container } = render(
      <BarraDeComposicao
        partes={partes}
        total={null}
        rotuloAusente="não medido"
        descricao="x"
      />,
    );
    expect(container.querySelector("[role='img']")).toBeNull();
    expect(container.textContent).toBe("");
  });
});
