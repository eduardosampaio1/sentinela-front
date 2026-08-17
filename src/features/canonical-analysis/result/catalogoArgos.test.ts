// Os nomes do catálogo do ARGOS — e as três coisas que podem dar errado neles.
//
// Este arquivo não prova que os rótulos são bonitos. Prova que existem dois registros de nome,
// que eles não se sobrepõem, que os dois dicionários cobrem tudo o que este declara, e que o
// cadeado anti-invenção continua fechado para quem nenhum dos dois conhece.

import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import pt from "@/i18n/pt.json";
import { OUTPUTS_DO_CATALOGO, nomeadoPeloCatalogo } from "./catalogoArgos";
import { INDICATOR_DESCRIPTORS } from "./descriptors";

const NOMES_EN = en.canonicalAnalysis.argos.output as Record<string, string>;
const NOMES_PT = pt.canonicalAnalysis.argos.output as Record<string, string>;

describe("catálogo ARGOS · dois registros de nome, zero interseção", () => {
  it("nenhum id está nos DOIS registros", () => {
    // Um id nos dois teria dois nomes, livres para divergir sem que nada reclamasse. É a mesma
    // classe de defeito que o produto pagou no nome do Workspace.
    const nosDois = OUTPUTS_DO_CATALOGO.filter((id) => id in INDICATOR_DESCRIPTORS);
    expect(nosDois, `ids duplicados nos dois registros: ${nosDois.join(", ")}`).toEqual([]);
  });

  it("todo id declarado tem nome nos DOIS idiomas", () => {
    // Um id sem chave cairia no `t()` e sairia como a própria chave — pior que o id cru, porque
    // pareceria um rótulo.
    const semEn = OUTPUTS_DO_CATALOGO.filter((id) => !NOMES_EN[id]);
    const semPt = OUTPUTS_DO_CATALOGO.filter((id) => !NOMES_PT[id]);
    expect(semEn, `sem nome em EN: ${semEn.join(", ")}`).toEqual([]);
    expect(semPt, `sem nome em PT: ${semPt.join(", ")}`).toEqual([]);
  });

  it("nenhum nome sobra no dicionário sem id que o use", () => {
    // Rótulo órfão é copy que ninguém mostra — e vira armadilha para a próxima prova, como já
    // aconteceu com `account.workspaces`.
    const orfaosEn = Object.keys(NOMES_EN).filter(
      (k) => !(OUTPUTS_DO_CATALOGO as readonly string[]).includes(k),
    );
    expect(orfaosEn, `nomes sem dono: ${orfaosEn.join(", ")}`).toEqual([]);
  });
});

describe("catálogo ARGOS · o cadeado anti-invenção continua fechado", () => {
  it("um id que ninguém conhece NÃO ganha chave", () => {
    // O terceiro caminho de `rotuloDe` é o que protege: output novo no backend aparece como id
    // cru até alguém decidir como chamá-lo, em vez de receber um nome adivinhado aqui.
    expect(nomeadoPeloCatalogo("metrica_que_o_backend_inventou_ontem")).toBe(false);
  });

  it("os ids do registro de ECONOMIA não são atendidos por este registro", () => {
    // Eles têm caminho próprio e mais rico — nome, descrição e o campo do código analítico que
    // sustenta o valor. Este aqui promete só o nome, e não deve competir.
    for (const id of Object.keys(INDICATOR_DESCRIPTORS)) {
      expect(nomeadoPeloCatalogo(id), `${id} deveria ser servido pelo descriptor`).toBe(false);
    }
  });
});

describe("catálogo ARGOS · o horizonte NÃO entra na identidade", () => {
  it("as projeções são DOIS ids, e nenhum carrega `@`", () => {
    // O catálogo do backend identifica quatro projeções com `@month`/`@year`, e a nota dele diz
    // por quê: "horizonte é DADO; o `@` só desambigua a identidade no catálogo". O contrato
    // público manda `id` e `horizon` separados. Copiar os quatro criaria rótulos que nunca
    // casariam com nenhum id que chega.
    const projecoes = OUTPUTS_DO_CATALOGO.filter((id) => id.startsWith("projected_"));
    expect(projecoes).toEqual(["projected_token_cost", "projected_handoff_cost"]);
    expect(OUTPUTS_DO_CATALOGO.filter((id) => id.includes("@"))).toEqual([]);
  });

  it("o nome da projeção não diz o horizonte — a tela o imprime ao lado", () => {
    for (const id of ["projected_token_cost", "projected_handoff_cost"]) {
      expect(NOMES_EN[id]).not.toMatch(/month|year|\//i);
      expect(NOMES_PT[id]).not.toMatch(/mês|ano|\//i);
    }
  });
});
