// Cadeado arquitetural da fronteira canônica (Onda 6 E1, item 11).
//
// Prova, por varredura de código (comentários removidos), que src/lib/v1/** NÃO importa
// supabase/legado, NÃO cita vocabulário INTERNO (worker/engine/lease/job/…), NÃO tem base
// hardcoded (onrender) nem cor hardcoded. Escopo inicial: SÓ a área canônica nova.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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
      const m = codigo.match(TOKENS_INTERNOS);
      expect(m, `${arq}: token interno "${m?.[0]}" vazou para o código canônico`).toBeNull();
    }
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
