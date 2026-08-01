import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Cadeados da Onda 8 contra o retorno do legado do frontend.
 *
 * A ordem que a onda exige é `provar canônico → desligar → provar ausência → remover`.
 * Estes cadeados são a etapa "desligar": eles tornam a reintrodução do legado um teste
 * VERMELHO, e não uma descoberta em produção. Foram escritos ANTES da remoção, de
 * propósito — um gate criado depois do fato nunca é visto falhar.
 */

const raiz = process.cwd();

/** Arquivos versionados, via git — não caminha em `node_modules` nem em `dist`. */
function versionados(): string[] {
  return execSync("git ls-files", { cwd: raiz, encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

describe("Onda 8 — o legado do frontend não volta", () => {
  it("nenhum arquivo fora de src_legacy importa de src_legacy", () => {
    const ofensores = versionados()
      .filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f) && !f.startsWith("src_legacy/"))
      .filter((f) => {
        const txt = readFileSync(`${raiz}/${f}`, "utf8");
        // `import ... from ".../src_legacy/..."`, `import("...src_legacy...")`,
        // e o alias `@/../src_legacy` — as três formas que alcançariam a pasta.
        return /from\s+["'][^"']*src_legacy|import\(\s*["'][^"']*src_legacy/.test(txt);
      });
    expect(ofensores).toEqual([]);
  });

  it("o tsconfig da aplicação não inclui src_legacy", () => {
    const conf = readFileSync(`${raiz}/tsconfig.app.json`, "utf8");
    expect(conf).not.toContain("src_legacy");
  });

  it("nenhum script, config ou manifesto referencia src_legacy", () => {
    const alvos = ["package.json", "vite.config.ts", "playwright.config.ts", "index.html"];
    for (const alvo of alvos) {
      if (!existsSync(`${raiz}/${alvo}`)) continue;
      expect(readFileSync(`${raiz}/${alvo}`, "utf8"), alvo).not.toContain("src_legacy");
    }
  });

  it("nenhum teste canônico depende de src_legacy", () => {
    const ofensores = versionados()
      .filter((f) => f.startsWith("src/test/"))
      .filter((f) => readFileSync(`${raiz}/${f}`, "utf8").includes("src_legacy"))
      // este próprio arquivo cita o nome, e é o único que pode
      .filter((f) => !f.endsWith("onda8.legado.gate.test.ts"));
    expect(ofensores).toEqual([]);
  });

  it("o diretório src_legacy não existe mais na árvore", () => {
    // Removido no lote 1 da Parte E, depois de dez provas independentes de desuso:
    // grau de entrada zero no grafo direcionado, nenhuma menção com prefixo
    // `src_legacy/` fora da pasta, ZERO módulos no bundle (49 sourcemaps, 123 módulos
    // do projeto), router limpo, nenhum import externo, zero fonte de CSS/asset,
    // ausência no tsconfig, testes canônicos independentes, scripts limpos, e a suíte
    // de 271 testes verde sem ele.
    //
    // Recuperável por `git show <commit-anterior>:src_legacy/<arquivo>`.
    expect(existsSync(`${raiz}/src_legacy`)).toBe(false);
  });
});
