// M05 — o gate da fronteira do mock.
//
// Ordem deliberada, e ela importa: **primeiro** provamos que o analisador tem dentes contra fontes
// sintéticas, **depois** o apontamos para a árvore real. Invertido, um gate sem dentes varrendo
// uma árvore limpa reporta verde e ninguém distingue "não há vazamento" de "não sei procurar".

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analisarVazamentoDeMock, ehMateriaDeTeste, temPalavraDeTeste } from "./fronteiraDoMock";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");

const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");

function arquivos(dir: string, acc: string[] = []): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const e of entradas) {
    const p = resolve(dir, e);
    if (statSync(p).isDirectory()) arquivos(p, acc);
    else if ([".ts", ".tsx"].includes(extname(p))) acc.push(p);
  }
  return acc;
}

const ehTeste = (p: string) => /\.(test|spec)\.tsx?$/.test(p);
const ehStory = (p: string) => /\.stories\.tsx?$/.test(p);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Os dentes — provados contra fonte sintética, sem depender da árvore
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M05 · 1. o analisador tem dentes", () => {
  it("acusa import de matéria de teste", () => {
    const v = analisarVazamentoDeMock(
      "Componente.tsx",
      `import { MSW_BASE } from "@/test/msw/handlers";\nexport const X = () => null;\n`,
    );
    expect(v.filter((x) => x.tipo === "import")).toHaveLength(1);
    expect(v[0].linha).toBe(1);
  });

  it("acusa `import()` dinâmico, não só o estático", () => {
    // O caminho preferido de quem quer contornar um gate de import: adiar para runtime.
    const v = analisarVazamentoDeMock(
      "Componente.tsx",
      `export async function carregar() {\n  return import("@/test/fixtures/public-v1/analyses");\n}\n`,
    );
    expect(v.filter((x) => x.tipo === "import")).toHaveLength(1);
  });

  it("acusa identificador embutido, mesmo SEM nenhum import", () => {
    // O vazamento que grafo de import nenhum enxerga: a massa está escrita dentro do componente.
    const v = analisarVazamentoDeMock(
      "Componente.tsx",
      `const mockAnalises = [];\nexport const X = () => mockAnalises;\n`,
    );
    expect(v.filter((x) => x.tipo === "identificador").length).toBeGreaterThan(0);
  });

  it("acusa as quatro famílias do plano, em qualquer grafia", () => {
    for (const nome of ["mockDados", "MOCK_LISTA", "dadosFixture", "useScenario", "mswServidor"]) {
      expect(temPalavraDeTeste(nome), `\`${nome}\` passou`).not.toBeNull();
    }
  });

  it("NÃO acusa comentário — é o que separa AST de grep", () => {
    // Se este caso quebrar, a regra deixa de poder ser explicada onde ela vale, e a saída que
    // todo mundo escolhe é parar de documentar.
    const v = analisarVazamentoDeMock(
      "Componente.tsx",
      `// nenhum mock, fixture, scenario ou msw entra aqui\n/* nem em bloco: mockAnalises */\nexport const X = () => null;\n`,
    );
    expect(v, JSON.stringify(v)).toHaveLength(0);
  });

  it("NÃO acusa palavra apenas contida em outra", () => {
    // `smoke` contém `mok`? não. Mas `scenarios` vs `scene`, `mockup` vs `mock`: a quebra por
    // camelCase precisa separar palavra, não substring solta.
    expect(temPalavraDeTeste("smokeTest")).toBeNull();
    expect(temPalavraDeTeste("sceneGrafo")).toBeNull();
    expect(temPalavraDeTeste("formatador")).toBeNull();
  });

  it("reconhece as raízes de matéria de teste — incluindo a que o plano supôs", () => {
    for (const e of ["msw", "@/test/msw/handlers", "@/test/fixtures/x", "@/mocks/y", "../__mocks__/z"]) {
      expect(ehMateriaDeTeste(e), `\`${e}\` não foi reconhecido`).toBe(true);
    }
    for (const e of ["react", "@/lib/v1/client", "@/design/primitives"]) {
      expect(ehMateriaDeTeste(e), `\`${e}\` foi reconhecido por engano`).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. O alvo existe — fail-closed contra vacuidade
// ═══════════════════════════════════════════════════════════════════════════════════════════

const ZONAS = [resolve(SRC, "features"), resolve(SRC, "design")];
const ALVOS = ZONAS.flatMap((z) => arquivos(z))
  .filter((p) => !ehTeste(p) && !ehStory(p))
  .filter((p) => posix(p).includes("/ui/") || posix(p).includes("/design/"));

describe("M05 · 2. o gate não passa por vacuidade", () => {
  it("a matéria de teste EXISTE no disco — senão não há fronteira a proteger", () => {
    // `src/mocks/**` (o nome que o plano supôs) não existe. Se um dia ninguém achar matéria de
    // teste nenhuma, este caso falha em vez de o gate reportar verde por não ter o que varrer.
    const materia = arquivos(resolve(SRC, "test")).filter((p) => {
      const rel = posix(p);
      return rel.includes("/test/msw/") || rel.includes("/test/fixtures/");
    });
    expect(materia.length, "nenhuma matéria de teste encontrada em src/test/{msw,fixtures}").
      toBeGreaterThan(0);
  });

  it("as zonas protegidas têm arquivos de produto para varrer", () => {
    // Um gate apontado para pasta vazia é verde permanente. Se `features/**/ui/**` e `design/**`
    // ficarem sem arquivo de produto, é sinal de que o gate perdeu o alvo — não de que passou.
    expect(ALVOS.length, "nenhum arquivo de produto nas zonas protegidas").toBeGreaterThan(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. A árvore real — identificadores
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M05 · 3. matéria de teste não aparece no produto", () => {
  it("nenhum arquivo de `features/**/ui/**` ou `design/**` cita mock, fixture, scenario ou MSW", () => {
    const vazamentos = ALVOS.flatMap((p) =>
      analisarVazamentoDeMock(posix(p), readFileSync(p, "utf-8")),
    );
    expect(
      vazamentos.map((v) => `${v.arquivo}:${v.linha} — ${v.detalhe}`),
      "matéria de teste vazou para o produto",
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. O grafo de import — quem tem licença, e por quê
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Bootstrap de dev com licença NOMINAL para importar matéria de teste.
 *
 * Nominal, não por padrão de pasta: `src/e2e/**` como regra deixaria qualquer arquivo futuro
 * entrar de graça. Cada entrada carrega o motivo e o cadeado que a torna segura — a licença é
 * para o arquivo que JÁ provou não chegar a produção, não para a pasta onde ele mora.
 */
const BOOTSTRAP_LICENCIADO: ReadonlyMap<string, string> = new Map([
  [
    "src/e2e/bypass.ts",
    "só é `import()`-ado por main.tsx sob `import.meta.env.DEV && VITE_E2E`, que o Rollup elimina " +
      "do bundle de produção; a prova de bundle vive em src/test/v1/e2e-bypass-lockdown.test.ts",
  ],
]);

describe("M05 · 4. só teste, story e bootstrap declarado importam matéria de teste", () => {
  const importadores = arquivos(SRC)
    .filter((p) => !posix(p).startsWith("src/test/"))
    .map((p) => ({
      rel: posix(p),
      imports: analisarVazamentoDeMock(posix(p), readFileSync(p, "utf-8")).filter(
        (v) => v.tipo === "import",
      ),
    }))
    .filter((x) => x.imports.length > 0);

  it("nenhum arquivo de PRODUTO importa matéria de teste", () => {
    const infratores = importadores
      .filter((x) => !ehTeste(x.rel) && !ehStory(x.rel) && !BOOTSTRAP_LICENCIADO.has(x.rel))
      .map((x) => `${x.rel} — ${x.imports[0].detalhe}`);
    expect(infratores, "produto importando matéria de teste").toEqual([]);
  });

  it("a licença de bootstrap é MÍNIMA — nenhuma entrada sobrando", () => {
    // Uma licença que sobrevive ao arquivo que a justificava vira porta aberta e ninguém percebe:
    // o gate continua verde, e a exceção passa a cobrir quem chegar depois com o mesmo nome.
    const usadas = importadores.filter((x) => BOOTSTRAP_LICENCIADO.has(x.rel)).map((x) => x.rel);
    const sobrando = [...BOOTSTRAP_LICENCIADO.keys()].filter((k) => !usadas.includes(k));
    expect(sobrando, "licença declarada para arquivo que não importa mais matéria de teste").
      toEqual([]);
  });

  it("cada licença carrega o motivo escrito", () => {
    for (const [arquivo, motivo] of BOOTSTRAP_LICENCIADO) {
      expect(motivo.length, `${arquivo}: licença sem motivo`).toBeGreaterThan(40);
    }
  });
});
