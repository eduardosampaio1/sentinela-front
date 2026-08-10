// Cadeado arquitetural da fronteira canônica (Onda 6 E1, item 11).
//
// Prova, por varredura de código (comentários removidos), que src/lib/v1/** NÃO importa
// supabase/legado, NÃO cita vocabulário INTERNO (worker/engine/lease/job/…), NÃO tem base
// hardcoded (onrender) nem cor hardcoded. Escopo inicial: SÓ a área canônica nova.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const AQUI = dirname(fileURLToPath(import.meta.url)); // src/test/v1
const V1_DIR = join(AQUI, "..", "..", "lib", "v1"); // src/lib/v1

function listarTs(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...listarTs(p));
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** Remove comentários de bloco e de linha — sem comer `https://` dentro de string. */
function semComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// Vocabulário INTERNO que a jornada pública nunca pode referenciar em CÓDIGO.
const TOKENS_INTERNOS = /\b(worker|engine|lease|assignment|job|job_id|job_stage|attempt|execution_profile|upload_id|presigned|minio|redis)\b|tenant_id|\/internal\b/i;
const IMPORT_PROIBIDO = /(supabase|lib\/api\b|\/pages\/|legacy|onrender)/i;
const COR_HARDCODED = /#[0-9a-fA-F]{3,8}\b/;
const BASE_HARDCODED = /onrender|https?:\/\/[a-z0-9.-]*\.(com|io|app|dev)/i;


// ── MICROCORREÇÃO (M20) — `engine` tem DOIS significados, e o gate confundia os dois ─────────
//
// A regex original tratava `engine` como token puramente interno. Depois da BD07, o contrato
// público authoritative publica `progress_axes: ["engine", "analytics", "export", "final_result"]`
// — o mesmo texto virou **wire value público**. O gate passou a acusar o vocabulário que a Regra
// de Ouro nunca quis proibir.
//
// Isto NÃO é relaxamento. O conceito arquitetural interno continua proibido em qualquer forma:
// identificador, classe, import, propriedade. O que passa a ser permitido é o LITERAL, e só
// quando ele aparece acompanhado dos outros três eixos — o que caracteriza o vocabulário público
// e nenhum uso interno consegue forjar sem declarar o contrato inteiro.

const EIXOS_PUBLICOS = ["engine", "analytics", "export", "final_result"] as const;

/** O arquivo declara o vocabulário público de progresso? Exige os QUATRO eixos como literais. */
function declaraVocabularioDeProgresso(fonte: string): boolean {
  const sf = ts.createSourceFile("x.ts", fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const literais = new Set<string>();
  const v = (no: ts.Node): void => {
    if (ts.isStringLiteral(no) || ts.isLiteralTypeNode(no)) {
      const t = ts.isStringLiteral(no) ? no.text : (no.literal as ts.StringLiteral).text ?? "";
      if (t) literais.add(t);
    }
    ts.forEachChild(no, v);
  };
  ts.forEachChild(sf, v);
  return EIXOS_PUBLICOS.every((e) => literais.has(e));
}

/**
 * Ocorrências de token interno que a AST classifica como CONCEITO, não como wire value.
 *
 * Identificador, nome de classe, propriedade e caminho de import são o conceito interno vazando.
 *
 * NOTA de honestidade: o ramo do `import` é REDUNDANTE — o specifier também é `StringLiteral`, e o
 * ramo seguinte o pegaria de qualquer forma. A mutação que desliga este ramo SOBREVIVE, e não é
 * defeito: é defesa em profundidade, onde a mutação do primeiro guarda sempre sobrevive. Fica
 * explícito para que ninguém conclua, ao mutar, que imports não são cobertos.
 * String literal é dado — e só é perdoada quando o arquivo declara o vocabulário completo.
 */
function tokensInternosNoCodigo(fonte: string): string[] {
  const sf = ts.createSourceFile("x.ts", fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const vocabularioPublico = declaraVocabularioDeProgresso(fonte);
  const achados: string[] = [];

  const acusa = (texto: string, forma: string) => {
    const m = texto.match(TOKENS_INTERNOS);
    if (m) achados.push(`${forma}:${m[0]}`);
  };

  const v = (no: ts.Node): void => {
    if (ts.isIdentifier(no) || ts.isPrivateIdentifier(no)) acusa(no.text, "identificador");
    else if ((ts.isImportDeclaration(no) || ts.isExportDeclaration(no)) && no.moduleSpecifier && ts.isStringLiteral(no.moduleSpecifier)) {
      acusa(no.moduleSpecifier.text, "import");
    } else if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) {
      const ehEixo = (EIXOS_PUBLICOS as readonly string[]).includes(no.text);
      // O literal só é perdoado se for EIXO e o arquivo declarar o vocabulário inteiro.
      if (!(ehEixo && vocabularioPublico)) acusa(no.text, "literal");
    }
    ts.forEachChild(no, v);
  };
  ts.forEachChild(sf, v);
  return achados;
}

const arquivos = listarTs(V1_DIR);

describe("Cadeado — fronteira canônica src/lib/v1/**", () => {
  it("o próprio cadeado tem dentes (sanidade dos matchers)", () => {
    expect(TOKENS_INTERNOS.test("const worker = getWorker()")).toBe(true);
    expect(TOKENS_INTERNOS.test("scope.workspaceId")).toBe(false); // workspace != worker
    expect(semComentarios("code // worker\nx").includes("worker")).toBe(false);
    expect(semComentarios("https://host/x").includes("https://host")).toBe(true);
    expect(IMPORT_PROIBIDO.test('from "@/lib/supabase"')).toBe(true);
    expect(COR_HARDCODED.test("color: #0af")).toBe(true);
  });

  it("varre um conjunto real de arquivos (não passa a vazio)", () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(9);
    expect(arquivos.some((f) => f.endsWith("client.ts"))).toBe(true);
    expect(arquivos.some((f) => f.endsWith("public-v1.types.ts"))).toBe(true);
  });

  it("nenhum arquivo cita vocabulário INTERNO em código", () => {
    for (const arq of arquivos) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      const achados = tokensInternosNoCodigo(codigo);
      expect(achados, `${arq}: conceito interno vazou para o código canônico`).toEqual([]);
    }
  });

  it("a microcorreção distingue WIRE VALUE público de CONCEITO interno", () => {
    // Permitido — o literal do eixo, num arquivo que declara o vocabulário inteiro.
    const publico = `export type A = "engine" | "analytics" | "export" | "final_result";`;
    expect(tokensInternosNoCodigo(publico)).toEqual([]);

    // Proibido — as formas em que o CONCEITO interno reaparece. Nenhuma delas passa, mesmo num
    // arquivo que declare o vocabulário público: o literal é perdoado, o conceito nunca.
    //
    // LACUNA CONHECIDA, herdada da regra original e NÃO ampliada aqui: `TOKENS_INTERNOS` usa ``,
    // então `getEngine` / `engineClient` (camelCase) nunca foram detectados — antes ou depois
    // desta microcorreção. Ampliar a cobertura fugiria do escopo autorizado, que era distinguir
    // wire value de conceito. Fica registrado como dívida do cadeado.
    for (const interno of [
      'const engine = obter();',
      'class Engine {}',
      'import { x } from "@/engine/core";',
      'const o = { engine: 1 };',
    ]) {
      expect(
        tokensInternosNoCodigo(publico + String.fromCharCode(10) + interno),
        `conceito interno passou: ${interno}`,
      ).not.toEqual([]);
    }
  });

  it("`engine` FORA do vocabulário de progresso não ganha passe livre", () => {
    // O literal solto continua proibido: sem os outros três eixos, não há vocabulário público a
    // representar — é o conceito interno escrito como string.
    expect(tokensInternosNoCodigo('const x = "engine";')).not.toEqual([]);
    expect(tokensInternosNoCodigo('type T = "engine" | "analytics";')).not.toEqual([]);
    // E os demais tokens internos seguem proibidos como literal, mesmo com o vocabulário presente.
    const comVocab = `type A = "engine" | "analytics" | "export" | "final_result"; const w = "worker";`;
    expect(tokensInternosNoCodigo(comVocab)).not.toEqual([]);
  });

  it("nenhum import de supabase/legado/onrender", () => {
    for (const arq of arquivos) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      for (const [, spec] of codigo.matchAll(/from\s+["']([^"']+)["']/g)) {
        expect(IMPORT_PROIBIDO.test(spec), `${arq}: import proibido "${spec}"`).toBe(false);
      }
    }
  });

  it("nenhuma base hardcoded (fail-explicit no env) nem cor hardcoded", () => {
    for (const arq of arquivos) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      expect(BASE_HARDCODED.test(codigo), `${arq}: base hardcoded`).toBe(false);
      expect(COR_HARDCODED.test(codigo), `${arq}: cor hardcoded`).toBe(false);
    }
  });

  // Codex E1 R1, achado 2: o barrel não pode arrastar o seam de auth/Supabase para todo consumidor.
  it("o barrel index.ts NÃO re-exporta defaultClient nem importa o seam de auth", () => {
    const idx = semComentarios(readFileSync(join(V1_DIR, "index.ts"), "utf8"));
    expect(idx, "barrel re-exporta ./defaultClient (arrasta auth/Supabase)").not.toMatch(/from\s+["']\.\/defaultClient["']/);
    expect(idx.includes("@/lib/auth"), "barrel importa @/lib/auth").toBe(false);
  });
});
