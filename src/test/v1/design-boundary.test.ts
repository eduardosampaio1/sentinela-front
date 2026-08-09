// M04 — GATE DE FRONTEIRA DO DESIGN SYSTEM.
//
// Constituição §3: o DS **não conhece domínio e não acessa backend**. Primitive não sabe o que é
// Análise, Instância ou Workspace; nenhuma camada do DS importa query.
//
// ## O problema que este arquivo precisa resolver antes de resolver o outro
//
// Hoje `src/design/` contém **um arquivo CSS e nenhum `.ts`**. Um gate que apenas varresse a pasta
// terminaria verde por não ter olhado nada — e continuaria verde no dia em que o primeiro
// primitive nascesse importando `@tanstack/react-query`, porque ninguém teria conferido se o
// varredor funciona.
//
// Por isso o arquivo tem duas metades:
//
//   1. **O analisador é provado contra fontes sintéticas.** Cada regra tem um caso que ela precisa
//      pegar e um caso vizinho que ela NÃO pode pegar. Os dentes existem independentemente de a
//      pasta estar povoada.
//   2. **O analisador é aplicado à árvore real.** Aí sim a varredura significa alguma coisa.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analisarFronteira } from "./fronteiraDoDesign";

const RAIZ = resolve(__dirname, "../../..");
const DESIGN = resolve(RAIZ, "src/design");
const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");

function arquivos(dir: string, ok: (p: string) => boolean, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = resolve(dir, e);
    if (statSync(p).isDirectory()) arquivos(p, ok, acc);
    else if (ok(p)) acc.push(p);
  }
  return acc;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. O ANALISADOR TEM DENTES — provado sem depender da árvore
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M04 · o analisador de fronteira pega o que precisa pegar", () => {
  it("pega import de query", () => {
    const v = analisarFronteira(
      "Botao.tsx",
      `import { useQuery } from "@tanstack/react-query";\nexport const Botao = () => null;`,
    );
    expect(v.map((x) => x.tipo)).toContain("query");
  });

  it("pega import dinâmico de query — a porta dos fundos do estático", () => {
    const v = analisarFronteira("Botao.tsx", `const q = () => import("@tanstack/react-query");`);
    expect(v.map((x) => x.tipo)).toContain("query");
  });

  it("pega import do cliente canônico e do mock", () => {
    for (const modulo of ["@/lib/v1", "../../lib/v1/client", "msw", "@/mocks/handlers"]) {
      const v = analisarFronteira("Chip.tsx", `import x from "${modulo}";`);
      expect(v.map((x) => x.tipo), `não pegou \`${modulo}\``).toContain("query");
    }
  });

  it("pega re-export, que é import com outro nome", () => {
    const v = analisarFronteira("index.ts", `export { useQuery } from "@tanstack/react-query";`);
    expect(v.map((x) => x.tipo)).toContain("query");
  });

  it("pega domínio em identificador, inclusive dentro de camelCase", () => {
    for (const fonte of [
      `const analysis = 1;`,
      `function renderAnalysisRow() {}`,
      `const instanciaAtual = null;`,
      `type Props = { workspaceId: string };`,
    ]) {
      const v = analisarFronteira("Bar.tsx", fonte);
      expect(v.map((x) => x.tipo), `não pegou em: ${fonte}`).toContain("dominio");
    }
  });

  it("pega domínio em literal e em caminho de import", () => {
    expect(
      analisarFronteira("Bar.tsx", `const rotulo = "Workspace";`).map((x) => x.tipo),
    ).toContain("dominio");
    expect(
      analisarFronteira("Bar.tsx", `import x from "@/features/canonical-analysis/result";`).map(
        (x) => x.tipo,
      ),
    ).toContain("dominio");
  });

  it("NÃO pega domínio em comentário — é onde a regra é explicada", () => {
    // Sem esta distinção, documentar a regra a violaria, e a saída que todo mundo escolhe é
    // parar de documentar. Foi o mesmo cuidado que o gate de `nunca_publicos` já exigiu.
    const v = analisarFronteira(
      "Chip.tsx",
      `// Este primitive NÃO conhece Análise, Instância nem Workspace.\n` +
        `/* Nem em bloco: analysis, workspace. */\n` +
        `export const Chip = () => null;`,
    );
    expect(v).toEqual([]);
  });

  it("NÃO pega palavra que apenas CONTÉM o termo", () => {
    // `reanalysisXyz` não é `analysis`, e um gate que confunde os dois vira ruído que as pessoas
    // aprendem a silenciar.
    const v = analisarFronteira("Chip.tsx", `const workspacesetting = 1; const xanalysisy = 2;`);
    expect(v).toEqual([]);
  });

  it("NÃO pega import legítimo do próprio DS nem de biblioteca de UI", () => {
    const v = analisarFronteira(
      "Chip.tsx",
      `import { cva } from "class-variance-authority";\n` +
        `import { Slot } from "@radix-ui/react-slot";\n` +
        `import { cn } from "@/lib/utils";\n` +
        `import { Texto } from "./Texto";`,
    );
    expect(v).toEqual([]);
  });

  it("reporta arquivo e LINHA — quem lê a falha precisa achar o defeito", () => {
    const v = analisarFronteira(
      "Chip.tsx",
      `export const a = 1;\n\nimport { useQuery } from "@tanstack/react-query";`,
    );
    expect(v[0].arquivo).toBe("Chip.tsx");
    expect(v[0].linha).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. A ÁRVORE REAL
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M04 · o Design System não conhece domínio nem query", () => {
  it("a pasta do Design System existe e tem o vocabulário canônico", () => {
    // Se `src/design/` sumisse, a varredura abaixo devolveria zero violações e o gate ficaria
    // verde por ausência de alvo. Este caso é o que impede "passou porque não existe mais".
    const todos = arquivos(DESIGN, () => true).map(posix);
    expect(todos, "src/design/ desapareceu").not.toEqual([]);
    expect(todos).toContain("src/design/tokens/tokens.css");
  });

  it("nenhum arquivo do DS importa query nem conhece domínio", () => {
    const fontes = arquivos(DESIGN, (p) => [".ts", ".tsx"].includes(extname(p)));
    const violacoes = fontes.flatMap((p) =>
      analisarFronteira(posix(p), readFileSync(p, "utf-8")),
    );
    expect(
      violacoes.map((v) => `${v.arquivo}:${v.linha} [${v.tipo}] ${v.detalhe}`),
      "o Design System atravessou a fronteira da Constituição §3",
    ).toEqual([]);
  });

  it("a camada TOKENS não importa nada — nem do próprio DS", () => {
    // TOKENS é a única camada cuja regra é "não pode importar", ponto. Um token que importa deixa
    // de ser valor e vira código.
    const tokens = arquivos(resolve(DESIGN, "tokens"), (p) =>
      [".ts", ".tsx"].includes(extname(p)),
    );
    for (const p of tokens) {
      const fonte = readFileSync(p, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(/^\s*(import|export)\s.*from\s/m.test(fonte), `${posix(p)} importa`).toBe(false);
    }
  });
});
