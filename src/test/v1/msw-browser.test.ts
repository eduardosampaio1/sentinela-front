// M16 — o MSW no browser: uma variável decide, e nenhuma tela sabe.
//
// ## O DoD, em uma frase
//
// *Trocar mock↔real muda **uma variável**, zero arquivo de UI.* Os dois lados dessa frase são
// verificáveis, e este arquivo verifica os dois — porque só o primeiro já foi motivo suficiente,
// em muitos projetos, para o mock virar caminho de produção com outro nome.
//
// ## O defeito que o plano descreve, e a precisão que faltava
//
// O plano diz que `package.json` declara `msw.workerDirectory` e *"o worker nunca é montado"*.
// Quase: ele **é** montado, mas só por `src/e2e/bypass.ts`, sob `DEV && VITE_E2E`, com handlers de
// jornada para o Playwright. O que não existia era a infraestrutura de mock de desenvolvimento —
// a que permite `MSW OFF → Gateway` sem tocar em componente. É ela que a M16 cria.
//
// ## O que este gate NÃO consegue provar aqui
//
// Que o service worker de fato intercepta no navegador. jsdom não tem service worker, e um teste
// que "provasse" isso estaria provando um mock do mock. O que é verificável em estática — e o que
// realmente decide se a coisa funciona — é que a base dos handlers vem da MESMA função que o
// cliente usa. Divergir aí é o modo silencioso de o worker ficar inerte.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");

const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
/**
 * Remove comentários — sem comer URL.
 *
 * A primeira versão usava `/\/\/.*$/gm`, e ela truncava `"http://gw.test"` no `//`: o resto da
 * linha virava "comentário", a base literal sumia do texto examinado, e a mutação que a
 * reintroduzia SOBREVIVEU. O `(?<!:)` é o que separa um comentário de um esquema de URL.
 */
const semComentarios = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/.*$/gm, "");

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

/** A variável ÚNICA do DoD. */
const VARIAVEL = "VITE_SENTINELA_MOCK";

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade — as peças existem
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M16 · 1. a infraestrutura existe de verdade", () => {
  it("`src/mocks/browser.ts` e `src/mocks/node.ts` existem", () => {
    for (const f of ["src/mocks/browser.ts", "src/mocks/node.ts"]) {
      expect(existsSync(resolve(RAIZ, f)), `${f} ausente`).toBe(true);
    }
  });

  it("o service worker está no disco, onde `msw.workerDirectory` promete", () => {
    // Sem o arquivo, `worker.start()` falha em runtime e o mock nunca sobe — com o código todo
    // parecendo certo. `package.json` declara a pasta; este caso confere que ela cumpre.
    const pkg = JSON.parse(ler("package.json")) as { msw?: { workerDirectory?: string[] } };
    const pastas = pkg.msw?.workerDirectory ?? [];
    expect(pastas, "`msw.workerDirectory` não declarado").not.toEqual([]);
    for (const pasta of pastas) {
      expect(
        existsSync(resolve(RAIZ, pasta, "mockServiceWorker.js")),
        `${pasta}/mockServiceWorker.js ausente — rode \`npx msw init ${pasta}\``,
      ).toBe(true);
    }
  });

  it("`msw` é dependência de DESENVOLVIMENTO, não de produção", () => {
    // Em `dependencies`, o pacote entra no grafo de produção e passa a depender só do
    // tree-shaking para não ir junto. O lugar dele é `devDependencies`.
    const pkg = JSON.parse(ler("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(Object.keys(pkg.devDependencies ?? {}), "msw fora de devDependencies").toContain("msw");
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain("msw");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. UMA variável — e ela mora fora de qualquer componente
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M16 · 2. uma variável decide entre mock e Gateway", () => {
  it(`só \`${VARIAVEL}\` liga o mock`, () => {
    const browser = semComentarios(ler("src/mocks/browser.ts"));
    expect(browser).toContain(VARIAVEL);
  });

  it("a variável é lida em UM lugar só", () => {
    // Duas leituras é meio caminho para duas verdades: um módulo acha que o mock está ligado e
    // outro acha que não, e o comportamento passa a depender de qual deles roda primeiro.
    const leitores = arquivos(SRC)
      .map(posix)
      .filter((rel) => !/\.(test|spec)\./.test(rel))
      .filter((rel) => semComentarios(ler(rel)).includes(VARIAVEL));
    expect(leitores, `\`${VARIAVEL}\` lida em mais de um lugar`).toEqual(["src/mocks/browser.ts"]);
  });

  it("o arranque está sob o cadeado `import.meta.env.DEV`", () => {
    // `DEV` é o literal `false` em build de produção: o Rollup elimina o ramo, e nem
    // `src/mocks/**` nem o pacote `msw` entram no bundle do usuário.
    const main = semComentarios(ler("src/main.tsx"));
    // DECLARAR não basta — e distinguir declaração de chamada custou duas tentativas:
    //   1ª: procurar o nome. A mutação que trocava a chamada por `renderApp()` sobreviveu,
    //       porque a função continuava declarada no arquivo, morta.
    //   2ª: procurar `nome()`. Sobreviveu igual: `async function arrancarMockSePedido()` casa o
    //       mesmo padrão que a chamada.
    // O que separa os dois é a CONTAGEM: declarada uma vez, chamada é a segunda ocorrência.
    const ocorrencias = main.split("arrancarMockSePedido").length - 1;
    expect(
      ocorrencias,
      "o arranque do mock está declarado mas ninguém o chama — código inalcançável",
    ).toBeGreaterThanOrEqual(2);
    const i = main.indexOf("async function arrancarMockSePedido");
    expect(i, "o arranque do mock sumiu de main.tsx").toBeGreaterThan(-1);
    const fim = main.indexOf("}", main.indexOf("./mocks/browser"));
    expect(main.slice(i, fim)).toContain("import.meta.env.DEV");
  });

  it("o import de `src/mocks/**` é DINÂMICO — senão o cadeado não elimina nada", () => {
    // Import estático entra no grafo do módulo independentemente do `if`: o cadeado protegeria a
    // execução e não o bundle, e `msw` viajaria para produção junto com as fixtures.
    const main = semComentarios(ler("src/main.tsx"));
    expect(main, "import estático de mocks em main.tsx").not.toMatch(
      /^\s*import\s[^\n]*["'][^"']*mocks\//m,
    );
    expect(main).toContain('import("./mocks/browser")');
  });

  it("um valor diferente do esperado NÃO liga o mock", () => {
    // Fail-closed: `VITE_SENTINELA_MOCK=true` não deve ligar nada. Um mock que sobe por engano é
    // pior que um que não sobe — o segundo você percebe na hora.
    const browser = semComentarios(ler("src/mocks/browser.ts"));
    expect(browser, "comparação frouxa liga o mock com qualquer valor").toMatch(
      /===\s*VALOR_LIGADO|VALOR_LIGADO\s*===/,
    );
    expect(browser).toContain('"on"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Zero arquivo de UI — nenhuma tela sabe que existe mock
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M16 · 3. a UI não conhece o mock", () => {
  const SUPERFICIES = arquivos(SRC)
    .map(posix)
    .filter((rel) => /^src\/(features\/[^/]+\/ui|design|shell|shared)\//.test(rel))
    .filter((rel) => !/\.(test|spec|stories)\./.test(rel));

  it("há superfícies para varrer", () => {
    expect(SUPERFICIES.length, "nenhuma superfície encontrada — o alvo mudou?").toBeGreaterThan(10);
  });

  it("nenhuma superfície menciona msw, worker ou a variável do mock", () => {
    // O gate da M05 já proíbe IMPORTAR matéria de teste. Este é o outro lado: nem sequer SABER
    // que ela existe. Uma tela com `if (mockLigado())` não importa nada e mesmo assim quebrou a
    // arquitetura — a decisão de mock voltou para dentro do produto.
    const infratores: string[] = [];
    for (const rel of SUPERFICIES) {
      // Case-INSENSITIVE de propósito. A primeira versão comparava com `includes` literal, e a
      // mutação que introduzia `const usandoMsw = true` sobreviveu: `usandoMsw` tem `M` maiúsculo
      // e `"msw"` não casava. Quem escreve a violação escreve em camelCase.
      const texto = semComentarios(ler(rel)).toLowerCase();
      for (const termo of ["msw", "setupworker", "mockserviceworker", VARIAVEL, "mockligado"]) {
        if (texto.includes(termo.toLowerCase())) infratores.push(`${rel} — cita \`${termo}\``);
      }
    }
    expect(infratores, "a UI passou a saber que existe mock").toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. A base do mock é a MESMA do cliente
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M16 · 4. o mock intercepta exatamente o que o cliente chama", () => {
  it("`browser.ts` resolve a base pela função do cliente canônico", () => {
    // O modo silencioso de o worker ficar inerte: handlers numa base própria, requisições saindo
    // por outra. O worker sobe, o log diz que está ligado, e nada é interceptado.
    const browser = semComentarios(ler("src/mocks/browser.ts"));
    expect(browser, "base própria: o worker interceptaria um endereço que ninguém chama").
      toContain("resolveGatewayBaseUrl");
  });

  it("`browser.ts` não inventa uma base literal", () => {
    expect(semComentarios(ler("src/mocks/browser.ts"))).not.toMatch(/https?:\/\/[a-z]/);
  });

  it("os handlers vêm da fonte ÚNICA, não de uma cópia", () => {
    // Um segundo conjunto de handlers é o "universo paralelo" que a Fase 2 existe para impedir —
    // e o motivo de a M15 esperar a M16: o Storybook precisa dos MESMOS cenários.
    const browser = semComentarios(ler("src/mocks/browser.ts"));
    const node = semComentarios(ler("src/mocks/node.ts"));
    expect(browser).toContain("@/test/msw/journey");
    expect(node).toContain("@/test/msw/server");
    // E não redefine handler nenhum por conta própria.
    expect(browser, "handler definido dentro de mocks/browser.ts").not.toMatch(
      /\bhttp\.(get|post|put|delete)\s*\(/,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. O cadeado, medido no BUNDLE — não na leitura do código
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M16 · 5. mock nenhum chega ao bundle do usuário", () => {
  const dir = resolve(RAIZ, "dist", "assets");
  const mapas = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".map")) : [];

  it("o bundle foi MEDIDO — senão a afirmação seria opinião", () => {
    // Mesmo desenho fail-closed do gate da Onda 8: sem sourcemap no disco, este arquivo não pode
    // dizer nada sobre o bundle, e dizer mesmo assim seria pior do que não dizer.
    expect(
      mapas.length,
      "nenhum sourcemap em dist/assets — rode `npx vite build --sourcemap` antes",
    ).toBeGreaterThan(0);
  });

  it("nenhum módulo de mock, msw ou fixture está no bundle de produção", () => {
    // A prova real do cadeado. Ler `import.meta.env.DEV` no fonte diz que a INTENÇÃO existe;
    // só o sourcemap diz que o Rollup de fato eliminou o ramo.
    const modulos = new Set<string>();
    for (const f of mapas) {
      let mapa: { sources?: string[] };
      try {
        mapa = JSON.parse(readFileSync(resolve(dir, f), "utf-8")) as { sources?: string[] };
      } catch {
        continue;
      }
      for (const origem of mapa.sources ?? []) modulos.add(origem);
    }
    const vazados = [...modulos].filter(
      (m) => m.includes("/mocks/") || m.toLowerCase().includes("msw") || m.includes("/test/"),
    );
    expect(vazados, "matéria de teste chegou ao bundle do usuário").toEqual([]);
    expect(modulos.size, "sourcemap sem módulos — o build está vazio?").toBeGreaterThan(50);
  });
});
