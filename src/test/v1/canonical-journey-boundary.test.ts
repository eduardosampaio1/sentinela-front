// Cadeados da JORNADA canônica (Onda 6 E3, item 24). Varre src/features/canonical-analysis/** (sem
// comentários, EXCLUINDO testes) contra os padrões proibidos pelo backend-first. AST/import-graph
// via texto — não grep cego: comentários removidos + regex ancoradas + teeth abaixo.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const AQUI = dirname(fileURLToPath(import.meta.url));
const FEATURE = join(AQUI, "..", "..", "features", "canonical-analysis");

function listar(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...listar(p));
    else if ((p.endsWith(".ts") || p.endsWith(".tsx")) && !/\.test\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

function semComentarios(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// 1-3,7: materialização do dataset / hash / record_count no navegador.
const MATERIALIZACAO = /\bFileReader\b|\.readAs[A-Za-z]*\(|\.arrayBuffer\(|\.text\(|\bJSON\.parse\b|crypto\.subtle|\.readAsBinaryString/;
// 6-7: fallback legado / SSE / vocabulário interno.
const LEGADO_OU_INTERNO = /@\/lib\/api\b|@\/lib\/supabase|\bEventSource\b|text\/event-stream|\bjob_stage\b|\bexecution_profile\b|\bjob_id\b|\bworker\b|\bengine\b|\blease\b|\/interpret\b|quick-scan/;
// 8: barra de progresso com valor (percentual inventado).
const PROGRESSO = /<Progress[\s>]/;
// 10: detalhe cru do problem+json na UI.
const DETALHE_CRU = /\.detail\b/;
// 12: persistência do dataset/identidade em storage do navegador.
const STORAGE = /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/;
// 13: cor hardcoded em arquivo novo.
const COR = /#[0-9a-fA-F]{3,8}\b/;

const arquivos = listar(FEATURE);

describe("Cadeado — jornada canônica (backend-first)", () => {
  it("os matchers têm dentes (sanidade)", () => {
    expect(MATERIALIZACAO.test("f.arrayBuffer()")).toBe(true);
    expect(MATERIALIZACAO.test("new FileReader()")).toBe(true);
    expect(LEGADO_OU_INTERNO.test('from "@/lib/api"')).toBe(true);
    expect(LEGADO_OU_INTERNO.test("new EventSource(x)")).toBe(true);
    expect(LEGADO_OU_INTERNO.test("scope.workspaceId")).toBe(false); // workspace != worker
    expect(PROGRESSO.test("<Progress value={80} />")).toBe(true);
    expect(STORAGE.test("localStorage.setItem()")).toBe(true);
    expect(semComentarios("x // FileReader\n").includes("FileReader")).toBe(false);
  });

  it("varre arquivos reais da feature (não passa a vazio)", () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(6);
    expect(arquivos.some((f) => f.endsWith("UploadStep.tsx"))).toBe(true);
  });

  for (const [nome, re] of [
    ["materialização do dataset (FileReader/.text/.arrayBuffer/JSON.parse/hash)", MATERIALIZACAO],
    ["fallback legado / SSE / vocabulário interno", LEGADO_OU_INTERNO],
    ["barra de progresso com valor (% inventado)", PROGRESSO],
    ["detalhe cru do problem+json", DETALHE_CRU],
    ["storage do navegador (dataset/identidade)", STORAGE],
    ["cor hardcoded", COR],
  ] as const) {
    it(`nenhum arquivo viola: ${nome}`, () => {
      for (const arq of arquivos) {
        const codigo = semComentarios(readFileSync(arq, "utf8"));
        const m = codigo.match(re);
        expect(m, `${arq}: violação "${m?.[0]}"`).toBeNull();
      }
    });
  }
});
