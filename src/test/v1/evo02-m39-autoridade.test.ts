// M39 · EVO-02 — gates de AUTORIDADE, escritos antes da implementação.
//
// O preflight achou o que realmente bloqueava a M39, e não era backend: a autoridade misturava
// comparação A×B com evolução longitudinal de Instance, e chamava de "AS-IS" um componente cuja
// regra **contradiz** a canônica. Estes casos travam as decisões de 2026-08-12 para que a
// implementação não precise relê-las de memória — e para que ninguém as desfaça sem ficar vermelho.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGO, scenario } from "@/mocks/scenarios";

const RAIZ = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(?<!:)\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const BLUEPRINT = ler("docs/EXPERIENCE-BLUEPRINT-V1.md");
const PLAN = ler("docs/FRONT-V1-IMPLEMENTATION-PLAN.md");
const FREEZE = ler("docs/PRODUCT-EXPERIENCE-FREEZE-V1.md");
const CANONICA = "src/features/canonical-analysis/result/comparacao.ts";
const LEGADO = "src/features/history/RunComparePanel.tsx";
const ROTA = "/analyses/compare/{analysisAId}/{analysisBId}";
const entradaM39 = () => PLAN.match(/### M39[\s\S]*?(?=### M40)/)![0];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Escopo — EVO-02 e só ela
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · 1. a missão é EVO-02, sem INST-06", () => {
  it("a entrada deixou de ser esparsa", () => {
    const e = entradaM39();
    for (const campo of ["**Superfícies:**", "**Rota canônica:**", "**Escopo:**", "**Fora:**", "**DoD:**", "**Gates:**", "**Autoridades:**"]) {
      expect(e, `a M39 continua sem ${campo}`).toContain(campo);
    }
  });

  it("INST-06 está no Fora, e declarada como delta sem produtor", () => {
    const fora = entradaM39().match(/\*\*Fora:\*\*[\s\S]*?(?=\n- \*\*)/)![0];
    expect(fora).toContain("INST-06");
    expect(fora).toMatch(/s[ée]rie\/evolu[çc][ãa]o longitudinal/i);
    expect(BLUEPRINT).toContain("DELTA DECLARADO — evolução longitudinal da Instance sem produtor");
    // A rota dela continua conceitual: declarar delta e congelar rota ao mesmo tempo seria
    // autorizar pela porta dos fundos.
    expect(BLUEPRINT).toMatch(/`\/instances\/\{id\}\/evolution` segue \*\*conceitual\*\*/);
  });

  it("nenhuma face corrente diz que INST-06 pertence à M39", () => {
    for (const [nome, doc] of [["Blueprint", BLUEPRINT], ["PLAN", PLAN], ["Product Freeze", FREEZE]] as const) {
      expect(doc, `${nome} ainda dá INST-06 à M39`).not.toMatch(/INST-06[^\n]{0,40}(pertence à M39|junto de EVO-02)/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Rota congelada — uma, e com os dois ids no endereço
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · 2. a rota canônica está congelada", () => {
  it("Blueprint e PLAN declaram a MESMA rota", () => {
    expect(BLUEPRINT, "a rota não foi congelada no Blueprint").toContain(ROTA);
    expect(entradaM39(), "a entrada da M39 não nomeia a rota").toContain(ROTA);
  });

  it("os dois ids são identidade durável — nada de query, storage ou navigation state", () => {
    const e = entradaM39();
    expect(e).toMatch(/identidade dur[áa]vel na URL/i);
    expect(e).toMatch(/sem query param, sem storage, sem navigation state/i);
  });

  it("o router declara a rota congelada, com os DOIS ids no caminho", () => {
    // PROMOVIDO com a implementação da M39, como o comentário anterior previa. Antes ele exigia
    // que a rota NÃO existisse (o alinhamento era só de autoridade); agora prova o router.
    const r = semComentarios(ler("src/app/router.tsx"));
    expect(r).toContain('path: "/analyses/compare/:analysisAId/:analysisBId"');
    // Nenhuma variante com query param ou id único entrou pela porta dos fundos.
    expect(r).not.toMatch(/path: "\/analyses\/compare"/);
    expect(r).not.toMatch(/path: "\/analyses\/compare\/:[a-zA-Z]+"/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. UMA regra canônica — e o legado perde o direito de decidir
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · 3. `comparacao.ts` é a única autoridade de comparação", () => {
  it("a autoridade declara a regra única e reclassifica o legado", () => {
    expect(BLUEPRINT).toContain("é a **ÚNICA** regra canônica de comparação A×B".replace(/\*\*/g, ""));
    expect(BLUEPRINT).toMatch(/n[ãa]o [ée] AS-IS de regra/);
    expect(BLUEPRINT).toMatch(/refer[êe]ncia visual\/estrutura legada/);
  });

  it("a regra canônica continua dizendo que o Front NÃO calcula variação", () => {
    // É o fato que torna proibido o delta local. Se `comparacao.ts` mudar de ideia, este caso
    // cai — e a proibição no PLAN precisa ser reexaminada em vez de virar dogma órfão.
    const c = ler(CANONICA);
    expect(c).toMatch(/Front n[ãa]o calcula varia[çc][ãa]o/);
    expect(c).toMatch(/`delta` é `null`/);
  });

  it("a quebra de comparabilidade é de DOCUMENTO, não por linha", () => {
    expect(ler(CANONICA)).toMatch(/A quebra é de DOCUMENTO/);
    expect(entradaM39()).toMatch(/quebra \*\*por linha\*\*/);
  });

  it("o legado ainda contradiz a canônica — e é por isso que ele não manda", () => {
    // Este caso NÃO exige que o legado seja corrigido: exige que a contradição siga visível
    // enquanto ele existir. Se a M39 o refatorar em presenter, o caso muda com a missão.
    if (!existsSync(resolve(RAIZ, LEGADO))) return;
    const l = semComentarios(ler(LEGADO));
    expect(l, "o legado deixou de contradizer — reveja a classificação").toContain("delta: number");
    expect(l, "o legado passou a importar a regra canônica — reveja a classificação").not.toContain("result/comparacao");
  });

  it("o PLAN proíbe delta calculado e segunda regra", () => {
    const fora = entradaM39().match(/\*\*Fora:\*\*[\s\S]*?(?=\n- \*\*)/)![0];
    expect(fora).toMatch(/delta calculado no\s+Front/);
    expect(fora).toMatch(/segunda regra de compara[çc][ãa]o/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Scenarios — o core, e o que segue bloqueado
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · 4. 20 e 21 bastam; 22 não é requisito", () => {
  it("os dois do core estão disponíveis e cobrem EVO-02", () => {
    for (const nome of ["comparison-compatible", "comparison-schema-break"]) {
      const s = scenario(nome);
      expect(s.estado, `${nome} deixou de estar disponível`).toBe("disponivel");
      expect(s.superficies).toContain("EVO-02");
    }
  });

  it("o 22 continua BLOQUEADO e fora do DoD", () => {
    expect(scenario("recommendation-persisted").estado).toBe("bloqueado");
    const fora = entradaM39().match(/\*\*Fora:\*\*[\s\S]*?(?=\n- \*\*)/)![0];
    expect(fora).toContain("scenario 22");
    expect(fora).toContain("BD03");
    expect(BLUEPRINT).toMatch(/não faz parte do\s*>?\s*DoD da M39/);
  });

  it("a M39 trouxe DOIS scenarios, e só eles — o catálogo foi de 35 a 37", () => {
    // Este caso dizia "a M39 não trouxe scenario novo", e era verdade enquanto EVO-02 lia o
    // documento legado. A materialização das massas v3 mudou o fato por DECISÃO: `20` e `21`
    // provam v1 e não a missão atual, e sem massa v3 a M39 não podia sair de NEEDS SCENARIOS.
    //
    // O que o caso continua protegendo é o mesmo: a missão não vira porta de entrada para massa
    // avulsa. Dois, nomeados, e nenhum a mais.
    //
    // A contagem GLOBAL (`CATALOGO.length === 37`) saiu daqui na M40. Ela era PROXY: qualquer
    // missão futura que acrescentasse scenario reprovaria este caso sem ter tocado na M39 — e foi
    // exatamente o que aconteceu quando a BD10 trouxe os três de baseline. O total tem dono
    // próprio em `scenarios-catalogo.test.ts`, conferido contra o Blueprint §11.
    //
    // O fato PRÓPRIO deste caso é o filtro por prefixo, e ele é mais forte que a contagem: um
    // `comparison-v3-` a mais reprova aqui mesmo que o total esteja certo.
    const daM39 = CATALOGO.filter((s) => s.id.startsWith("comparison-v3-")).map((s) => s.id);
    expect(daM39.sort()).toEqual(["comparison-v3-compatible", "comparison-v3-document-break"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. Fronteira com M40 e com a EVO-01
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · 5. Baseline e EVO-01 ficam onde estão", () => {
  it("Baseline, régua e EVO-03 estão no Fora — `anterior` não é atalho para M40", () => {
    const fora = entradaM39().match(/\*\*Fora:\*\*[\s\S]*?(?=\n- \*\*)/)![0];
    for (const termo of ["Baseline", "referência", "régua", "EVO-03", "M40"]) {
      expect(fora, `a M39 deixou de excluir ${termo}`).toContain(termo);
    }
  });

  it("nenhum scenario de baseline pertence à M39", () => {
    // Este caso dizia "os scenarios de baseline seguem bloqueados", e isso era PROXY: ele media o
    // estado do vizinho para provar um fato sobre a M39. A BD10 desbloqueou `no-baseline` e a M40
    // acrescentou dois — nada disso é da M39, e o caso reprovava mesmo assim.
    //
    // O fato próprio é a FRONTEIRA: baseline é INST-05, comparação é EVO-02, e a M39 não tocou
    // nenhum dos scenarios do vizinho.
    const deBaseline = CATALOGO.filter((s) => s.id.includes("baseline"));
    expect(deBaseline.length, "sumiram os scenarios de baseline").toBeGreaterThan(0);
    for (const s of deBaseline) {
      expect(s.superficies, `${s.id} virou scenario de comparação`).not.toContain("EVO-02");
      expect(s.superficies).toContain("INST-05");
    }
    // E a M39 continua sem nenhum: os dela têm prefixo próprio.
    expect(deBaseline.filter((s) => s.id.startsWith("comparison-"))).toEqual([]);
  });

  it("a M39 não transforma EVO-01 em EVO-02", () => {
    expect(entradaM39()).toMatch(/N[ãa]o transforma EVO-01 em\s+EVO-02/);
    // E `Toolbar` só entra com função real — a decisão da M38 continua valendo.
    expect(BLUEPRINT).toContain("Esta tabela mapeia patterns PREVISTOS, não estrutura física obrigatória");
  });

  it("a herança de cobertura browser tem dono e três invariantes nomeadas", () => {
    const e = entradaM39();
    expect(e).toMatch(/Heran[çc]a de cobertura, com dono/);
    expect(e).toMatch(/exatamente duas\*\* leituras/);
  });
});
