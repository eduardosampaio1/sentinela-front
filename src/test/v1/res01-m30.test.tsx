// M30 — RES-01: comparação com a anterior.
//
// ## O DoD é uma proibição
//
// *"a quebra **nunca** vira aumento ou queda."* D26: mudou `indicator_registry_version`, os
// valores **deixam de ser a mesma série**. Não há delta, não há seta, não há melhora nem piora —
// há dois números verdadeiros em segmentos diferentes.
//
// A quebra é de DOCUMENTO, não de linha: `useful_outcome_rate` no registro 1.0 e no 2.0 podem ser
// fórmulas diferentes com a mesma etiqueta, e é justamente esse o caso que um delta esconderia.
//
// ## Delta não é Drift
//
// Um valor mudou entre duas análises não é o Sentinela ter detectado Drift. Drift é do motor, tem
// definição própria e não chega ao documento público.
//
// ## Nada é calculado
//
// `ComparisonRow` declara na assinatura: *"Texto pronto… O Front não calcula variação."* Nada no
// `analysis-result-v1/v2` publica delta entre duas análises, então ele é `null`.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import { compararComAnterior } from "@/features/canonical-analysis/result/comparacao";
import type { IndicatorView } from "@/features/canonical-analysis/result/indicadores";
import { ComparacaoComAnterior } from "@/features/canonical-analysis/ui/analytics/ComparacaoComAnterior";
import { CATALOGO } from "@/mocks/scenarios/catalogo";

const RAIZ = resolve(__dirname, "../../..");
const BLUEPRINT = readFileSync(resolve(RAIZ, "docs/EXPERIENCE-BLUEPRINT-V1.md"), "utf-8");
const MODELO = resolve(RAIZ, "src/features/canonical-analysis/result/comparacao.ts");
const REGIAO = resolve(
  RAIZ,
  "src/features/canonical-analysis/ui/analytics/ComparacaoComAnterior.tsx",
);

const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const R = pt.canonicalAnalysis.result;

function ind(id: string, display: string | null): IndicatorView {
  return {
    id,
    descriptor: {
      labelKey: `canonicalAnalysis.result.indicator.${id}.label`,
      descriptionKey: `canonicalAnalysis.result.indicator.${id}.description`,
      sourceField: id,
    },
    state: "measured",
    display,
    unitSuffix: null,
    rawValue: null,
    denominator: null,
    coverage: null,
    coverageDisplay: null,
    outOfRange: false,
  } as IndicatorView;
}

const doc = (v: string, inds: IndicatorView[]) => ({
  indicators: inds,
  indicatorRegistryVersion: v,
});

const montar = (comparacao: Parameters<typeof ComparacaoComAnterior>[0]["comparacao"]) => {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <LanguageProvider>
      <ComparacaoComAnterior comparacao={comparacao} />
    </LanguageProvider>,
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Scenarios 20 e 21
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M30 · 1. scenarios", () => {
  it("o Blueprint nomeia 20 = `comparison-compatible` e 21 = `comparison-schema-break`", () => {
    expect(BLUEPRINT).toMatch(/^\|\s*20\s*\|\s*`comparison-compatible`\s*\|/m);
    expect(BLUEPRINT).toMatch(/^\|\s*21\s*\|\s*`comparison-schema-break`\s*\|/m);
  });

  it("os dois existem no catálogo com o MESMO nome", () => {
    for (const nome of ["comparison-compatible", "comparison-schema-break"]) {
      expect(CATALOGO.find((c) => c.id === nome), `ausente: ${nome}`).toBeTruthy();
    }
  });

  it("DIVERGÊNCIA DECLARADA: o Blueprint marca os dois como EVO-02, o PLAN põe a M30 em RES-01", () => {
    // Nomes e números batem; a SUPERFÍCIE anotada não. O Blueprint §4.6 declara a região
    // "Comparação com anterior" de RES-01 como REAL (duas leituras de `/result` + `indicator.id`),
    // e é esse o mecanismo que os dois scenarios exercitam — então a M30 os usa. Registrado aqui
    // para que a anotação não seja "corrigida" em silêncio numa próxima leitura.
    for (const nome of ["comparison-compatible", "comparison-schema-break"]) {
      expect(CATALOGO.find((c) => c.id === nome)!.superficies).toEqual(["EVO-02"]);
    }
    expect(BLUEPRINT).toContain("| **Comparação com anterior** | duas leituras de `/result`");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Comparabilidade é pré-condição
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M30 · 2. a quebra nunca vira aumento ou queda", () => {
  it("registros iguais: as linhas são comparáveis", () => {
    const c = compararComAnterior(doc("r-1", [ind("a", "80%")]), doc("r-1", [ind("a", "70%")]));
    expect(c!.comparavel).toBe(true);
    expect(c!.linhas[0]).toMatchObject({ antes: "70%", depois: "80%", comparavel: true });
  });

  it("registros DIFERENTES: nenhuma linha é comparável — a quebra é do documento", () => {
    const c = compararComAnterior(
      doc("r-2", [ind("a", "80%"), ind("b", "1")]),
      doc("r-1", [ind("a", "70%"), ind("b", "2")]),
    );
    expect(c!.comparavel).toBe(false);
    // O MESMO `id` dos dois lados não salva: no registro novo ele pode ser outra fórmula.
    expect(c!.linhas.every((l) => l.comparavel === false)).toBe(true);
  });

  it("o modelo NÃO calcula variação — nenhuma aritmética", () => {
    // Duas versões anteriores erraram AQUI, não no código: a 1ª proibia o caractere `/` e
    // reprovava no import `"./indicadores"`; a 2ª montou a regex por script e o `` do Python
    // virou backspace literal, que o lint acusou como control character. Checagem simples é o
    // que este caso precisa — o modelo não deve conter operação aritmética nenhuma.
    const fonte = semComentarios(readFileSync(MODELO, "utf-8"));
    for (const conta of ["Math.", "toFixed(", "delta =", "percent", " - ", " * ", " / "]) {
      expect(fonte, `variação calculada no Front: ${conta}`).not.toContain(conta);
    }
  });

  it("a região passa `delta={null}` — nada publica variação entre duas análises", () => {
    const fonte = semComentarios(readFileSync(REGIAO, "utf-8"));
    expect(fonte).toContain("delta={null}");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Identidade canônica
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M30 · 3. pareamento por `indicator.id`", () => {
  it("casa por id, não por posição", () => {
    const c = compararComAnterior(
      doc("r-1", [ind("a", "1"), ind("b", "2")]),
      doc("r-1", [ind("b", "20"), ind("a", "10")]), // ordem invertida
    );
    expect(c!.linhas.find((l) => l.id === "a")).toMatchObject({ antes: "10", depois: "1" });
    expect(c!.linhas.find((l) => l.id === "b")).toMatchObject({ antes: "20", depois: "2" });
  });

  it("o modelo não olha rótulo, descrição nem tradução", () => {
    // A 1ª versão proibia a substring `t(` — que casa dentro de `Map(`, `get(` e `delete(`, e o
    // modelo usa os três. Substring não é análise. O que interessa é o modelo não TOCAR em campo
    // de texto: `labelKey`/`descriptionKey` são o que um pareamento por rótulo leria.
    const fonte = semComentarios(readFileSync(MODELO, "utf-8"));
    for (const porTexto of ["labelKey", "descriptionKey", ".label", "traduz"]) {
      expect(fonte, `pareamento por texto: ${porTexto}`).not.toContain(porTexto);
    }
    // E casa por `id`, explicitamente.
    expect(fonte).toContain("porId");
  });

  it("só num lado: o outro é AUSÊNCIA, nunca zero", () => {
    const c = compararComAnterior(doc("r-1", [ind("novo", "5")]), doc("r-1", [ind("velho", "9")]));
    expect(c!.linhas.find((l) => l.id === "novo")).toMatchObject({ antes: null, depois: "5" });
    // O que sumiu continua visível: omiti-lo faria a análise parecer ter os mesmos indicadores.
    expect(c!.linhas.find((l) => l.id === "velho")).toMatchObject({ antes: "9", depois: null });
  });

  it("sem anterior: não há comparação, e isso é dito", () => {
    expect(compararComAnterior(doc("r-1", [ind("a", "1")]), null)).toBeNull();
    montar(null);
    expect(screen.getByText(R.compareNone)).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Delta ≠ Drift
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M30 · 4. vocabulário", () => {
  const PROIBIDO = /\b(drift|tend[eê]ncia|estabilidade|degrada[cç][aã]o|melhora|piora|trend)\b/i;

  it("nem o modelo nem a região usam vocabulário que o contrato não publica", () => {
    // Controle positivo: sem ele um erro na regex tornaria o laço vácuo.
    expect(PROIBIDO.test("houve drift")).toBe(true);
    for (const f of [MODELO, REGIAO]) {
      expect(semComentarios(readFileSync(f, "utf-8")), f).not.toMatch(PROIBIDO);
    }
  });

  it("as frases da comparação também não", () => {
    for (const frase of [R.compareTitle, R.compareBroken, R.compareNone, R.compareBase]) {
      expect(frase).not.toMatch(PROIBIDO);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. A ruptura é impossível de confundir com delta
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M30 · 5. dois canais, nenhum deles cor", () => {
  const COMPARAVEL = { comparavel: true, linhas: [{ id: "a", descriptor: ind("a", "1").descriptor, antes: "70%", depois: "80%", comparavel: true }] };
  const QUEBRADO = { comparavel: false, linhas: [{ id: "a", descriptor: ind("a", "1").descriptor, antes: "70%", depois: "80%", comparavel: false }] };

  it("quebrado: o motivo é ESCRITO — no cabeçalho E na própria linha", () => {
    // `length > 0` deixou DUAS mutações vivas: uma que trocava a linha quebrada pela comparável
    // (o cabeçalho sozinho ainda casava) e outra que apagava o cabeçalho (a linha sozinha ainda
    // casava). É a terceira vez nesta série que "pelo menos um" passa por metade do defeito.
    // Dois canais, dois lugares, contagem exata.
    montar(QUEBRADO);
    // Cabeçalho com a explicação completa, linha com a versão curta: dois lugares, dois textos.
    expect(screen.getAllByText(R.compareBroken)).toHaveLength(1);
    expect(screen.getAllByText(R.compareBrokenShort)).toHaveLength(1);
  });

  it("comparável NÃO exibe o aviso de quebra", () => {
    montar(COMPARAVEL);
    expect(screen.queryByText(R.compareBroken)).toBeNull();
  });

  it("os dois valores continuam visíveis nos DOIS casos — cada um é verdadeiro no seu segmento", () => {
    const { unmount } = montar(QUEBRADO);
    expect(screen.getByText("70%")).toBeTruthy();
    expect(screen.getByText("80%")).toBeTruthy();
    unmount();
    montar(COMPARAVEL);
    expect(screen.getByText("70%")).toBeTruthy();
  });

  it("nenhuma classe destrutiva/de sucesso carrega a informação", () => {
    for (const c of [COMPARAVEL, QUEBRADO]) {
      const { container, unmount } = montar(c);
      expect(container.querySelectorAll("[class*='destructive'],[class*='success']").length).toBe(0);
      unmount();
    }
  });

  it("reusa o pattern da M13 — nenhuma segunda semântica de comparação", () => {
    const fonte = semComentarios(readFileSync(REGIAO, "utf-8"));
    expect(fonte).toContain("ComparisonRow");
    expect(fonte).toContain("ComparisonRowQuebrada");
    // Sem card: a comparação é LINHA.
    expect(fonte).not.toContain("bg-card");
  });

  it("sem motion — os dois valores coexistem, não há transição a preservar", () => {
    const fonte = semComentarios(readFileSync(REGIAO, "utf-8"));
    for (const m of ["transition", "animate-", "duration-"]) {
      expect(fonte, `motion decorativo: ${m}`).not.toContain(m);
    }
  });
});
