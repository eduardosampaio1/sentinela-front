// O RANKING das intenções — a ordem é o conteúdo, e por isso ela é o que se trava.
//
// A versão anterior desenhava a barra pelo SUPORTE, na ordem do documento: respondia "qual
// intenção tem mais conversas", que é pergunta de cobertura. Com a massa real de hoje — escores
// `10`, `80`, `22.5` — a pior ficava no MEIO da lista, e achá-la exigia ler as três.
//
// Ordenar por um número publicado é APRESENTAÇÃO: qualquer pessoa refaz a conta olhando a coluna.
// O que a tela continua proibida de fazer é decidir gravidade — e não decide: `severity` vem do
// produtor e é exibida como veio.

import { describe, expect, it } from "vitest";

import type { PublicIntent } from "@/lib/v1/contract/public-v3.types";
import { largurasDeEscore, ordenadasPorPior } from "./barrasDoArgos";

const i = (id: string, valor: number | null, support = 10) =>
  ({
    intent_id: id,
    support,
    underrepresented: false,
    score: {
      id: "intent_score",
      value: valor,
      availability: valor === null ? "not_measured" : "measured",
      reason: valor === null ? "insufficient_sample" : "ok",
      scale: { kind: "score_100", minimum: null, maximum: null },
    },
  }) as unknown as PublicIntent;

const ids = (xs: readonly PublicIntent[]) => xs.map((x) => x.intent_id);

describe("Ranking · o pior primeiro", () => {
  it("a massa REAL de hoje: `cancelamento` sai do meio para o topo", () => {
    // Ordem do documento: cancelamento(10), cobranca(80), suporte(22.5).
    const fila = ordenadasPorPior([
      i("cancelamento", 10),
      i("cobranca.segunda_via", 80),
      i("suporte.tecnico", 22.5),
    ]);
    expect(ids(fila)).toEqual(["cancelamento", "suporte.tecnico", "cobranca.segunda_via"]);
  });

  it("menor escore é pior, e pior vem primeiro", () => {
    expect(ids(ordenadasPorPior([i("bom", 90), i("ruim", 12), i("medio", 50)]))).toEqual([
      "ruim",
      "medio",
      "bom",
    ]);
  });

  it("SEM escore vai para o FIM — `null` não é zero", () => {
    // Uma intenção sem amostra não é a pior: é a desconhecida. No topo, ela afirmaria um problema
    // que ninguém mediu — e empurraria para baixo a que tem problema medido.
    const fila = ordenadasPorPior([i("sem", null), i("pessimo", 5), i("bom", 90)]);
    expect(ids(fila)).toEqual(["pessimo", "bom", "sem"]);
  });

  it("empate mantém a ORDEM DO DOCUMENTO, e não a alfabética", () => {
    // Reordenar empate por nome inventaria uma hierarquia onde o produtor não declarou nenhuma.
    expect(ids(ordenadasPorPior([i("zebra", 50), i("alfa", 50)]))).toEqual(["zebra", "alfa"]);
  });

  it("várias sem escore preservam a ordem entre si", () => {
    const fila = ordenadasPorPior([i("b", null), i("a", null), i("c", 10)]);
    expect(ids(fila)).toEqual(["c", "b", "a"]);
  });

  it("a lista original NÃO é mutada", () => {
    // `sort` in-place sobre a prop reordenaria o que o chamador ainda vai usar — e o detalhe
    // abaixo da barra passaria a discordar da barra em outra renderização.
    const original = [i("b", 80), i("a", 10)];
    const copia = ids(original);
    ordenadasPorPior(original);
    expect(ids(original)).toEqual(copia);
  });

  it("lista vazia não quebra", () => {
    expect(ordenadasPorPior([])).toEqual([]);
    expect(largurasDeEscore([])).toEqual([]);
  });
});

describe("Ranking · a barra mede QUALIDADE, não amostra", () => {
  it("a maior largura é a do maior escore", () => {
    const fila = [i("ruim", 25), i("bom", 100)];
    const larguras = largurasDeEscore(fila);
    expect(parseFloat(larguras[1]!)).toBeGreaterThan(parseFloat(larguras[0]!));
  });

  it("o SUPORTE não influencia a largura", () => {
    // O cadeado da troca: mesma nota, suportes opostos, larguras IGUAIS. Sem isto, voltar a
    // medir suporte passaria despercebido.
    const a = largurasDeEscore([i("x", 50, 1), i("y", 50, 9999)]);
    expect(a[0]).toBe(a[1]);
  });

  it("escore ausente não vira barra cheia", () => {
    const larguras = largurasDeEscore([i("sem", null), i("cheio", 100)]);
    expect(parseFloat(larguras[0]!)).toBeLessThan(parseFloat(larguras[1]!));
  });
});
