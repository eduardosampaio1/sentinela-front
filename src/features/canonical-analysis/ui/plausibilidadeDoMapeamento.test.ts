// A regra de plausibilidade do mapeamento — os DOIS lados.
//
// Um arquivo que só provasse "o erro dispara aviso" seria satisfeito por avisar sempre. Os casos
// de escolha CORRETA são o que impede isso, e são a maioria aqui de propósito: um aviso que
// aparece em mapeamento bom é ruído, e ruído treina a pessoa a ignorá-lo.

import { describe, expect, it } from "vitest";

import {
  motivoDeImplausibilidade,
  type PerfilDaColuna,
} from "./plausibilidadeDoMapeamento";

const coluna = (types: string[], distinct: number | null): PerfilDaColuna => ({
  types,
  distinct_values: distinct,
});

describe("o caso MEDIDO em homologação", () => {
  it("avisa quando `canal` (3 valores em 360) vai para Date and time", () => {
    // O erro real: a ingestão recusou os 360 registros com `invalid_field_type`, e a tela
    // disse apenas "Couldn't complete".
    expect(motivoDeImplausibilidade("timestamp", coluna(["string"], 3), 360)).toBe(
      "repete_demais",
    );
  });

  it("NÃO avisa quando a coluna de data real vai para Date and time", () => {
    // A contraparte que impede "avisar sempre". Uma coluna temporal legítima tem quase um
    // valor por registro.
    expect(motivoDeImplausibilidade("timestamp", coluna(["string"], 358), 360)).toBeNull();
  });

  it("avisa quando uma flag `N`/`Y` vai para a resposta do assistente", () => {
    // Massa real: a coluna `nome_modelo` — nome enganoso — continha só `N` e `Y`. Mapeada
    // como resposta, a ingestão recusou 106.608 registros.
    expect(motivoDeImplausibilidade("assistant_text", coluna(["string"], 2), 106608)).toBe(
      "poucos_valores",
    );
  });
});

describe("o tipo, onde ele basta", () => {
  it("avisa quando `turns` recebe uma coluna sem tipo numérico", () => {
    expect(motivoDeImplausibilidade("turns", coluna(["string"], 40), 100)).toBe(
      "tipo_incompativel",
    );
  });

  it("aceita `turns` com inteiro", () => {
    expect(motivoDeImplausibilidade("turns", coluna(["integer"], 40), 100)).toBeNull();
  });

  it("avisa quando texto livre recebe coluna sem `string`", () => {
    expect(motivoDeImplausibilidade("assistant_text", coluna(["integer"], 900), 1000)).toBe(
      "tipo_incompativel",
    );
  });
});

describe("o TIPO não basta para data, e é por isso que a regra olha cardinalidade", () => {
  it("uma data em texto ISO é `string` — e tem de passar", () => {
    // A regra do servidor (`_compativel_com_o_tipo`) aceita `string` para `timestamp`
    // justamente por isso. Uma validação por tipo teria deixado o erro medido passar.
    expect(motivoDeImplausibilidade("timestamp", coluna(["string"], 1000), 1000)).toBeNull();
  });

  it("uma data em epoch inteiro também passa", () => {
    expect(motivoDeImplausibilidade("timestamp", coluna(["integer"], 1000), 1000)).toBeNull();
  });
});

describe("ausência não vira julgamento", () => {
  it("sem perfil da coluna, não avisa", () => {
    expect(motivoDeImplausibilidade("timestamp", undefined, 360)).toBeNull();
  });

  it("sem `distinct_values`, não avisa", () => {
    expect(motivoDeImplausibilidade("timestamp", coluna(["string"], null), 360)).toBeNull();
  });

  it("sem `records_observed`, não avisa — a razão precisa dos dois números", () => {
    // 3 distintos em 4 registros é normal; em 360 não é. Sem o denominador, não há dúvida
    // fundamentada.
    expect(motivoDeImplausibilidade("timestamp", coluna(["string"], 3), null)).toBeNull();
  });

  it("sem tipos observados, o ramo de tipo não julga", () => {
    expect(motivoDeImplausibilidade("turns", coluna([], 40), 100)).toBeNull();
  });
});

describe("campos fora das regras seguem sem aviso", () => {
  it("`conversation_id` com poucos valores não é assunto desta regra", () => {
    // Ele TEM regra própria no servidor (duplicidade), e ela é do contrato, não da tela.
    expect(motivoDeImplausibilidade("conversation_id", coluna(["string"], 3), 360)).toBeNull();
  });

  it("uma dimensão com 3 valores é o caso NORMAL — canal tem três", () => {
    expect(motivoDeImplausibilidade("channel", coluna(["string"], 3), 360)).toBeNull();
  });
});
