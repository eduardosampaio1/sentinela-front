// Cadeados do DESIGN SYSTEM (Onda 6 E7). A fonte de verdade é o RUNTIME ATIVO:
// styles/globals.css (variáveis) + tailwind.config.ts (utilitários) + shadcn/Radix.
//
// Mata duas classes de bug de uma vez:
//  1. utilitário que referencia um token INEXISTENTE (resolve para nada — Codex E5 R1);
//  2. hardcode de cor voltando às superfícies canônicas + shell tocado por elas.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..", "..");

const globals = readFileSync(join(RAIZ, "src", "styles", "globals.css"), "utf8");
const tw = readFileSync(join(RAIZ, "tailwind.config.ts"), "utf8");

/** Superfícies consolidadas na E7: canônicas + shell realmente tocado por elas. */
const CONSOLIDADAS = [
  "src/features/canonical-analysis/ui/StartAnalysisPage.tsx",
  "src/features/canonical-analysis/ui/UploadStep.tsx",
  "src/features/canonical-analysis/ui/AnalysisPage.tsx",
  "src/features/canonical-analysis/ui/AnalysesListPage.tsx",
  "src/features/canonical-analysis/ui/ResultPage.tsx",
  "src/features/canonical-analysis/ui/notices.tsx",
  "src/shell/AppShell.tsx",
  "src/shell/TopBar.tsx",
  "src/shell/Sidebar.tsx",
  "src/shell/PageFrame.tsx",
  "src/shared/states/LoadingState.tsx",
];

const COR_HARDCODED = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

describe("Design System — runtime ativo é a fonte de verdade", () => {
  it("TODO token referenciado pelo tailwind.config existe em globals.css", () => {
    const referenciados = [...tw.matchAll(/hsl\(var\((--[a-z-]+)\)/g)].map((m) => m[1]);
    expect(referenciados.length).toBeGreaterThan(10);
    const ausentes = [...new Set(referenciados)].filter(
      (nome) => !new RegExp(`^\\s*${nome}:`, "m").test(globals),
    );
    expect(ausentes, `tokens referenciados mas NÃO definidos: ${ausentes.join(", ")}`).toEqual([]);
  });

  it("o cadeado tem dentes: um token inventado seria detectado", () => {
    const inventado = "--token-que-nao-existe";
    expect(new RegExp(`^\\s*${inventado}:`, "m").test(globals)).toBe(false);
  });

  it("success/warning existem (usados pelo shell tocado)", () => {
    for (const t of ["--success", "--success-foreground", "--warning", "--warning-foreground"]) {
      expect(new RegExp(`^\\s*${t}:`, "m").test(globals), `${t} ausente`).toBe(true);
    }
  });

  it("superfícies consolidadas: ZERO cor hardcoded (hex/rgba)", () => {
    for (const rel of CONSOLIDADAS) {
      const src = readFileSync(join(RAIZ, rel), "utf8");
      // comentários fora: só código conta
      const codigo = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
      const m = codigo.match(COR_HARDCODED);
      expect(m, `${rel}: cor hardcoded "${m?.[0]}"`).toBeNull();
    }
  });

  it("a lista de superfícies consolidadas não encolhe silenciosamente", () => {
    expect(CONSOLIDADAS.length).toBeGreaterThanOrEqual(11);
  });
});
