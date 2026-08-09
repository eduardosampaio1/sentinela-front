// M08 — VOCABULÁRIO ÚNICO DE TOKENS.
//
// O que este gate impede, e por que a auditoria sozinha não impediria:
//
// O repositório chegou a ter TRÊS vocabulários visuais. `src/index.css` (morto, removido na M03)
// e `src/styles/tokens.css` (82 propriedades, ZERO consumidores) declaravam papéis que
// `styles/globals.css` também declarava — com valores DIFERENTES. `#070C18` e `220 50% 5%` são
// dois fundos distintos, e a tela renderizava um ou outro conforme o componente tivesse nascido
// num sistema ou no outro.
//
// Nada disso quebrava teste. Token duplicado não é erro de compilação: é uma cor levemente
// diferente que ninguém mede a olho. Por isso a defesa precisa ser um gate, não um combinado.
//
// A regra é uma só: **valor literal de token existe em um lugar; o resto é `var()`.**

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HARDCODE_DECLARADO, HARDCODE_TOTAL } from "./hardcodeDeclarado";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");
const CANONICO = resolve(SRC, "design/tokens/tokens.css");
const IGNORADAS = new Set(["node_modules", "dist", "coverage"]);

function arquivos(dir: string, ok: (p: string) => boolean, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (IGNORADAS.has(e)) continue;
    const p = resolve(dir, e);
    if (statSync(p).isDirectory()) arquivos(p, ok, acc);
    else if (ok(p)) acc.push(p);
  }
  return acc;
}

const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");

/** Remove comentários CSS — o cabeçalho canônico CITA nomes de token ao explicar as regras, e
 *  contar citação como declaração faria a documentação violar a própria regra. */
const semComentariosCss = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** `--nome: valor;` de nível de folha de estilo. */
const DECLARACAO = /(--[a-z0-9-]+)\s*:\s*([^;}]+)[;}]/g;

const COR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(\s*\d/;

/**
 * Conta ocorrências de cor literal por arquivo de PRODUTO.
 *
 * Comentário de bloco vira quebras de linha equivalentes em vez de sumir: apagá-lo desloca a
 * numeração e o gate reporta uma linha que não é a do defeito — o que faz a pessoa procurar no
 * lugar errado e desconfiar do gate, não do código.
 *
 * Teste e fixture ficam de fora: eles PRECISAM citar cor para provar contraste, e proibir isso
 * tornaria a prova impossível.
 */
function contarHardcode(): Record<string, number> {
  const alvos = arquivos(SRC, (p) => {
    const rel = posix(p);
    if (![".tsx", ".ts"].includes(extname(p))) return false;
    return !rel.includes("/test/") && !rel.includes(".test.") && !rel.includes("/e2e/");
  });
  const fora: Record<string, number> = {};
  for (const arquivo of alvos) {
    const texto = readFileSync(arquivo, "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, (b) => "\n".repeat((b.match(/\n/g) ?? []).length))
      .replace(/\/\/.*$/gm, "");
    const n = texto.split("\n").filter((l) => COR_LITERAL.test(l)).length;
    if (n > 0) fora[posix(arquivo)] = n;
  }
  return fora;
}

describe("M08 · vocabulário único de tokens", () => {
  it("existe exatamente UMA fonte canônica, e ela tem conteúdo", () => {
    const texto = semComentariosCss(readFileSync(CANONICO, "utf-8"));
    const decls = [...texto.matchAll(DECLARACAO)];
    // Sem este piso, esvaziar o arquivo canônico deixaria todos os casos abaixo verdes por
    // vacuidade — que é o modo preferido de um gate morrer sem ninguém perceber.
    expect(decls.length, "a fonte canônica está vazia").toBeGreaterThan(10);
    for (const [, nome] of decls) {
      expect(nome, `token canônico sem o prefixo do namespace: ${nome}`).toMatch(/^--ds-/);
    }
  });

  it("NENHUM outro CSS declara token com valor literal", () => {
    // O coração da missão. Um segundo arquivo com `--surface-base: 220 50% 6%` é exatamente o
    // defeito que existia — e é invisível para tsc, lint e para toda a suíte.
    const outros = arquivos(SRC, (p) => extname(p) === ".css" && p !== CANONICO);
    const infratores: string[] = [];
    for (const arquivo of outros) {
      const texto = semComentariosCss(readFileSync(arquivo, "utf-8"));
      for (const [, nome, valor] of texto.matchAll(DECLARACAO)) {
        if (!valor.trim().startsWith("var(")) {
          infratores.push(`${posix(arquivo)}: ${nome} = ${valor.trim()}`);
        }
      }
    }
    expect(
      infratores,
      "fora da fonte canônica, token só pode ser apelido (`var(--ds-…)`). " +
        "Valor próprio aqui é um segundo vocabulário nascendo.",
    ).toEqual([]);
  });

  it("todo apelido aponta para um papel que EXISTE no canônico", () => {
    // Apelido para token inexistente não quebra o build: `var(--ds-inexistente)` resolve para
    // vazio e a propriedade some. O elemento fica sem cor, e ninguém é avisado.
    const canonicos = new Set(
      [...semComentariosCss(readFileSync(CANONICO, "utf-8")).matchAll(DECLARACAO)].map((m) => m[1]),
    );
    const outros = arquivos(SRC, (p) => extname(p) === ".css" && p !== CANONICO);
    const quebrados: string[] = [];
    for (const arquivo of outros) {
      const texto = semComentariosCss(readFileSync(arquivo, "utf-8"));
      for (const [, nome, valor] of texto.matchAll(DECLARACAO)) {
        for (const [, alvo] of valor.matchAll(/var\(\s*(--ds-[a-z0-9-]+)/g)) {
          if (!canonicos.has(alvo)) quebrados.push(`${posix(arquivo)}: ${nome} → ${alvo}`);
        }
      }
    }
    expect(quebrados, "apelido apontando para papel que não existe no vocabulário canônico").toEqual([]);
  });

  it("nenhum ARQUIVO NOVO nasce com cor literal, e a dívida declarada não cresce", () => {
    // D35: valor literal em componente é defeito, não estilo — o piso é ZERO. O repositório está
    // a 406 ocorrências desse piso, e zerar isso aqui seria migrar 28 superfícies numa missão de
    // vocabulário, contra a ordem explícita de não migrar em massa.
    //
    // Então o gate mede duas coisas que valem desde já: arquivo fora da lista tem de ter ZERO, e
    // arquivo dentro dela não pode crescer.
    const atual = contarHardcode();

    const novos = Object.keys(atual).filter((f) => !(f in HARDCODE_DECLARADO));
    expect(
      novos,
      "cor literal em arquivo que não estava na dívida declarada. O valor vem do vocabulário " +
        "canônico, sempre — este é o gate de 'nenhum novo #hex nasce em componente'.",
    ).toEqual([]);

    const cresceram = Object.entries(atual)
      .filter(([f, n]) => f in HARDCODE_DECLARADO && n > HARDCODE_DECLARADO[f])
      .map(([f, n]) => `${f}: ${HARDCODE_DECLARADO[f]} → ${n}`);
    expect(cresceram, "a dívida de cor literal cresceu em arquivo já declarado").toEqual([]);

    const total = Object.values(atual).reduce((a, b) => a + b, 0);
    expect(
      total,
      `dívida total ${HARDCODE_TOTAL} → ${total}. Se encolheu, atualize HARDCODE_DECLARADO no ` +
        "MESMO commit: lista que não acompanha a dívida vira folclore.",
    ).toBe(HARDCODE_TOTAL);
  });

  it("o vocabulário legado é apelido, nunca dono — e a colisão de `--accent` está resolvida", () => {
    // Caso nomeado porque foi ele que obrigou o prefixo: o `--accent` do shadcn é uma SUPERFÍCIE
    // de item selecionado; o `accent` da Constituição é a COR DE AÇÃO. Num `:root` compartilhado
    // a última declaração venceria em silêncio e trocaria a cor de marca por um cinza-azulado.
    const globals = semComentariosCss(readFileSync(resolve(SRC, "styles/globals.css"), "utf-8"));
    const declaracoes = Object.fromEntries(
      [...globals.matchAll(DECLARACAO)].map((m) => [m[1], m[2].trim()]),
    );
    expect(declaracoes["--accent"]).toBe("var(--ds-surface-selected)");
    expect(declaracoes["--primary"]).toBe("var(--ds-accent)");
    // E os dois papéis continuam distintos no canônico.
    const canonico = semComentariosCss(readFileSync(CANONICO, "utf-8"));
    expect(canonico).toContain("--ds-accent:");
    expect(canonico).toContain("--ds-surface-selected:");
  });

  it("os arquivos dos vocabulários extintos não voltaram", () => {
    const css = arquivos(SRC, (p) => extname(p) === ".css").map(posix);
    expect(css).not.toContain("src/styles/tokens.css");
    expect(css).not.toContain("src/index.css");
    expect(css.sort()).toEqual(["src/design/tokens/tokens.css", "src/styles/globals.css"]);
  });
});
