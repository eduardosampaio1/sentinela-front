// NAV-01 — os cinco casos são as cinco formas de a paleta enganar quem digita.

import { describe, expect, it } from "vitest";
import { casar, type EntradaDaPaleta } from "./indiceDaPaleta";

const ENTRADAS: readonly EntradaDaPaleta[] = [
  { rotulo: "Conclusões", destino: "argos-conclusoes", grupo: "aqui" },
  { rotulo: "Intenções", destino: "argos-intents", grupo: "aqui" },
  { rotulo: "Cost per Useful Outcome", destino: "argos-indicators", grupo: "aqui",
    apelidos: ["custo", "custo por desfecho"] },
  { rotulo: "Procedência e divulgação", destino: "anl-procedencia", grupo: "aqui" },
  { rotulo: "Instâncias", destino: "/instances", grupo: "ir" },
];

describe("casamento de termo da paleta", () => {
  it("termo vazio devolve TUDO — a paleta aberta é um índice, não um campo esperando", () => {
    expect(casar(ENTRADAS, "")).toHaveLength(5);
    expect(casar(ENTRADAS, "   ")).toHaveLength(5);
  });

  it("acha sem acento, porque digitar sem acento é o caso comum", () => {
    expect(casar(ENTRADAS, "intencoes").map((e) => e.destino)).toEqual(["argos-intents"]);
    expect(casar(ENTRADAS, "procedencia").map((e) => e.destino)).toEqual(["anl-procedencia"]);
    expect(casar(ENTRADAS, "instancias").map((e) => e.destino)).toEqual(["/instances"]);
  });

  it("o APELIDO acha o nome que não se traduz — e não aparece na lista", () => {
    const r = casar(ENTRADAS, "custo");
    expect(r).toHaveLength(1);
    // O que casou foi o apelido "custo"; o que a pessoa lê continua sendo o nome publicado.
    expect(r[0].rotulo).toBe("Cost per Useful Outcome");
  });

  it("preserva a ORDEM DE ENTRADA — não existe relevância aqui", () => {
    // "c" casa com Conclusões, Cost e Procedência. Se houvesse ranking, "Cost" (começa com c)
    // subiria. A ordem da tela é a ordem do documento, e ela manda.
    expect(casar(ENTRADAS, "c").map((e) => e.destino)).toEqual([
      "argos-conclusoes",
      "argos-intents",
      "argos-indicators",
      "anl-procedencia",
      "/instances",
    ]);
  });

  it("sem resultado devolve lista VAZIA — quem diz o que fazer é a tela, não isto", () => {
    expect(casar(ENTRADAS, "zzz")).toEqual([]);
  });

  it("não corta: todo casamento sai, sem `top N`", () => {
    const muitas = Array.from({ length: 40 }, (_, i) => ({
      rotulo: `Região ${i}`, destino: `r-${i}`, grupo: "aqui" as const,
    }));
    expect(casar(muitas, "regiao")).toHaveLength(40);
  });

});
