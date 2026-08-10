// M26 — RES-01: composição, atenção e indicadores.
//
// ## A regra que governa tudo aqui
//
// O Front só exibe como fato o que chega pelo contrato canônico. Behavior Score, Drift,
// Confidence, risk score e verdict são Métricas Core do PRODUTO e vivem no motor — **nenhum deles
// chega ao `analysis-result-v1/v2`**. A Landing os mostra com números de vitrine; Landing não é
// autoridade de resultado. Se o contrato não entrega, RES-01 não inventa.
//
// ## "O que merece atenção" é ordenação, não julgamento
//
// Blueprint §4.6 fixa a fonte: *"derivado do documento canônico (ordenação, sem recálculo)"*. Os
// motivos são declarados pela origem — `outOfRange` e `partially_measured` —, e ausência **não**
// entra: tratar "ninguém mediu" como algo a resolver é a falácia do zero-por-ausência com outra
// roupa.
//
// ## Procedência mora junto do dado
//
// `IndicatorCard` = "exibir valor + procedência" (Blueprint §componentes). Por indicador o
// contrato publica `denominator` e `coverage`, e mais nada — não há `source` nem
// `calculation_version` por indicador. Ausente vira a palavra do produto, nunca `0`.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import { ordenarPorAtencao } from "@/features/canonical-analysis/result/atencao";
import type { IndicatorView } from "@/features/canonical-analysis/result/indicadores";
import { SecaoDeAtencao } from "@/features/canonical-analysis/ui/analytics/SecaoDeAtencao";
import { CartaoIndicador } from "@/features/canonical-analysis/ui/analytics/SecoesDaEngine";
import { CATALOGO } from "@/mocks/scenarios/catalogo";

const RAIZ = resolve(__dirname, "../../..");
const BLUEPRINT = readFileSync(resolve(RAIZ, "docs/EXPERIENCE-BLUEPRINT-V1.md"), "utf-8");

const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

function ind(over: Partial<IndicatorView> = {}): IndicatorView {
  return {
    id: "useful_outcome_rate",
    descriptor: {
      labelKey: "canonicalAnalysis.result.indicator.useful_outcome_rate.label",
      descriptionKey: "canonicalAnalysis.result.indicator.useful_outcome_rate.description",
      sourceField: "useful_outcome_rate",
    },
    state: "measured",
    display: "80",
    unitSuffix: "%",
    rawValue: 0.8,
    denominator: null,
    coverage: null,
    coverageDisplay: null,
    outOfRange: false,
    ...over,
  } as IndicatorView;
}

/** Renderiza em pt-BR. O `LanguageProvider` cai em `en` por default, e asserir string PT sobre
 *  uma árvore EN reprova pelo motivo errado — foi assim que a 1ª versão deste arquivo falhou. */
const montar = (ui: React.ReactElement) => {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Os scenarios da missão, resolvidos pela AUTORIDADE
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M26 · 1. scenarios 16 e 30", () => {
  it("o Blueprint nomeia 16 = `final-ready` e 30 = `result-v1-legacy`", () => {
    // Resolvidos pela tabela §11, não pela posição assumida no catálogo.
    expect(BLUEPRINT).toMatch(/^\|\s*16\s*\|\s*`final-ready`\s*\|\s*RES-01\s*\|/m);
    expect(BLUEPRINT).toMatch(/^\|\s*30\s*\|\s*`result-v1-legacy`\s*\|\s*RES-01\s*\|/m);
  });

  it("os dois existem no catálogo, com o MESMO nome, e servem RES-01", () => {
    for (const nome of ["final-ready", "result-v1-legacy"]) {
      const s = CATALOGO.find((c) => c.id === nome);
      expect(s, `scenario ausente do catálogo: ${nome}`).toBeTruthy();
      expect(s!.superficies).toContain("RES-01");
      expect(s!.estado).toBe("disponivel");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Atenção — ordenação, sem recálculo
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M26 · 2. o que merece atenção", () => {
  it("só entra o que a ORIGEM assinalou; `measured` limpo fica fora", () => {
    const itens = ordenarPorAtencao([ind({ id: "a" }), ind({ id: "b", outOfRange: true })]);
    expect(itens.map((x) => x.item.id)).toEqual(["b"]);
    expect(itens[0].motivo).toBe("out_of_range");
  });

  it("AUSÊNCIA não é atenção — não medido/não aplicável/falhou ficam fora", () => {
    const itens = ordenarPorAtencao([
      ind({ id: "x", state: "not_measured", display: null }),
      ind({ id: "y", state: "not_applicable", display: null }),
      ind({ id: "z", state: "calculation_failed", display: null }),
    ]);
    // "ninguém mediu" não é "algo está errado".
    expect(itens).toEqual([]);
  });

  it("`out_of_range` precede `partially_measured`, e a ordem do documento é estável dentro do motivo", () => {
    const itens = ordenarPorAtencao([
      ind({ id: "p1", state: "partially_measured" }),
      ind({ id: "o1", outOfRange: true }),
      ind({ id: "p2", state: "partially_measured" }),
      ind({ id: "o2", outOfRange: true }),
    ]);
    expect(itens.map((x) => x.item.id)).toEqual(["o1", "o2", "p1", "p2"]);
  });

  it("NÃO recalcula: os objetos devolvidos são os MESMOS, e nenhum valor muda", () => {
    const a = ind({ id: "a", outOfRange: true });
    const [saida] = ordenarPorAtencao([a]);
    expect(saida.item).toBe(a); // identidade, não cópia
    expect(saida.item.rawValue).toBe(0.8);
    expect(saida.item.display).toBe("80");
  });

  it("o módulo de atenção não faz aritmética nem inventa nota", () => {
    const fonte = semComentarios(
      readFileSync(resolve(RAIZ, "src/features/canonical-analysis/result/atencao.ts"), "utf-8"),
    );
    for (const proibido of ["score", "Math.", "reduce(", "*", "/ ", "weight", "peso"]) {
      expect(fonte, `atenção passou a calcular: ${proibido}`).not.toContain(proibido);
    }
  });

  it("a seção existe mesmo sem itens — vazio é estado, não sumiço", () => {
    montar(<SecaoDeAtencao itens={[]} />);
    expect(screen.getByRole("heading", { name: pt.canonicalAnalysis.result.attentionTitle })).toBeTruthy();
    expect(screen.getByText(pt.canonicalAnalysis.result.attentionNone)).toBeTruthy();
  });

  it("o motivo é TEXTO, não cor — legível em escala de cinza e por leitor de tela", () => {
    const { container } = montar(
      <SecaoDeAtencao itens={ordenarPorAtencao([ind({ outOfRange: true })])} />,
    );
    expect(screen.getByText(pt.canonicalAnalysis.result.attentionMotivo.out_of_range)).toBeTruthy();
    // Nada de "destructive" como único portador da informação nesta seção.
    expect(container.querySelectorAll("[class*='destructive']").length).toBe(0);
  });

  it("a seção declara que a ordem é leitura, não ranking de gravidade", () => {
    montar(<SecaoDeAtencao itens={ordenarPorAtencao([ind({ outOfRange: true })])} />);
    expect(screen.getByText(pt.canonicalAnalysis.result.attentionOrderNote)).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Indicador — valor + procedência, e nada inventado
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M26 · 3. IndicatorCard", () => {
  it("procedência PUBLICADA aparece ancorada ao valor", () => {
    montar(
      <ul>
        <CartaoIndicador
          item={ind({ denominator: { kind: "conversations", value: 1240 }, coverageDisplay: "92%" })}
        />
      </ul>,
    );
    const grupo = screen.getByRole("group", {
      name: pt.canonicalAnalysis.result.indicator.useful_outcome_rate.label,
    });
    // Desktop e mobile carregam a MESMA informação — por isso `getAllBy`.
    expect(within(grupo).getAllByText("1240").length).toBeGreaterThan(0);
    expect(within(grupo).getAllByText("92%").length).toBeGreaterThan(0);
  });

  it("procedência AUSENTE vira a palavra do produto — nunca `0`, nunca traço", () => {
    const { container } = montar(
      <ul>
        <CartaoIndicador item={ind({ denominator: null, coverageDisplay: null })} />
      </ul>,
    );
    const grupo = screen.getByRole("group", {
      name: pt.canonicalAnalysis.result.indicator.useful_outcome_rate.label,
    });
    expect(within(grupo).getAllByText(pt.canonicalAnalysis.result.provenanceAbsent).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/Denominador:\s*0\b/);
  });

  it("o cartão NÃO inventa origem: sem `source`, sem `calculation_version`", () => {
    const fonte = semComentarios(
      readFileSync(
        resolve(RAIZ, "src/features/canonical-analysis/ui/analytics/SecoesDaEngine.tsx"),
        "utf-8",
      ),
    );
    for (const inventado of ["source", "calculation_version", "method_id", "privacy_policy_version"]) {
      expect(fonte, `procedência inventada: ${inventado}`).not.toContain(inventado);
    }
  });

  it("o rótulo aparece UMA vez — a margem o imprime, o corpo não repete", () => {
    montar(
      <ul>
        <CartaoIndicador item={ind()} />
      </ul>,
    );
    // Foi assim que a 1ª versão reprovou: "Found multiple elements".
    expect(
      screen.getAllByText(pt.canonicalAnalysis.result.indicator.useful_outcome_rate.label),
    ).toHaveLength(1);
  });

  it("ausência de VALOR não vira zero", () => {
    montar(
      <ul>
        <CartaoIndicador item={ind({ state: "not_measured", display: null, rawValue: null })} />
      </ul>,
    );
    expect(screen.getByText(pt.canonicalAnalysis.result.notMeasured)).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. O produto não inventa métrica
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M26 · 4. nada de Behavior Score, Drift ou Confidence", () => {
  const SUPERFICIE = [
    "src/features/canonical-analysis/ui/ResultPage.tsx",
    "src/features/canonical-analysis/ui/analytics/SecaoDeAtencao.tsx",
    "src/features/canonical-analysis/ui/analytics/SecoesDaEngine.tsx",
    "src/features/canonical-analysis/result/atencao.ts",
  ];
  // Sem `\b` no FIM: o controle positivo mostrou que `\bdrift\b` não casa em `driftScore` — e
  // `driftScore` é exatamente a forma que se quer barrar. A fronteira fica só na abertura, para
  // não capturar palavra que apenas termine assim.
  const INVENTADO =
    /\b(behaviou?r[_ ]?score|drift|confidence|risk[_ ]?score|verdict|ai[_ ]?score|health[_ ]?score)/i;

  it("as Métricas Core do motor NÃO aparecem em RES-01", () => {
    // Controle positivo: sem ele, um erro na regex tornaria o laço vácuo.
    expect(INVENTADO.test("const driftScore = 1")).toBe(true);
    expect(INVENTADO.test("const behaviorScore = 1")).toBe(true);
    expect(INVENTADO.test("const indicadores = []")).toBe(false);
    for (const f of SUPERFICIE) {
      const fonte = semComentarios(readFileSync(resolve(RAIZ, f), "utf-8"));
      expect(fonte, `${f} exibe métrica que o contrato não entrega`).not.toMatch(INVENTADO);
    }
  });

  it("a página não CALCULA indicador — nenhuma aritmética sobre valor", () => {
    const fonte = semComentarios(
      readFileSync(resolve(RAIZ, "src/features/canonical-analysis/ui/ResultPage.tsx"), "utf-8"),
    );
    for (const conta of ["rawValue", "toFixed(", "Math.", ".reduce(", "* 100", "/ 100"]) {
      expect(fonte, `a página passou a calcular: ${conta}`).not.toContain(conta);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. Fronteiras
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M26 · 5. o Design System não conhece domínio", () => {
  it("`ProvenanceMargin` recebe strings prontas, nunca o view model", () => {
    const fonte = readFileSync(resolve(RAIZ, "src/design/patterns/ProvenanceMargin.tsx"), "utf-8");
    for (const dominio of ["IndicatorView", "canonicalAnalysis", "useLanguage", "descriptor"]) {
      expect(fonte, `o DS passou a conhecer domínio: ${dominio}`).not.toContain(dominio);
    }
  });

  it("quem traduz é o PRODUTO — o rótulo desce resolvido", () => {
    const fonte = semComentarios(
      readFileSync(
        resolve(RAIZ, "src/features/canonical-analysis/ui/analytics/SecoesDaEngine.tsx"),
        "utf-8",
      ),
    );
    expect(fonte).toContain("rotuloDoIndicador(item, t)");
  });

  it("o produto não importa mock", () => {
    for (const f of [
      "src/features/canonical-analysis/ui/analytics/SecaoDeAtencao.tsx",
      "src/features/canonical-analysis/result/atencao.ts",
    ]) {
      const fonte = readFileSync(resolve(RAIZ, f), "utf-8");
      expect(fonte).not.toMatch(/@\/mocks|msw/);
    }
  });
});
