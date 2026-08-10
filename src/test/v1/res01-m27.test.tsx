// M27 — RES-01: analytics, partial/withheld e disponibilidade progressiva.
//
// ## Cinco estados, cinco leituras
//
// `ready`, `partial`, `withheld`, `failed` e `unknown` não são sinônimos, e nenhum deles é o
// outro com outra cor. `partial` é informação incompleta — o que falta **não foi medido**, e não é
// zero. `withheld` é conclusão de privacidade, não falha. `failed` é falha do componente.
// `unknown` é não-saber, e a tela não afirma nada.
//
// ## Disponibilidade progressiva
//
// O documento `analysis-result-v2` só nasce depois da barreira; `GET /analytics` responde antes.
// Até a M27 a página inteira ficava atrás de `result_available`, e um analytics PRONTO ficava
// escondido atrás de um documento inexistente. Um componente indisponível não pode bloquear outro
// disponível.
//
// ## O que a região não faz
//
// Não agrega, não recalcula média nem percentual, não ordena por relevância, não transforma digest
// ou versão em nota, e não infere qualidade. `min_group_size`, `top_k` e `max_tracked_*` vivem
// DENTRO das projeções aninhadas (BD08) e pertencem a cada bloco — trazê-los para a margem da
// região afirmaria que valem para a projeção inteira.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import type { AnalysisAnalyticsView } from "@/lib/v1";
import { CATALOGO } from "@/mocks/scenarios/catalogo";

const RAIZ = resolve(__dirname, "../../..");
const BLUEPRINT = readFileSync(resolve(RAIZ, "docs/EXPERIENCE-BLUEPRINT-V1.md"), "utf-8");
const REGIAO_TSX = resolve(
  RAIZ,
  "src/features/canonical-analysis/ui/analytics/RegiaoDeAnalyticsAoVivo.tsx",
);
const PAGINA_TSX = resolve(RAIZ, "src/features/canonical-analysis/ui/ResultPage.tsx");

const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const { RegiaoDeAnalyticsAoVivo } = await import(
  "@/features/canonical-analysis/ui/analytics/RegiaoDeAnalyticsAoVivo"
);

function vista(over: Partial<AnalysisAnalyticsView> = {}): AnalysisAnalyticsView {
  return {
    analysis_id: "an-abc",
    component_status: "ready",
    snapshot_contract_version: "analytics-snapshot-v9",
    snapshot_digest: "d1",
    snapshot: null,
    disclosure_rule_version: "dr-1",
    projection_digest: "p1",
    withheld: null,
    generated_at: "2026-07-31T10:00:00Z",
    ...over,
  };
}

const montar = (ui: React.ReactElement) => {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

const A = pt.canonicalAnalysis.result.analytics;

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Scenarios 11, 12 e 23 pela AUTORIDADE
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M27 · 1. scenarios", () => {
  it("o Blueprint nomeia 11/12/23 e todos apontam para `/analytics` em RES-01", () => {
    expect(BLUEPRINT).toMatch(/^\|\s*11\s*\|\s*`analytics-partial`\s*\|\s*RES-01\s*\|\s*`\/analytics`/m);
    expect(BLUEPRINT).toMatch(/^\|\s*12\s*\|\s*`analytics-withheld`\s*\|\s*RES-01\s*\|\s*`\/analytics`/m);
    expect(BLUEPRINT).toMatch(/^\|\s*23\s*\|\s*`privacy-omission`\s*\|\s*RES-01\s*\|\s*`\/analytics`/m);
  });

  it("os três existem no catálogo com o MESMO nome e servem RES-01", () => {
    for (const nome of ["analytics-partial", "analytics-withheld", "privacy-omission"]) {
      const s = CATALOGO.find((c) => c.id === nome);
      expect(s, `scenario ausente: ${nome}`).toBeTruthy();
      expect(s!.superficies).toContain("RES-01");
      expect(s!.estado).toBe("disponivel");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Os cinco estados não colapsam
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M27 · 2. partial ≠ withheld ≠ failed ≠ unknown ≠ ready", () => {
  it("as cinco frases são distintas entre si", () => {
    const frases = [A.state.ready, A.state.partial, A.state.failed, A.state.unknown, A.withheldTitle];
    expect(new Set(frases).size).toBe(5);
  });

  it("`partial` diz que falta — e que o que falta NÃO é zero", () => {
    montar(<RegiaoDeAnalyticsAoVivo vista={vista({ component_status: "partial" })} />);
    expect(screen.getByText(A.state.partial)).toBeTruthy();
    expect(screen.queryByText(A.state.failed)).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("`withheld` NÃO é falha: usa o componente de retenção, sem `role=alert`", () => {
    const { container } = montar(
      <RegiaoDeAnalyticsAoVivo
        vista={vista({ component_status: "withheld", snapshot: null, withheld: { reason_code: "min_group_size" } })}
      />,
    );
    expect(screen.getByText(A.withheldTitle)).toBeTruthy();
    expect(screen.queryByText(A.state.failed)).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("`withheld` NÃO revela nem o dado suprimido nem a razão interna", () => {
    const { container } = montar(
      <RegiaoDeAnalyticsAoVivo
        vista={vista({
          component_status: "withheld",
          snapshot: null,
          withheld: { reason_code: "min_group_size", min_group_size: 5, populacao_suprimida: 3 },
        })}
      />,
    );
    const texto = container.textContent ?? "";
    // Nomear a regra ou o tamanho descreveria a população que a retenção existe para proteger.
    expect(texto).not.toContain("min_group_size");
    expect(texto).not.toContain("populacao_suprimida");
    expect(texto).not.toMatch(/\b3\b/);
  });

  it("`failed` é falha do COMPONENTE, e diz que o resto da página não é afetado", () => {
    montar(<RegiaoDeAnalyticsAoVivo vista={vista({ component_status: "failed" })} />);
    expect(screen.getByText(A.state.failed)).toBeTruthy();
    expect(screen.queryByText(A.state.partial)).toBeNull();
  });

  it("`unknown` não afirma nada — e não vira `failed`", () => {
    montar(<RegiaoDeAnalyticsAoVivo vista={vista({ component_status: "unknown" })} />);
    expect(screen.getByText(A.state.unknown)).toBeTruthy();
    expect(screen.queryByText(A.state.failed)).toBeNull();
  });

  it("o estado é TEXTO — nenhuma classe destrutiva carrega a informação", () => {
    for (const st of ["partial", "failed", "unknown"] as const) {
      const { container, unmount } = montar(
        <RegiaoDeAnalyticsAoVivo vista={vista({ component_status: st })} />,
      );
      expect(container.querySelectorAll("[class*='destructive']").length, st).toBe(0);
      unmount();
    }
  });

  it("snapshot ausente/ilegível é DECLARADO, nunca preenchido", () => {
    montar(<RegiaoDeAnalyticsAoVivo vista={vista({ component_status: "ready", snapshot: null })} />);
    expect(screen.getByText(A.noReadable)).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Procedência da projeção
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M27 · 3. trust/provenance", () => {
  it("os campos PUBLICADOS do read model aparecem na margem", () => {
    montar(<RegiaoDeAnalyticsAoVivo vista={vista()} />);
    const grupo = screen.getByRole("group", { name: A.stateGroup });
    for (const valor of ["analytics-snapshot-v9", "dr-1", "p1"]) {
      expect(within(grupo).getAllByText(valor).length, valor).toBeGreaterThan(0);
    }
  });

  it("campo publicado como `null` vira a palavra do produto, nunca zero", () => {
    // A 1ª versão só exigia "pelo menos um `não informado`" — e sobreviveu à mutação que trocava
    // UM dos dois nulos por `"0"`, porque o outro ainda produzia a palavra. Assertiva fraca passa
    // por metade do defeito. Agora o zero é proibido dentro do grupo, e a contagem é exata.
    montar(
      <RegiaoDeAnalyticsAoVivo
        vista={vista({ disclosure_rule_version: null, projection_digest: null })}
      />,
    );
    const grupo = screen.getByRole("group", { name: A.stateGroup });
    const ausente = pt.canonicalAnalysis.result.provenanceAbsent;
    // Dois campos nulos → duas ocorrências. Escrevi 4 supondo que o disclosure mobile também
    // renderizasse; ele monta o conteúdo só quando aberto, e o número real é 2.
    expect(within(grupo).getAllByText(ausente)).toHaveLength(2);
    expect(within(grupo).queryByText("0"), "ausência renderizada como zero").toBeNull();
  });

  it("parâmetros de bloco NÃO sobem para a margem da região", () => {
    // `min_group_size`, `top_k` e `max_tracked_*` são de cada projeção aninhada (BD08). Na
    // margem da região eles afirmariam valer para a projeção inteira.
    const fonte = semComentarios(readFileSync(REGIAO_TSX, "utf-8"));
    for (const p of ["min_group_size", "top_k", "max_tracked", "privacy_policy_version"]) {
      expect(fonte, `parâmetro de bloco na margem da região: ${p}`).not.toContain(p);
    }
  });

  it("não há segunda linguagem visual de procedência — reusa `ProvenanceMargin`", () => {
    const fonte = readFileSync(REGIAO_TSX, "utf-8");
    expect(fonte).toContain("ProvenanceMargin");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Disponibilidade progressiva
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M27 · 4. um componente não bloqueia o outro", () => {
  it("a página lê `/analytics` SEM depender de `result_available`", () => {
    const fonte = semComentarios(readFileSync(PAGINA_TSX, "utf-8"));
    // O hook do resultado é gated por `pronto`; o de analytics NÃO pode ser.
    expect(fonte).toContain("useAnalysisResult(scope, analysisId, pronto)");
    expect(fonte).toContain("useAnalysisAnalytics(scope, analysisId)");
    expect(fonte, "analytics ficou atrás do documento").not.toContain(
      "useAnalysisAnalytics(scope, analysisId, pronto)",
    );
  });

  it("com o documento ausente, a região analítica AINDA é renderizada", () => {
    const fonte = semComentarios(readFileSync(PAGINA_TSX, "utf-8"));
    const ramo = fonte.slice(fonte.indexOf("if (status.data && !pronto)"));
    const corpo = ramo.slice(0, ramo.indexOf("if (resultado.isError)"));
    expect(corpo, "o ramo de documento ausente voltou a esconder o analytics").toContain(
      "RegiaoDeAnalyticsAoVivo",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. Nenhum cálculo analítico novo
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M27 · 5. o navegador não calcula analytics", () => {
  it("a região não agrega, não recalcula e não ordena por relevância", () => {
    const fonte = semComentarios(readFileSync(REGIAO_TSX, "utf-8"));
    // Controle positivo: sem ele um erro de digitação tornaria o laço vácuo.
    expect(/\.reduce\(/.test("xs.reduce((a,b)=>a+b)")).toBe(true);
    for (const conta of [".reduce(", ".sort(", "Math.", "* 100", "/ 100", "toFixed("]) {
      expect(fonte, `cálculo analítico novo no Front: ${conta}`).not.toContain(conta);
    }
  });

  it("digest e versão NÃO viram nota", () => {
    const fonte = semComentarios(readFileSync(REGIAO_TSX, "utf-8"));
    expect(fonte).not.toMatch(/\b(score|nota|quality|qualidade)\b/i);
  });

  it("nenhuma biblioteca de gráfico entrou para 'usar depois'", () => {
    const pkg = JSON.parse(readFileSync(resolve(RAIZ, "package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkg.dependencies ?? {});
    const fonte = readFileSync(REGIAO_TSX, "utf-8");
    for (const lib of ["recharts", "d3", "chart.js", "victory"]) {
      if (deps.includes(lib)) {
        expect(fonte, `${lib} sem consumidor real nesta região`).not.toContain(lib);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. M26 não regride
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M27 · 6. o que a M26 entregou continua de pé", () => {
  it("a composição preserva atenção, indicadores e recomendações, nessa ordem", () => {
    const fonte = semComentarios(readFileSync(PAGINA_TSX, "utf-8"));
    const i = (s: string) => fonte.indexOf(s);
    expect(i("<SecaoDeAtencao")).toBeGreaterThan(-1);
    expect(i("<SecaoDeIndicadores")).toBeGreaterThan(i("<SecaoDeAtencao"));
    expect(i("<SecaoDeRecomendacoes")).toBeGreaterThan(i("<SecaoDeIndicadores"));
  });

  it("o bloco analítico do v2 continua sendo quem manda quando o documento existe", () => {
    const fonte = semComentarios(readFileSync(PAGINA_TSX, "utf-8"));
    expect(fonte).toContain('resolvido.contrato === "v2" && <BlocoAnalitico');
  });
});
