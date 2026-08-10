// M29 — RES-01: export.
//
// ## O que esta missão removeu, e por autoridade
//
// `BotaoDeExport` montava um **CSV no navegador** (`exportarCsv` + `Blob` + `createObjectURL`), e
// o rótulo dizia *"Baixa exatamente os números desta página"*. A D16 é literal: *"Uma única noção
// de exportação: o artefato do backend. O CSV local SAI. Com `export = ready`, download; nos
// demais estados, representar o estado vindo de `/progress`."*
//
// Serializar a tela não é exportar a análise: o pacote do backend é determinístico e atestado por
// `sha256`; um CSV do cliente é uma segunda verdade sobre os mesmos números.
//
// ## `expired` é o ponto do DoD
//
// *"`expired` oferece o caminho certo, sem prometer o que não há."* Não existe operação pública de
// regenerar export — as 12 de `operations[]` não incluem nenhuma. Então `expired` não tem botão,
// não promete recuperação, e não diz que o dado nunca existiu.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import type { ExportAxisState } from "@/lib/v1";
import { CATALOGO } from "@/mocks/scenarios/catalogo";

const RAIZ = resolve(__dirname, "../../..");
const BLUEPRINT = readFileSync(resolve(RAIZ, "docs/EXPERIENCE-BLUEPRINT-V1.md"), "utf-8");
const ACAO_TSX = resolve(RAIZ, "src/features/canonical-analysis/ui/analytics/AcaoDeExport.tsx");
const PAGINA_TSX = resolve(RAIZ, "src/features/canonical-analysis/ui/ResultPage.tsx");

const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const baixar = vi.fn();
vi.mock("@/features/canonical-analysis/data/analysis", async () => {
  const real = await vi.importActual<Record<string, unknown>>(
    "@/features/canonical-analysis/data/analysis",
  );
  return { ...real, useExportDownload: () => ({ mutate: baixar, isPending: false }) };
});
vi.mock("@/features/canonical-analysis/ui/scope", () => ({
  useCanonicalScope: () => ({ workspaceId: "ws-1" }),
}));

const { AcaoDeExport } = await import(
  "@/features/canonical-analysis/ui/analytics/AcaoDeExport"
);

const A = pt.canonicalAnalysis.result.analytics;

const montar = (estado: ExportAxisState | null) => {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <LanguageProvider>
      <AcaoDeExport analysisId="an-abc" estado={estado} />
    </LanguageProvider>,
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Scenarios 17–19 pela AUTORIDADE
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M29 · 1. scenarios", () => {
  it("o Blueprint nomeia 17/18/19 e os três servem RES-01", () => {
    expect(BLUEPRINT).toMatch(/^\|\s*17\s*\|\s*`export-preparing`\s*\|\s*RES-01\s*\|/m);
    expect(BLUEPRINT).toMatch(/^\|\s*18\s*\|\s*`export-ready`\s*\|\s*RES-01\s*\|/m);
    expect(BLUEPRINT).toMatch(/^\|\s*19\s*\|\s*`export-expired`\s*\|\s*RES-01\s*\|/m);
  });

  it("os três existem no catálogo, com o MESMO nome", () => {
    for (const nome of ["export-preparing", "export-ready", "export-expired"]) {
      const s = CATALOGO.find((c) => c.id === nome);
      expect(s, `scenario ausente: ${nome}`).toBeTruthy();
      expect(s!.superficies).toContain("RES-01");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Uma exportação só — a do backend (D16)
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M29 · 2. nada é montado no navegador", () => {
  it("a ação não fabrica arquivo nem serializa a tela", () => {
    const fonte = semComentarios(readFileSync(ACAO_TSX, "utf-8"));
    for (const local of ["new Blob", "createObjectURL", "text/csv", "exportarCsv", "download="]) {
      expect(fonte, `export local: ${local}`).not.toContain(local);
    }
  });

  it("o módulo do CSV local NÃO existe mais", () => {
    // Código morto é proibido pela regra da casa; e mantê-lo daria um caminho para o CSV voltar.
    expect(existsSync(resolve(RAIZ, "src/features/canonical-analysis/result/exportar.ts"))).toBe(
      false,
    );
    expect(
      existsSync(resolve(RAIZ, "src/features/canonical-analysis/ui/analytics/BotaoDeExport.tsx")),
    ).toBe(false);
  });

  it("`object_key` não é nomeado", () => {
    expect(semComentarios(readFileSync(ACAO_TSX, "utf-8"))).not.toContain("object_key");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. O estado governa a ação
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M29 · 3. só `ready` oferece download", () => {
  it("`ready`: existe botão, e ele chama o cliente CANÔNICO da M22", async () => {
    const u = userEvent.setup();
    baixar.mockClear();
    montar("ready");
    const botao = screen.getByRole("button", { name: A.exportDownload });
    await u.click(botao);
    expect(baixar).toHaveBeenCalledTimes(1);
    expect(baixar.mock.calls[0][0]).toMatchObject({ analysisId: "an-abc" });
  });

  for (const estado of ["unavailable", "preparing", "expired", "failed", "unknown"] as const) {
    it(`\`${estado}\`: NENHUM botão — nem desabilitado`, () => {
      montar(estado);
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.getByText(A.exportState[estado])).toBeTruthy();
    });
  }

  it("sem estado (progresso ainda não respondeu): não promete nada", () => {
    const { container } = montar(null);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("a página lê o eixo `export` de `/progress` — não descobre estado tentando baixar", () => {
    const fonte = semComentarios(readFileSync(PAGINA_TSX, "utf-8"));
    expect(fonte).toContain('a.axis === "export"');
    expect(fonte).toContain("useAnalysisProgress(scope, analysisId)");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. `expired` — o caminho certo, sem promessa
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M29 · 4. expired", () => {
  it("diz que o pacote não está mais disponível — e nada além disso", () => {
    montar("expired");
    expect(screen.getByText(A.exportState.expired)).toBeTruthy();
  });

  it("NÃO promete regeneração — não há operação pública que a sustente", () => {
    const texto = A.exportState.expired + semComentarios(readFileSync(ACAO_TSX, "utf-8"));
    for (const promessa of ["regenerar", "gerar de novo", "refazer", "tentar novamente", "regenerate"]) {
      expect(texto.toLowerCase(), `CTA sem owner: ${promessa}`).not.toContain(promessa);
    }
  });

  it("NÃO diz que o dado nunca existiu — `expired` ≠ `unavailable`", () => {
    expect(A.exportState.expired).not.toBe(A.exportState.unavailable);
  });

  it("não revela a diferença privada entre expirado e purgado", () => {
    const texto = (A.exportState.expired + semComentarios(readFileSync(ACAO_TSX, "utf-8"))).toLowerCase();
    expect(texto).not.toContain("purg");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. A capability é curta — e não vira estado
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M29 · 5. a URL assinada", () => {
  it("não é guardada: sem estado local, sem storage, sem chave de cache", () => {
    const fonte = semComentarios(readFileSync(ACAO_TSX, "utf-8"));
    for (const guardar of ["useState", "localStorage", "sessionStorage", "queryKey"]) {
      expect(fonte, `capability curta virando estado: ${guardar}`).not.toContain(guardar);
    }
    // `useMutation` (via `useExportDownload`) é o que garante que ela não entra em cache.
    expect(fonte).toContain("useExportDownload");
  });

  it("nenhum problem code inventado", () => {
    const fonte = semComentarios(readFileSync(ACAO_TSX, "utf-8"));
    for (const inventado of ["export_expired", "upstream_unavailable", "export_purged"]) {
      expect(fonte).not.toContain(inventado);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. Sem cor como única semântica, e sem card novo
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M29 · 6. forma", () => {
  it("cada estado tem FRASE própria — as seis são distintas", () => {
    const frases = Object.values(A.exportState);
    expect(frases).toHaveLength(6);
    expect(new Set(frases).size).toBe(6);
  });

  it("nenhuma classe destrutiva carrega a informação", () => {
    for (const estado of ["expired", "failed"] as const) {
      const { container, unmount } = montar(estado);
      expect(container.querySelectorAll("[class*='destructive']").length, estado).toBe(0);
      unmount();
    }
  });

  it("não nasceu container novo — o estado mora ao lado da ação", () => {
    const fonte = semComentarios(readFileSync(ACAO_TSX, "utf-8"));
    expect(fonte).not.toContain("bg-card");
    expect(fonte).not.toMatch(/rounded-lg border/);
  });

  it("sem motion — não há consumidor semântico", () => {
    const fonte = semComentarios(readFileSync(ACAO_TSX, "utf-8"));
    for (const m of ["transition", "animate-", "duration-"]) {
      expect(fonte, `motion decorativo: ${m}`).not.toContain(m);
    }
  });
});
