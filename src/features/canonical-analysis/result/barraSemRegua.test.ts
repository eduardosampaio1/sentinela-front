// SEM RÉGUA, SEM BARRA — e a razão veio de o owner OLHAR a tela.
//
// *"Parece que está desalinhado essas barras, olha que estranho."* No cartão de Economia,
// `US$ 2,40` e `US$ 1,68` desenhavam a MESMA barra cheia, lado a lado. A linha era:
//
//     if (limite === null) return "100%";
//
// Moeda, contagem e duração não têm faixa canônica: não existe "o máximo" de um custo em
// dólares. Barra cheia é a afirmação visual mais forte que existe, e estava sendo usada para
// dizer "não sei medir isto" — ausência renderizada como valor, escolhendo o valor máximo.

import { describe, expect, it } from "vitest";

import { largurasDeItens } from "./barrasDoArgos";
import type { ItemDeDominio } from "./dominiosDoArgos";

const item = (kind: string, value: number | null, extra: Record<string, unknown> = {}) =>
  ({
    familia: "indicators",
    item: {
      id: "x",
      value,
      unit: null,
      currency: null,
      scale: { kind, minimum: null, maximum: null, ...extra },
    },
  }) as unknown as ItemDeDominio;

describe("Mini-barra · só desenha onde há régua", () => {
  it("`ratio_unit` e `score_100` têm faixa canônica — desenham", () => {
    expect(largurasDeItens([item("ratio_unit", 0.786)])).toEqual(["78.6%"]);
    expect(largurasDeItens([item("score_100", 54.46)])).toEqual(["54.5%"]);
    expect(largurasDeItens([item("percent", 12)])).toEqual(["12.0%"]);
  });

  it("MOEDA não tem régua — não desenha", () => {
    // O caso que o owner viu: dois custos diferentes com a mesma barra cheia.
    expect(largurasDeItens([item("currency", 2.4), item("currency", 1.68)])).toEqual([
      null,
      null,
    ]);
  });

  it("contagem e duração também não", () => {
    expect(largurasDeItens([item("count", 12480)])).toEqual([null]);
    expect(largurasDeItens([item("duration", 3.2)])).toEqual([null]);
    expect(largurasDeItens([item("raw", 0.42)])).toEqual([null]);
  });

  it("nenhuma delas devolve `\"100%\"` — a barra cheia deixou de significar ausência", () => {
    // O contra-cadeado literal. Sem ele, uma volta ao `return "100%"` passaria em qualquer
    // teste que só verificasse "desenha ou não desenha".
    const larguras = largurasDeItens([
      item("currency", 2.4),
      item("count", 100),
      item("duration", 1),
    ]);
    expect(larguras).not.toContain("100%");
  });

  it("limite EXPLÍCITO do produtor manda, inclusive sobre moeda", () => {
    // Se um dia o produtor declarar `minimum`/`maximum` para um custo, aí HÁ régua — e a barra
    // volta. A regra não é "moeda nunca tem barra": é "sem régua declarada, sem barra".
    expect(
      largurasDeItens([item("currency", 25, { minimum: 0, maximum: 100 })]),
    ).toEqual(["25.0%"]);
  });

  it("valor AUSENTE continua `\"0%\"`, e não `null`", () => {
    // Os dois estados são diferentes e precisam continuar sendo: `0%` é "medimos e não há
    // magnitude a mostrar"; `null` é "não temos régua". O componente trata cada um do seu jeito.
    expect(largurasDeItens([item("ratio_unit", null)])).toEqual(["0%"]);
  });

  it("valor fora da faixa GRUDA na borda em vez de vazar", () => {
    expect(largurasDeItens([item("ratio_unit", 4)])).toEqual(["100.0%"]);
    expect(largurasDeItens([item("score_100", -30)])).toEqual(["0.0%"]);
  });
});
