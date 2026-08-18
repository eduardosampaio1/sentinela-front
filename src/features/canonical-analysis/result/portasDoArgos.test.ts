// O cadeado das PORTAS. Ele existe porque métrica órfã numa reorganização se perde exatamente
// como se perdia na lista plana — e a primeira vez isso já aconteceu: o protótipo mapeava 34
// vagas sobre um catálogo que a D5 do inventário levou a 39, e cinco saídas ficaram sem lugar.
//
// O que se prova aqui, e a ordem importa:
//
// 1. **zero órfãs** — todo id que o front sabe nomear tem porta;
// 2. **nenhum *count* acima de `P2`** — a regra do owner, virada asserção sobre a tabela inteira;
// 3. **a porta não vira `domain`** — os dois eixos coexistem e nenhum sobrescreve o outro;
// 4. **a distância até o catálogo autoritativo é declarada** — o front carrega cópia parcial, e
//    um número escrito é a diferença entre uma lacuna conhecida e uma surpresa.

import { describe, expect, it } from "vitest";

import {
  BLOQUEADAS,
  DESTINO,
  NOMEAVEIS,
  PARAM_PORTA,
  PORTAS,
  PRIORIDADES,
  destinoDe,
  pertenceA,
  portaDaUrl,
  agruparPorPorta,
  contagemPorPorta,
} from "./portasDoArgos";

describe("Portas · 1. zero órfãs", () => {
  it("a varredura não passa a vazio", () => {
    // Sem isto, uma lista vazia faria todas as afirmações abaixo passarem sobre nada.
    expect(NOMEAVEIS.length).toBeGreaterThanOrEqual(30);
    expect(Object.keys(DESTINO).length).toBeGreaterThanOrEqual(30);
  });

  it("todo id que o front sabe nomear tem porta ou está bloqueado", () => {
    const orfas = NOMEAVEIS.filter((id) => destinoDe(id) === null && !BLOQUEADAS.includes(id));
    expect(orfas, `sem porta: ${orfas.join(", ")}`).toEqual([]);
  });

  it("a tabela não inventa id que o front não conhece", () => {
    // O inverso da órfã, e igualmente perigoso: uma linha para um id que não existe é uma porta
    // que nunca recebe ninguém, e ela envelhece sem que nada reprove.
    const inventadas = Object.keys(DESTINO).filter((id) => !NOMEAVEIS.includes(id));
    expect(inventadas, `id inexistente na tabela: ${inventadas.join(", ")}`).toEqual([]);
  });

  it("as bloqueadas continuam SEM porta, e nomeadas", () => {
    // Bloqueio que some da lista vira esquecimento silencioso.
    expect(BLOQUEADAS).toContain("token_waste");
    expect(BLOQUEADAS).toContain("token_waste_cost");
    for (const id of BLOQUEADAS) expect(destinoDe(id)).toBeNull();
  });

  it("as três portas recebem gente — nenhuma nasce vazia", () => {
    for (const porta of PORTAS) {
      const quantas = Object.keys(DESTINO).filter((id) => pertenceA(id, porta)).length;
      expect(quantas, `a porta \`${porta}\` está vazia`).toBeGreaterThan(0);
    }
  });

  it("o herói está no resumo, e é o único `P0`", () => {
    const p0 = Object.entries(DESTINO).filter(([, x]) => x.prioridade === "P0");
    expect(p0.map(([id]) => id)).toEqual(["behavior_score"]);
    expect(p0[0]?.[1].noResumo).toBe(true);
  });
});

describe("Portas · 2. nenhum *count* acima de P2 — a regra do owner", () => {
  // "counts devem funcionar como contexto/explicação dos rates e custos, não competir
  // necessariamente como KPIs de mesma hierarquia."
  const contagens = Object.keys(DESTINO).filter((id) => id.endsWith("_count"));

  it("há counts para julgar (a regra não passa a vazio)", () => {
    expect(contagens.length).toBeGreaterThanOrEqual(5);
  });

  it("nenhum count é P0 nem P1", () => {
    const altos = contagens.filter((id) => ["P0", "P1"].includes(DESTINO[id]!.prioridade));
    expect(altos, `count acima de P2: ${altos.join(", ")}`).toEqual([]);
  });

  it("nenhum count aparece no resumo ao lado do herói", () => {
    // O resumo é a resposta da tela. Um count ali disputaria a manchete com o veredito.
    const noResumo = contagens.filter((id) => DESTINO[id]!.noResumo);
    expect(noResumo, `count no resumo: ${noResumo.join(", ")}`).toEqual([]);
  });

  it("toda prioridade declarada é do vocabulário", () => {
    for (const [id, x] of Object.entries(DESTINO)) {
      expect(PRIORIDADES, `\`${id}\` com prioridade fora do vocabulário`).toContain(x.prioridade);
    }
  });
});

describe("Portas · 3. a porta NÃO vira `domain`", () => {
  it("nenhuma porta tem nome de domínio publicado", () => {
    // Se uma porta se chamasse `semantic`, `?porta=semantic` e `?dominio=semantic` diriam coisas
    // diferentes com a mesma palavra — e a primeira pessoa a ler as duas URLs concluiria que são
    // a mesma navegação.
    for (const porta of PORTAS) {
      expect(["semantic", "behavioral", "structural", "economic"]).not.toContain(porta);
    }
  });

  it("o parâmetro da porta é DIFERENTE do parâmetro do domínio", () => {
    expect(PARAM_PORTA).toBe("porta");
    expect(PARAM_PORTA).not.toBe("dominio");
  });

  it("as quatro dimensões têm porta E continuam sendo os domínios publicados", () => {
    // O único ponto em que os dois eixos se tocam. A porta as agrupa; o `domain` continua
    // sendo o que o produtor publicou sobre elas.
    for (const dim of ["semantic", "behavioral", "structural"]) {
      expect(pertenceA(dim, "qualidade"), `${dim} fora de Qualidade`).toBe(true);
    }
    expect(pertenceA("economic", "economia")).toBe(true);
  });
});

describe("Portas · 4. a URL, e a degradação honesta", () => {
  it("a porta pedida é lida do endereço", () => {
    expect(portaDaUrl("?porta=economia")).toBe("economia");
    expect(portaDaUrl("?porta=cobertura")).toBe("cobertura");
  });

  it("ausência do parâmetro é a Visão geral", () => {
    expect(portaDaUrl("")).toBeNull();
    expect(portaDaUrl("?outra=coisa")).toBeNull();
  });

  it("porta inventada na URL cai na Visão geral em vez de quebrar", () => {
    // URL editada à mão não derruba a tela, e cair no resumo não esconde nada.
    expect(portaDaUrl("?porta=inventada")).toBeNull();
  });

  it("o parâmetro do DOMÍNIO não é lido como porta", () => {
    expect(portaDaUrl("?dominio=economic")).toBeNull();
  });
});

describe("Portas · 5. o horizonte não muda a porta", () => {
  it("`projected_token_cost@month` cai na mesma porta do id base", () => {
    expect(destinoDe("projected_token_cost@month")?.portas).toEqual(["economia"]);
    expect(destinoDe("projected_token_cost@year")?.portas).toEqual(["economia"]);
    expect(destinoDe("projected_handoff_cost@month")?.portas).toEqual(["economia"]);
  });

  it("id desconhecido continua sem porta, com ou sem horizonte", () => {
    expect(destinoDe("saida_que_nao_existe")).toBeNull();
    expect(destinoDe("saida_que_nao_existe@month")).toBeNull();
  });
});

describe("Portas · 6. a repetição é deliberada, e contada", () => {
  it("exatamente as cinco previstas aparecem em mais de um lugar", () => {
    const emDuasPortas = Object.entries(DESTINO)
      .filter(([, x]) => x.portas.length > 1)
      .map(([id]) => id);
    const noResumoEEmPorta = Object.entries(DESTINO)
      .filter(([, x]) => x.noResumo && x.portas.length > 0)
      .map(([id]) => id);
    expect(emDuasPortas.sort()).toEqual(["intent_coverage_rate"]);
    expect(noResumoEEmPorta.sort()).toEqual([
      "cost_per_useful_outcome",
      "global_confidence",
      "semantic_drift",
    ]);
  });

  it("o herói NÃO se repete numa porta — ele é a resposta, não um item", () => {
    expect(DESTINO.behavior_score!.portas).toEqual([]);
  });
});

describe("Portas · 7. o agrupamento — e o que ele se recusa a esconder", () => {
  const med = (id: string) => ({
    id,
    value: 1,
    availability: "measured",
    reason: "ok",
    scale: { kind: "ratio_unit" },
  });
  const doc = () =>
    ({
      scores: [
        { measurement: med("behavior_score") },
        { measurement: med("global_confidence") },
        { measurement: med("saida_que_a_tabela_nao_conhece") },
      ],
      dimensions: [med("semantic"), med("economic")],
      indicators: [med("cost_per_useful_outcome"), med("critical_alert_count")],
      risks: [{ id: "containment_risk", measurement: med("containment_risk") }],
      projections: [{ id: "projected_token_cost@month", measurement: med("projected_token_cost@month") }],
    }) as never;

  it("cada item cai na porta declarada", () => {
    const a = agruparPorPorta(doc());
    const ids = (p: "qualidade" | "economia" | "cobertura") =>
      a.porPorta[p].map((x) => ("measurement" in x.item ? x.item.measurement.id : x.item.id));
    expect(ids("qualidade")).toContain("semantic");
    expect(ids("economia")).toEqual(
      expect.arrayContaining(["economic", "cost_per_useful_outcome", "containment_risk"]),
    );
    expect(ids("cobertura")).toEqual(
      expect.arrayContaining(["global_confidence", "critical_alert_count"]),
    );
  });

  it("o HERÓI não vira item de porta nenhuma — ele é a resposta", () => {
    const a = agruparPorPorta(doc());
    const todos = [...a.porPorta.qualidade, ...a.porPorta.economia, ...a.porPorta.cobertura]
      .map((x) => ("measurement" in x.item ? x.item.measurement.id : x.item.id));
    expect(todos).not.toContain("behavior_score");
    // E ele TAMBÉM não cai em `semPorta`: destino com portas vazias é diferente de sem destino.
    const soltos = a.semPorta.map((x) => ("measurement" in x.item ? x.item.measurement.id : x.item.id));
    expect(soltos).not.toContain("behavior_score");
  });

  it("saída que a tabela NÃO conhece aparece em `semPorta` — nunca some", () => {
    // O gate que importa deste bloco. Uma saída publicada que sumisse da tela existiria no
    // documento e não na interface, e ninguém saberia procurar por ela.
    const a = agruparPorPorta(doc());
    const soltos = a.semPorta.map((x) => ("measurement" in x.item ? x.item.measurement.id : x.item.id));
    expect(soltos).toContain("saida_que_a_tabela_nao_conhece");
  });

  it("o horizonte da projeção cai na porta do id base", () => {
    const a = agruparPorPorta(doc());
    const ids = a.porPorta.economia.map((x) => ("measurement" in x.item ? x.item.measurement.id : x.item.id));
    expect(ids).toContain("projected_token_cost@month");
  });

  it("a contagem é o tamanho real de cada porta", () => {
    const a = agruparPorPorta(doc());
    const c = contagemPorPorta(a);
    expect(c.qualidade).toBe(a.porPorta.qualidade.length);
    expect(c.economia).toBe(a.porPorta.economia.length);
    expect(c.cobertura).toBe(a.porPorta.cobertura.length);
    expect(c.qualidade + c.economia + c.cobertura).toBeGreaterThan(0);
  });

  it("documento vazio não inventa porta cheia", () => {
    const a = agruparPorPorta({} as never);
    expect(contagemPorPorta(a)).toEqual({ qualidade: 0, economia: 0, cobertura: 0 });
    expect(a.semPorta).toEqual([]);
  });
});
