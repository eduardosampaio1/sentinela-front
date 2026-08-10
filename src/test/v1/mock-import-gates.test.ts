// M19 — os gates de import do mock, agora contra a ÁRVORE REAL de `src/mocks/**`.
//
// ## O que a M19 acrescenta à M05
//
// A M05 nasceu quando `src/mocks/` não existia: ela provou os dentes contra fonte sintética e
// varreu a matéria de teste que havia (`src/test/msw`, `src/test/fixtures`). A M16 criou a pasta,
// a M18 a povoou com o catálogo. Só agora há árvore real para apontar o gate.
//
// E há uma direção que a M05 **não** olhava. Ela protege `produto → mock`. Falta
// `mock → produto`: nada impedia `src/mocks/scenarios/catalogo.ts` de importar um componente do
// Design System ou uma tela. Isso não vaza mock para produção — vaza PRODUTO para dentro do mock,
// e o efeito é o mesmo defeito por outro caminho: o cenário passa a depender da UI que ele deveria
// alimentar, e trocar a tela quebra o mock.
//
// ## Divisão deliberada com a M05
//
// Este arquivo não reescreve o gate da M05 — ele o complementa e o **verifica**: um caso confere
// que a M05 de fato enxerga `src/mocks/**` como matéria de teste. Duplicar a regra criaria duas
// verdades sobre a mesma fronteira, e a segunda envelheceria calada.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analisarVazamentoDeMock, ehMateriaDeTeste } from "./fronteiraDoMock";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");
const MOCKS = resolve(SRC, "mocks");
const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");

function arquivos(dir: string, acc: string[] = []): string[] {
  let e: string[];
  try {
    e = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const n of e) {
    const p = resolve(dir, n);
    if (statSync(p).isDirectory()) arquivos(p, acc);
    else if ([".ts", ".tsx"].includes(extname(p))) acc.push(p);
  }
  return acc;
}

const DA_ARVORE_DE_MOCKS = arquivos(MOCKS).map(posix);

/** Especificadores de import de um arquivo, incluindo `import()` dinâmico. */
function importesDe(rel: string): string[] {
  const texto = readFileSync(resolve(RAIZ, rel), "utf-8");
  const achados: string[] = [];
  for (const m of texto.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) achados.push(m[1]);
  return achados;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade — a árvore real EXISTE e está povoada
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M19 · 1. o gate aponta para uma árvore que existe", () => {
  it("`src/mocks/` existe no disco", () => {
    // O caso que a M05 não podia ter: quando ela rodou, esta pasta não existia. Um gate apontado
    // para diretório ausente é verde permanente — ele não acha violação porque não acha arquivo.
    expect(existsSync(MOCKS), "src/mocks/ não existe — a M16 foi desfeita?").toBe(true);
  });

  it("a árvore está POVOADA — pasta vazia não produz falso verde", () => {
    expect(DA_ARVORE_DE_MOCKS.length, "src/mocks/ vazia: o gate não teria o que varrer").
      toBeGreaterThanOrEqual(4);
  });

  it("todo arquivo da árvore é reconhecido como matéria de teste", () => {
    // A ponte com a M05: se ela deixasse de classificar `src/mocks/**` assim, estes arquivos
    // passariam a ser julgados como PRODUTO — e o gate reprovaria quem ele deveria proteger.
    for (const rel of DA_ARVORE_DE_MOCKS) {
      expect(ehMateriaDeTeste(rel), `${rel} não é reconhecido como matéria de teste`).toBe(true);
    }
  });

  it("o catálogo da M18 está entre os arquivos varridos", () => {
    // Âncora contra a árvore encolher sem ninguém notar.
    expect(DA_ARVORE_DE_MOCKS).toContain("src/mocks/scenarios/catalogo.ts");
    expect(DA_ARVORE_DE_MOCKS).toContain("src/mocks/browser.ts");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. produto → mock: nenhuma forma passa
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M19 · 2. o produto não alcança o mock — por nenhuma sintaxe", () => {
  it("o analisador reconhece alias, relativo e dinâmico", () => {
    // Provado contra fonte sintética: as três formas que alguém usaria, de propósito ou por
    // hábito. Um gate que só pega `@/mocks` perde para `../../mocks` no dia seguinte.
    const formas = [
      'import { CATALOGO } from "@/mocks/scenarios";',
      'import { CATALOGO } from "../../mocks/scenarios";',
      'import { CATALOGO } from "./mocks/scenarios/catalogo";',
      'const x = () => import("@/mocks/browser");',
      'export { CATALOGO } from "@/mocks/scenarios";',
    ];
    for (const fonte of formas) {
      const v = analisarVazamentoDeMock("Pagina.tsx", fonte).filter((x) => x.tipo === "import");
      expect(v.length, `forma não detectada: ${fonte}`).toBeGreaterThan(0);
    }
  });

  it("nenhum arquivo de PRODUTO importa a árvore de mocks", () => {
    // Contra a árvore real. `main.tsx` tem licença nominal da M16 e é o único.
    const LICENCA_NOMINAL = new Set(["src/main.tsx"]);
    const infratores: string[] = [];
    for (const p of arquivos(SRC)) {
      const rel = posix(p);
      if (ehMateriaDeTeste(rel) || /\.(test|spec|stories)\./.test(rel)) continue;
      if (LICENCA_NOMINAL.has(rel)) continue;
      for (const esp of importesDe(rel)) {
        if (/(^|\/)mocks?(\/|$)/.test(esp)) infratores.push(`${rel} → ${esp}`);
      }
    }
    expect(infratores, "produto alcançando a árvore de mocks").toEqual([]);
  });

  it("a licença nominal não pode CRESCER", () => {
    // Sem esta trava, ampliar a lista cega o caso acima e nada mais reprova — foi exatamente o
    // que a mutação "licença ampliada para a pasta inteira" provou: o gate seguia verde com a
    // violação presente. Exceção sem trava não é exceção, é porta.
    const fonte = readFileSync(resolve(RAIZ, "src/test/v1/mock-import-gates.test.ts"), "utf-8");
    const decl = fonte.match(/const LICENCA_NOMINAL = new Set\(\[([^\]]*)\]\)/)?.[1] ?? "";
    const entradas = decl.split(",").map((x) => x.trim()).filter(Boolean);
    expect(entradas, "a licença nominal cresceu — cada entrada precisa de missão e motivo").
      toEqual(['"src/main.tsx"']);
  });

  it("a licença nominal é de UM arquivo, e ele realmente a usa", () => {
    // Licença que sobrevive ao motivo vira porta aberta: o gate segue verde e a exceção passa a
    // cobrir quem chegar depois com o mesmo caminho.
    const usa = importesDe("src/main.tsx").some((e) => /(^|\/)mocks?(\/|$)/.test(e));
    expect(usa, "src/main.tsx não importa mais mocks: remova a licença nominal").toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. mock → produto: a direção que a M05 não olhava
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * De que `src/mocks/**` PODE depender.
 *
 * A lista é de camadas, não de arquivos, e é curta de propósito:
 *   • `msw` — a biblioteca que serve os handlers;
 *   • `@/test/**` — as fixtures e handlers canônicos (fonte única, presa ao contrato pela M17);
 *   • `@/lib/v1/**` — o CONTRATO: base do gateway, tipos e catálogo de problemas. É a fronteira
 *     mais permissiva aqui, e ela existe porque um mock que não conhecesse o contrato teria de
 *     redigitá-lo — recriando a representação que a WS-A passou uma missão reduzindo;
 *   • relativo dentro da própria árvore.
 */
const PERMITIDO: readonly RegExp[] = [
  /^msw(\/|$)/,
  /^@\/test\//,
  /^@\/lib\/v1(\/|$)/,
  /^\.{1,2}\//,
];

describe("M19 · 3. o mock não depende de produto", () => {
  it("nenhum arquivo de `src/mocks/**` importa fora das camadas permitidas", () => {
    // Isto não vaza mock para produção — vaza PRODUTO para dentro do mock. O efeito é o mesmo
    // defeito por outro caminho: o cenário passa a depender da tela que deveria alimentar, e
    // trocar a tela quebra o mock.
    const infratores: string[] = [];
    for (const rel of DA_ARVORE_DE_MOCKS) {
      for (const esp of importesDe(rel)) {
        if (!PERMITIDO.some((r) => r.test(esp))) infratores.push(`${rel} → ${esp}`);
      }
    }
    expect(infratores, "mock dependendo de camada não permitida").toEqual([]);
  });

  it("as camadas de PRODUTO nunca entram na lista de permitidos", () => {
    // A trava da outra lista. Ampliar `PERMITIDO` com `@/features/` deixava o import passar e
    // nenhum caso reclamava — o gate media a lista, não a regra. Aqui a regra é nomeada: estas
    // camadas são produto, e produto não entra em matéria de mock por nenhuma redação.
    for (const camada of ["@/features/x", "@/design/primitives", "@/app/router", "@/shell/Sidebar", "@/contexts/AuthContext", "react"]) {
      expect(
        PERMITIDO.some((r) => r.test(camada)),
        `\`${camada}\` virou camada permitida para o mock`,
      ).toBe(false);
    }
  });

  it("há imports de verdade para julgar", () => {
    // Sem isto, um `src/mocks/` de arquivos sem import passaria o caso acima por vacuidade.
    const total = DA_ARVORE_DE_MOCKS.flatMap(importesDe).length;
    expect(total, "nenhum import encontrado na árvore de mocks").toBeGreaterThan(5);
  });

  it("o mock não importa React — ele serve dado, não renderiza", () => {
    const comReact = DA_ARVORE_DE_MOCKS.filter((rel) =>
      importesDe(rel).some((e) => /^react(-dom)?(\/|$)/.test(e)),
    );
    expect(comReact, "mock importando React").toEqual([]);
  });
});
