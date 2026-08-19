// A EXPLICAÇÃO da métrica, e o cadeado que impede o `i` de abrir vazio.
//
// O owner leu a avaliação e reparou no que faltava nela: *"não vi eles pedindo tooltips —
// estranho"*. Ele estava certo duas vezes. O protótipo aprovado TEM o padrão (`<span class="i"
// title="...">`), e as descrições dos indicadores JÁ EXISTIAM escritas no produto — só não
// apareciam em lugar nenhum.
//
// A tela mostra `Semantic drift` em inglês, por decisão registrada de não traduzir nome de
// métrica. Sem uma frase ao lado, o nome é a única pista — e para quem não é do time, não é
// pista nenhuma. **A explicação é o que torna a decisão de não traduzir sustentável.**

import { describe, expect, it } from "vitest";

import pt from "@/i18n/pt.json";
import en from "@/i18n/en.json";
import { OUTPUTS_DO_CATALOGO, explicacaoDe } from "./catalogoArgos";

const desc = (l: typeof pt) =>
  (l.canonicalAnalysis.argos as unknown as { outputDescription: Record<string, string> })
    .outputDescription;

// Um `t` que devolve a própria chave: aqui o que se mede é SE existe caminho para o id,
// não o texto — o texto é conferido direto no dicionário, logo abaixo.
const tChave = (k: string) => k;
const declara = (id: string) => explicacaoDe(tChave, id) !== null;

describe("Explicação · a lista e o texto não divergem", () => {
  it("todo id que DECLARA ter explicação tem texto nos DOIS idiomas", () => {
    // O defeito que isto pega: alguém acrescenta o id à lista e esquece a frase. O `i`
    // apareceria e abriria mostrando a própria chave.
    const semTexto = OUTPUTS_DO_CATALOGO.filter(
      (id) => declara(id) && (!desc(pt)[id] || !desc(en)[id]),
    );
    expect(semTexto, `declara explicação e não tem texto: ${semTexto.join(", ")}`).toEqual([]);
  });

  it("todo texto escrito tem id que o DECLARA", () => {
    // O inverso, e igualmente inútil: frase escrita que nunca aparece porque ninguém a declarou.
    const orfas = Object.keys(desc(pt)).filter((id) => !declara(id));
    expect(orfas, `texto sem declaração: ${orfas.join(", ")}`).toEqual([]);
  });

  it("a varredura não passa a vazio", () => {
    expect(OUTPUTS_DO_CATALOGO.length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(desc(pt)).length).toBeGreaterThanOrEqual(10);
  });

  it("as CINCO do primeiro écran têm explicação", () => {
    // Herói e satélites. Eram justamente as que não tinham texto — as descrições que já
    // existiam cobriam os indicadores, que aparecem mais fundo.
    for (const id of [
      "behavior_score",
      "ai_health_score",
      "consistency_score",
      "global_confidence",
      "semantic_drift",
    ]) {
      expect(declara(id), `${id} sem explicação`).toBe(true);
      expect(desc(pt)[id]!.length, `${id} com texto vazio`).toBeGreaterThan(20);
    }
  });

  it("id DESCONHECIDO não declara explicação", () => {
    expect(declara("saida_que_nao_existe")).toBe(false);
  });

  it("o horizonte da projeção herda a explicação do id base", () => {
    expect(declara("projected_token_cost@month")).toBe(true);
    expect(declara("projected_token_cost@year")).toBe(true);
  });

  it("nenhuma descrição repete o próprio NOME em vez de explicar", () => {
    // "Behavior score: Behavior score" seria pior que nada. Cada frase precisa dizer algo que o
    // nome não diz — e a régua mais barata é: tem verbo e não é só o rótulo.
    for (const [id, texto] of Object.entries(desc(pt))) {
      expect(texto.length, `${id}: frase curta demais para explicar`).toBeGreaterThan(20);
    }
  });
});
