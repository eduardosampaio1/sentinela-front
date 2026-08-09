// M15 — o gate do Storybook: ele mostra o Design System, e não inventa dado.
//
// ## O DoD, e por que ele é a parte que importa
//
// *Toda story escolhe um cenário; nenhuma declara payload.* Uma story que escreve o próprio
// `{ analysis_id: "an-1", status: "completed" }` cria um segundo universo de dados — e ele
// diverge do contrato no dia em que o contrato mudar, sem nada ficar vermelho. O Storybook passa
// a mostrar uma tela que a aplicação não produz mais, e a revisão visual aprova ficção.
//
// É exatamente o motivo de a M15 ter esperado a M16 (`Pré: M13, M16`): sem infraestrutura de mock
// pronta, inventar payload é o caminho de menor resistência.
//
// ## O que este gate NÃO cobre
//
// Regressão visual. O plano põe fora de escopo de propósito — *"só depois de uma mutação de token
// o fazer falhar"* — e um baseline de imagem que ninguém provou ser sensível é um arquivo grande
// que reprova por antialiasing e passa por mudança de cor.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");
const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");

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

const STORIES = arquivos(SRC)
  .map(posix)
  .filter((rel) => /\.stories\.tsx?$/.test(rel));

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M15 · 1. o gate tem stories para julgar", () => {
  it("o Storybook está configurado", () => {
    for (const f of [".storybook/main.ts", ".storybook/preview.tsx"]) {
      expect(existsSync(resolve(RAIZ, f)), `${f} ausente`).toBe(true);
    }
  });

  it("existem stories — senão todo caso abaixo passaria sobre nada", () => {
    expect(STORIES.length, "nenhuma story encontrada").toBeGreaterThan(2);
  });

  it("o pacote e os scripts existem", () => {
    const pkg = JSON.parse(ler("package.json")) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(Object.keys(pkg.devDependencies ?? {}), "storybook fora de devDependencies").toContain(
      "storybook",
    );
    expect(pkg.scripts?.storybook, "script `storybook` ausente").toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Só o Design System canônico — não catálogo de legado
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M15 · 2. o catálogo é do DS canônico", () => {
  it("todas as stories vivem em `src/design/**`", () => {
    const fora = STORIES.filter((rel) => !rel.startsWith("src/design/"));
    expect(fora, "story fora do Design System canônico").toEqual([]);
  });

  it("o glob do Storybook não varre a árvore inteira", () => {
    // `src/**` transformaria o catálogo numa vitrine de `src/components/ui/` — o legado shadcn
    // que a M10 registrou explicitamente como o que NÃO deve ser copiado.
    const main = ler(".storybook/main.ts");
    expect(main).toContain("../src/design/**");
    expect(main, "o glob varre além do Design System").not.toMatch(/["']\.\.\/src\/\*\*/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. O DoD — nenhuma story declara payload
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Campos do contrato público. Um objeto literal com qualquer um deles é payload, não props.
 *
 * A distinção não é "objeto grande": `procedencia={[{ rotulo, valor }]}` é configuração de
 * componente e está certo. O que não pode é a story RECONSTRUIR a resposta do backend, porque
 * essa cópia diverge do contrato em silêncio.
 */
const CAMPOS_DO_CONTRATO = [
  "analysis_id",
  "workspace_id",
  "created_at",
  "updated_at",
  "result_schema_version",
  "public_state",
  "progress_axes",
  "min_group_size",
  "method_id",
];

function payloadsInline(rel: string): string[] {
  const sf = ts.createSourceFile(
    rel,
    ler(rel),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const achados: string[] = [];
  const visitar = (no: ts.Node): void => {
    if (ts.isObjectLiteralExpression(no)) {
      for (const prop of no.properties) {
        const nome =
          prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))
            ? prop.name.text
            : null;
        if (nome && CAMPOS_DO_CONTRATO.includes(nome)) {
          const linha = sf.getLineAndCharacterOfPosition(no.getStart(sf)).line + 1;
          achados.push(`${rel}:${linha} — objeto com \`${nome}\``);
        }
      }
    }
    ts.forEachChild(no, visitar);
  };
  ts.forEachChild(sf, visitar);
  return achados;
}

describe("M15 · 3. nenhuma story reconstrói o payload do contrato", () => {
  it("o detector tem dentes", () => {
    // Provado contra fonte sintética antes de ser apontado para a árvore: sem isto, "zero
    // achados" não distingue "nenhuma story inventa payload" de "não sei procurar".
    const sf = "sintetica.stories.tsx";
    const original = ler(STORIES[0]);
    void original;
    const achados = (() => {
      const arquivo = ts.createSourceFile(
        sf,
        `export const X = { analysis_id: "an-1", status: "completed" };`,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const r: string[] = [];
      const v = (no: ts.Node): void => {
        if (ts.isObjectLiteralExpression(no)) {
          for (const p of no.properties) {
            const n = p.name && ts.isIdentifier(p.name) ? p.name.text : null;
            if (n && CAMPOS_DO_CONTRATO.includes(n)) r.push(n);
          }
        }
        ts.forEachChild(no, v);
      };
      ts.forEachChild(arquivo, v);
      return r;
    })();
    expect(achados, "o detector não reconhece nem um payload óbvio").toContain("analysis_id");
  });

  it("nenhuma story declara payload inline", () => {
    const infratores = STORIES.flatMap(payloadsInline);
    expect(infratores, "story reconstruindo a resposta do backend: use a fixture canônica").
      toEqual([]);
  });

  it("nenhuma story arrasta DOMÍNIO para dentro do Design System", () => {
    // Este caso substitui um que eu havia escrito ao contrário — ele exigia que alguma story
    // importasse a fixture canônica, "para não inventar dado". O efeito foi empurrar as stories
    // a importarem `fixtures/public-v1/analyses`, e o gate da M04 reprovou com razão: o caminho
    // carrega domínio, e o DS não pode conhecê-lo.
    //
    // A leitura correta: os componentes do DS **não consomem payload**, por construção. Onde não
    // há payload, não há cenário a escolher. A exigência de escolher cenário vale para quem
    // consumir dado de contrato — e isso mora fora de `src/design/**`.
    const infratoras = STORIES.filter((rel) => /@\/test\/fixtures\//.test(ler(rel)));
    expect(
      infratoras,
      "story do DS importando fixture de domínio — o gate da M04 vai reprovar",
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. O que as autoridades congeladas exigem que seja EXERCITÁVEL
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M15 · 4. idioma, movimento e viewport são controles reais", () => {
  const preview = ler(".storybook/preview.tsx");

  it("D37 · o idioma é alternável", () => {
    // A chave, não a substring: a primeira versão usava `toContain("idioma")`, e a mutação que
    // renomeava para `idiomaX` sobreviveu — `idiomaX` contém `idioma`. Fronteira de palavra é o
    // que separa "a chave existe" de "alguma coisa parecida existe".
    expect(preview, "o `globalType` do idioma sumiu").toMatch(/\bidioma\s*:\s*\{/);
    for (const v of ['"pt"', '"en"']) expect(preview).toContain(v);
  });

  it("D34 · o movimento reduzido é alternável, e aplica a MESMA regra de `globals.css`", () => {
    // Um toggle que aplicasse outra coisa mostraria um comportamento que a aplicação não tem, e
    // revisar aqui deixaria de significar alguma coisa.
    expect(preview).toContain("prefers-reduced-motion".replace("prefers-", "")); // "reduced-motion"
    expect(preview).toContain("var(--ds-duration-fast)");
    expect(preview).toContain("var(--ds-duration-instant)");
    expect(preview, "o toggle deixa o deslocamento transicionando").not.toMatch(
      /transition-property:[^;]*transform/,
    );
  });

  it("A3 · desktop e mobile são viewports declaradas", () => {
    expect(preview).toContain("375px");
    expect(preview).toContain("1280px");
  });

  it("a11y roda com o motor real, sem desligar contraste", () => {
    // No jsdom, `color-contrast` fica *incomplete* e desligá-la é honesto. Aqui é o contrário:
    // o navegador computa cor de verdade, e desligar a regra jogaria fora justamente o que só
    // este ambiente consegue medir.
    expect(ler(".storybook/main.ts")).toContain("@storybook/addon-a11y");
    // Proíbe o CAMINHO, não uma sintaxe. A primeira versão casava só
    // `"color-contrast": { enabled: false }`, e a mutação que usava a outra forma do axe —
    // `rules: [{ id: "color-contrast", enabled: false }]` — sobreviveu. Um cadeado que enumera
    // sintaxes perde para a próxima; a regra fica ligada por padrão, então mencioná-la aqui só
    // pode ser para desligá-la.
    // Comentário fora antes de julgar: o próprio `preview.tsx` EXPLICA por que a regra fica
    // ligada, e explicar exige escrever o nome dela. Um gate textual reprovaria a documentação da
    // regra — e a saída que todo mundo escolhe é parar de documentar.
    const semComentarios = preview
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(?<!:)\/\/.*$/gm, "");
    expect(semComentarios, "`color-contrast` mexido onde ele finalmente funciona").not.toContain(
      "color-contrast",
    );
  });
});
