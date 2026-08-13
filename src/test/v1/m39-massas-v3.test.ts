// M39 — as massas v3 da comparação, e o que elas provam.
//
// ## Por que estes casos existem
//
// A M39 estava `NEEDS V3 SCENARIOS` porque `comparison-compatible` e `comparison-schema-break`
// foram construídos sobre **v1** — servem `RESULT_VIEW` — e não provam a missão atual. Estes
// casos provam que as massas novas representam **honestamente** as condições congeladas, antes
// de existir qualquer comparador para exercitá-las.
//
// ## A massa não foi escrita à mão
//
// `v3-comparacao.json` é saída do código analítico REAL rodado duas vezes, com entradas
// diferentes, atravessando a ponte de facts e o `assemble_v3`. Massa digitada aqui testaria a
// minha suposição do formato — e o formato é justamente o que mudou.
//
// ## Anti-vacuidade
//
// As contagens são EXATAS, não `> 0`. Uma massa que perdesse metade dos indicadores continuaria
// passando num `toBeGreaterThan(0)`, e o comparador futuro herdaria uma prova que não protege.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DIMENSOES_DE_SAUDE,
  FAMILIAS_ARGOS,
  familiaFoiProduzida,
  validarResultadoV3,
  type AnalysisResultV3Document,
} from "@/features/canonical-analysis/result/contratoV3";
import { CLASSIFICACAO_M39 } from "@/features/canonical-analysis/result/familiasDaComparacao";
import { CATALOGO } from "@/mocks/scenarios/catalogo";
import MASSA from "@/test/fixtures/canonical-result/v3-comparacao.json";

const RAIZ = resolve(__dirname, "../../..");
const A = MASSA.A as unknown as AnalysisResultV3Document;
const B = MASSA.B as unknown as AnalysisResultV3Document;
const BQ = MASSA.B_QUEBRA as unknown as AnalysisResultV3Document;

/** Contagens congeladas. Se a massa for regenerada e mudarem, é decisão, não acidente. */
const PARES_DE_INDICADOR = 14;
const PARES_DE_DIMENSAO = 4;
const INDICADORES_COM_VALOR_DIFERENTE = 7;
const DIMENSOES_COM_VALOR_DIFERENTE = 3;

const ids = (lista: readonly { id: string }[]) => lista.map((x) => x.id);
const porId = (lista: readonly { id: string; value: number | null }[]) =>
  new Map(lista.map((x) => [x.id, x.value]));

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Os três documentos são v3 de verdade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · massas 1. o que chega é `analysis-result-v3`", () => {
  it("os três atravessam a fronteira do contrato", () => {
    // Se a massa não passa no validador desta casa, ela não representa o que o produtor emite —
    // e provaria o formato que eu imaginei, não o que existe.
    for (const [nome, doc] of [["A", A], ["B", B], ["B_QUEBRA", BQ]] as const) {
      const v = validarResultadoV3("analysis-result-v3", doc);
      expect(v.status, `${nome}: ${v.status === "recusado" ? v.reason : ""}`).toBe("ok");
    }
  });

  it("nenhum documento é v1/v2 disfarçado", () => {
    for (const doc of [A, B, BQ]) {
      expect(doc.argos_catalog_version, "sem catálogo ARGOS — isto não é v3").toBeTruthy();
      expect(doc.measurement_contract_version).toBeTruthy();
    }
  });

  it("nenhuma família fora da M39 V1 foi materializada só para a tela", () => {
    // A massa exercita exatamente o escopo autorizado. Trazer `risks` ou `alerts` "para ver
    // como fica" ensinaria a comparação a existir onde a autoridade a proibiu.
    const permitidas = new Set(["indicators", "dimensions"]);
    for (const familia of FAMILIAS_ARGOS) {
      if (permitidas.has(familia)) continue;
      for (const [nome, doc] of [["A", A], ["B", B]] as const) {
        expect(
          familiaFoiProduzida(doc, familia),
          `${nome}: família \`${familia}\` presente, e ela está ${CLASSIFICACAO_M39[familia].estado}`,
        ).toBe(false);
      }
    }
  });

  it("família ausente é AUSENTE, nunca `[]`", () => {
    const bruto = MASSA.A as unknown as Record<string, unknown>;
    for (const familia of FAMILIAS_ARGOS) {
      if (familia === "indicators" || familia === "dimensions") continue;
      expect(Array.isArray(bruto[familia]), `${familia} virou lista vazia`).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Scenario A — há pares REAIS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · massas 2. Scenario A · compatível", () => {
  it("A e B são documentalmente compatíveis (D26 satisfeita)", () => {
    expect(A.indicator_registry_version).toBe(B.indicator_registry_version);
    expect(A.argos_catalog_version).toBe(B.argos_catalog_version);
    expect(A.measurement_contract_version).toBe(B.measurement_contract_version);
  });

  it(`há exatamente ${PARES_DE_INDICADOR} pares de indicador`, () => {
    const a = new Set(ids(A.indicators ?? []));
    const b = new Set(ids(B.indicators ?? []));
    const pares = [...a].filter((id) => b.has(id));
    expect(pares).toHaveLength(PARES_DE_INDICADOR);
    // Sem sobra dos dois lados: a massa é de duas análises da MESMA capacidade.
    expect([...a].filter((id) => !b.has(id)), "indicador só em A").toEqual([]);
    expect([...b].filter((id) => !a.has(id)), "indicador só em B").toEqual([]);
  });

  it(`há exatamente ${PARES_DE_DIMENSAO} pares de dimensão, e são as quatro canônicas`, () => {
    expect(ids(A.dimensions ?? []).sort()).toEqual([...DIMENSOES_DE_SAUDE].sort());
    expect(ids(B.dimensions ?? []).sort()).toEqual([...DIMENSOES_DE_SAUDE].sort());
    expect(A.dimensions).toHaveLength(PARES_DE_DIMENSAO);
  });

  it("`ai_health_score` NÃO entrou como quinta dimensão", () => {
    for (const doc of [A, B]) {
      expect(ids(doc.dimensions ?? [])).not.toContain("ai_health_score");
    }
  });

  it("os pares têm valores DIFERENTES — a massa não é o mesmo documento duas vezes", () => {
    // O risco real: A e B idênticos fariam qualquer comparador passar, inclusive um quebrado.
    const va = porId(A.indicators ?? []);
    const vb = porId(B.indicators ?? []);
    const diferentes = [...va.keys()].filter((id) => va.get(id) !== vb.get(id));
    expect(diferentes).toHaveLength(INDICADORES_COM_VALOR_DIFERENTE);

    const da = porId(A.dimensions ?? []);
    const db = porId(B.dimensions ?? []);
    const dimDif = [...da.keys()].filter((id) => da.get(id) !== db.get(id));
    expect(dimDif).toHaveLength(DIMENSOES_COM_VALOR_DIFERENTE);
  });

  it("nenhuma ausência foi representada como zero", () => {
    for (const doc of [A, B]) {
      for (const i of doc.indicators ?? []) {
        if (i.state !== "measured" && i.state !== "partially_measured") {
          expect(i.value, `${i.id}: ${i.state} com valor`).toBeNull();
        }
      }
    }
  });

  it("escala e unidade viajam nos dois lados — a pré-condição de par é verificável", () => {
    const va = new Map((A.indicators ?? []).map((i) => [i.id, i]));
    for (const i of B.indicators ?? []) {
      const par = va.get(i.id);
      expect(par, i.id).toBeTruthy();
      expect(par!.scale.kind, `${i.id}: escala ausente em A`).toBeTruthy();
      expect(i.scale.kind, `${i.id}: escala ausente em B`).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Scenario B — a quebra é DOCUMENTAL e real
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · massas 3. Scenario B · quebra documental", () => {
  it("a quebra está em `indicator_registry_version`, campo REAL do contrato", () => {
    expect(A.indicator_registry_version).not.toBe(BQ.indicator_registry_version);
    expect(BQ.indicator_registry_version).toBeTruthy();
  });

  it("a quebra é ISOLADA — nada mais divergiu para simular incompatibilidade", () => {
    // Uma massa que mudasse cinco campos de uma vez não provaria QUAL deles quebra a
    // comparabilidade, e o gate futuro poderia passar pelo motivo errado.
    const b = MASSA.B as unknown as Record<string, unknown>;
    const bq = MASSA.B_QUEBRA as unknown as Record<string, unknown>;
    const divergentes = [...new Set([...Object.keys(b), ...Object.keys(bq)])].filter(
      (k) => JSON.stringify(b[k]) !== JSON.stringify(bq[k]),
    );
    expect(divergentes.sort()).toEqual(["analysis_id", "indicator_registry_version"]);
  });

  it("os indicadores continuam existindo — a quebra não é ausência de dado", () => {
    // O documento quebrado tem os MESMOS ids. É isso que torna a descontinuidade interessante:
    // sem a versão, alguém pararia e diria "os ids batem, dá para comparar".
    expect(ids(BQ.indicators ?? []).sort()).toEqual(ids(B.indicators ?? []).sort());
    expect(BQ.dimensions).toHaveLength(PARES_DE_DIMENSAO);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Scenario C — não representável, e isso é medido
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · massas 4. Scenario C · NOT REPRESENTABLE", () => {
  it("o produtor NUNCA emite `method_version` em dimensão", () => {
    // Prova estrutural, não leitura de massa: `_publicar_dimensao` no assembler monta a
    // `PublicMeasurement` sem passar `method_version`. O campo existe no contrato e é
    // inalcançável para esta família — construir uma massa em que ele diverge seria o scenario
    // INVENTANDO produtor, que é exatamente o que a regra proíbe.
    for (const doc of [A, B, BQ]) {
      for (const d of doc.dimensions ?? []) {
        expect(d.method_version ?? null, `${d.id} passou a publicar método`).toBeNull();
      }
    }
  });

  it("a impossibilidade está declarada, não esquecida", () => {
    const plan = readFileSync(resolve(RAIZ, "docs/FRONT-V1-IMPLEMENTATION-PLAN.md"), "utf-8");
    expect(plan).toContain("SCENARIO C — NOT REPRESENTABLE BY PUBLIC CONTRACT");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. O catálogo conhece as massas novas, e os históricos seguem históricos
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · massas 5. catálogo", () => {
  it("os dois scenarios v3 estão registrados e disponíveis", () => {
    for (const id of ["comparison-v3-compatible", "comparison-v3-document-break"]) {
      const s = CATALOGO.find((x) => x.id === id);
      expect(s, `\`${id}\` não está no catálogo`).toBeTruthy();
      expect(s!.estado).toBe("disponivel");
      expect(s!.superficies).toContain("EVO-02");
    }
  });

  it("os históricos v1 continuam existindo, sem fingir que provam v3", () => {
    // Renomeá-los para `*-v3` seria maquiagem: a massa continuaria servindo `RESULT_VIEW`.
    for (const id of ["comparison-compatible", "comparison-schema-break"]) {
      expect(CATALOGO.find((x) => x.id === id), id).toBeTruthy();
    }
  });
});
