// As larguras de barra da visão Medidas — provadas como aritmética, longe da árvore de UI.
//
// O que estes casos defendem não é "a barra aparece": é que a barra corresponde ao número que
// está escrito ao lado dela. Uma barra que mente é pior que barra nenhuma, porque ela é lida
// antes do texto.

import { describe, expect, it } from "vitest";
import {
  largurasDeConcentracao,
  largurasDeDistribuicao,
  largurasDeSerie,
} from "./barrasDaProjecao";
import type {
  ResumoDeConcentracao,
  ResumoDeDistribuicao,
  SerieTemporal,
} from "./analyticsProjection";

/** Uma distribuição mínima — só o que a largura consome. */
function distribuicao(groups: { label: string; count: number }[], other: number | null = null) {
  return { groups, other_count: other } as unknown as ResumoDeDistribuicao;
}

function concentracao(bands: { lower_value: number; upper_value: number; entity_count: number }[]) {
  return { bands } as unknown as ResumoDeConcentracao;
}

function serie(windows: { window_start: string; count: number | null }[]) {
  return { windows } as unknown as SerieTemporal;
}

describe("largura de barra · a maior manda, e a escala é relativa a ela", () => {
  it("o maior grupo ocupa a largura inteira e os outros ficam em proporção", () => {
    const l = largurasDeDistribuicao(
      distribuicao([
        { label: "a", count: 50 },
        { label: "b", count: 25 },
        { label: "c", count: 10 },
      ]),
    );
    expect(l).toEqual(["100.0%", "50.0%", "20.0%"]);
  });

  it("a ordem da saída é a ordem da ENTRADA — a tela não reordena por tamanho", () => {
    // Reordenar por tamanho seria priorização decidida no navegador. É a mesma proibição que o
    // ARGOS já carrega para severidade, e ela vale igual aqui.
    const l = largurasDeDistribuicao(
      distribuicao([
        { label: "pequeno", count: 1 },
        { label: "grande", count: 100 },
      ]),
    );
    expect(l).toEqual(["1.0%", "100.0%"]);
  });

  it("lista de zeros não elege uma barra maior", () => {
    // Dividir por zero produziria `NaN`, que o navegador desenha como largura vazia sem ninguém
    // saber por quê — e uma das três pareceria "a maior" por acidente de arredondamento.
    expect(
      largurasDeDistribuicao(
        distribuicao([
          { label: "a", count: 0 },
          { label: "b", count: 0 },
        ]),
      ),
    ).toEqual(["0%", "0%"]);
  });

  it("`other_count` NÃO entra na escala, mesmo sendo maior que todos os grupos", () => {
    // `other` é a soma do que não pôde ser publicado, não um grupo. Se entrasse, a maior barra
    // seria "todo o resto" — que a tela nem desenha — e os grupos nomeados encolheriam contra
    // um valor invisível.
    const l = largurasDeDistribuicao(
      distribuicao(
        [
          { label: "a", count: 10 },
          { label: "b", count: 5 },
        ],
        9999,
      ),
    );
    expect(l).toEqual(["100.0%", "50.0%"]);
  });

  it("a faixa de concentração escala por ENTIDADES", () => {
    const l = largurasDeConcentracao(
      concentracao([
        { lower_value: 0, upper_value: 10, entity_count: 8 },
        { lower_value: 10, upper_value: 20, entity_count: 2 },
      ]),
    );
    expect(l).toEqual(["100.0%", "25.0%"]);
  });
});

describe("largura de barra · janela suprimida não distorce a série", () => {
  it("a janela suprimida não interfere na proporção das outras", () => {
    // ATENÇÃO ao ler este caso: ele NÃO prova que o filtro de nulos serve para alguma coisa.
    //
    // Eu escrevi um caso que dizia isso e mutei o código para conferir — troquei o filtro por
    // `count ?? 0` e os oito continuaram verdes. Com escala por máximo, acrescentar zeros nunca
    // abaixa o máximo: o filtro é declaração de intenção, não defesa.
    //
    // O que este caso prova é o que importa para quem lê a tela: uma janela sem número no meio
    // da série não muda a proporção das janelas que têm número. A defesa real da supressão é
    // `suprimida` no `Bar`, e está provada no teste da tela.
    const l = largurasDeSerie(
      serie([
        { window_start: "2026-01", count: 10 },
        { window_start: "2026-02", count: null },
        { window_start: "2026-03", count: 5 },
      ]),
    );
    expect(l[0]).toBe("100.0%");
    expect(l[2]).toBe("50.0%");
  });

  it("a suprimida devolve 0% — e quem desenha não usa este valor", () => {
    // O `Bar` recebe `suprimida` e não desenha barra nenhuma: barra de largura zero e barra de
    // valor zero são indistinguíveis, e afirmam coisas opostas.
    const l = largurasDeSerie(serie([{ window_start: "2026-01", count: null }]));
    expect(l).toEqual(["0%"]);
  });

  it("série inteira suprimida não vira NaN", () => {
    const l = largurasDeSerie(
      serie([
        { window_start: "2026-01", count: null },
        { window_start: "2026-02", count: null },
      ]),
    );
    expect(l).toEqual(["0%", "0%"]);
    expect(l.join("")).not.toContain("NaN");
  });
});
