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
// E4-4: cursor OPACO decodificado/derivado localmente (offset, base64, split…).
const CURSOR_DECODE = /\batob\s*\(|parseInt\s*\(\s*[a-zA-Z]*[Cc]ursor|Number\s*\(\s*[a-zA-Z]*[Cc]ursor|[Cc]ursor\.(split|slice|substring|substr|charAt|replace|indexOf|match|padStart)\b/;
// E4-8: indicador analítico inventado no histórico (fora do escopo até E5).
const INDICADOR_ANALITICO = /\bverdict\b|\bdrift\b|\bconfidence\b|\brecommendation\b|\bguardrail\b|behavior_score|tokens_used|risk_score/i;
// E6-6: mutation NUNCA re-tenta automaticamente (retry de mutation só por ação explícita do usuário).
const MUTATION_AUTO_RETRY = /retry:\s*true/;

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
    expect(CURSOR_DECODE.test("atob(cursor)")).toBe(true);
    expect(CURSOR_DECODE.test("cursor.split(':')")).toBe(true);
    expect(CURSOR_DECODE.test("setCursor(next)")).toBe(false); // repassar o cursor opaco é OK
    expect(INDICADOR_ANALITICO.test("const verdict = 1")).toBe(true);
    expect(INDICADOR_ANALITICO.test("result_available")).toBe(false); // campo contratado != indicador
    expect(MUTATION_AUTO_RETRY.test("useMutation({ retry: true })")).toBe(true);
    expect(MUTATION_AUTO_RETRY.test("retry: false")).toBe(false);
    expect(semComentarios("x // FileReader\n").includes("FileReader")).toBe(false);
  });

  it("varre arquivos reais da feature (não passa a vazio)", () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(6);
    expect(arquivos.some((f) => f.endsWith("UploadStep.tsx"))).toBe(true);
    expect(arquivos.some((f) => f.endsWith("AnalysesListPage.tsx"))).toBe(true); // E4 no escopo
  });

  it("E4: a listagem NÃO consulta resultado/status por linha (sem N+1)", () => {
    const lista = arquivos.find((f) => f.endsWith("AnalysesListPage.tsx"));
    expect(lista).toBeTruthy();
    const codigo = semComentarios(readFileSync(lista as string, "utf8"));
    for (const proibido of ["getResult", "getStatus", "useAnalysisStatus", "useAnalysisResult"]) {
      expect(codigo.includes(proibido), `AnalysesListPage: N+1 via ${proibido}`).toBe(false);
    }
  });

/**
 * Exceção ESCOPADA, com o mesmo formato da `PODEM_CONHECER_SHAPE` da E5: um arquivo,
 * nomeado, com o motivo.
 *
 * `timeline/timelineSchema.ts` contém a DENYLIST de campos internos — ela existe para
 * RECUSÁ-LOS, não para consumi-los. Um cadeado que proíbe nomear o proibido torna
 * impossível escrever a defesa, que é o oposto do que ele protege.
 *
 * O invariante real ("a feature canônica não CONSOME vocabulário interno") continua
 * valendo para este arquivo e é provado logo abaixo, por outra via: ele só declara.
 */
const SO_DECLARA_A_DENYLIST = "timeline/timelineSchema.ts";

function isento(arquivo: string, nome: string): boolean {
  return (
    nome.includes("vocabulário interno") &&
    arquivo.split("\\").join("/").endsWith(SO_DECLARA_A_DENYLIST)
  );
}

  for (const [nome, re] of [
    ["materialização do dataset (FileReader/.text/.arrayBuffer/JSON.parse/hash)", MATERIALIZACAO],
    ["fallback legado / SSE / vocabulário interno", LEGADO_OU_INTERNO],
    ["barra de progresso com valor (% inventado)", PROGRESSO],
    ["detalhe cru do problem+json", DETALHE_CRU],
    ["storage do navegador (dataset/identidade)", STORAGE],
    ["cor hardcoded", COR],
    ["cursor opaco decodificado/derivado localmente", CURSOR_DECODE],
    ["indicador analítico inventado no histórico", INDICADOR_ANALITICO],
    ["mutation com auto-retry (retry: true)", MUTATION_AUTO_RETRY],
  ] as const) {
    it(`nenhum arquivo viola: ${nome}`, () => {
      for (const arq of arquivos) {
        if (isento(arq, nome)) continue;
        const codigo = semComentarios(readFileSync(arq, "utf8"));
        const m = codigo.match(re);
        expect(m, `${arq}: violação "${m?.[0]}"`).toBeNull();
      }
    });
  }

  it("o arquivo isento SÓ declara — nenhum corpo executável", () => {
    // É o que substitui a regra geral para ele. Uma denylist é dado; se este arquivo
    // ganhar lógica, ele deixa de ser dado e a isenção deixa de valer.
    const alvo = arquivos.find((a) => a.split("\\").join("/").endsWith(SO_DECLARA_A_DENYLIST));
    expect(alvo, "o arquivo isento sumiu — remova a isenção").toBeTruthy();
    const codigo = semComentarios(readFileSync(alvo as string, "utf8"));
    // A regex ABAIXO já foi escrita com bytes 0x08 (backspace) no lugar de `\b`.
    // Ela não casava `function`, `class`, `if (` nem `for (` — só o `=>` da
    // alternância funcionava. Um cadeado que não detecta o que diz detectar é pior
    // que nenhum: ele responde a pergunta errada em verde.
    //
    // Os dois `expect` seguintes são a prova de que ela funciona AGORA: um alvo
    // sintético com corpo executável precisa casar, senão a asserção de cima passa
    // por vacuidade.
    const CORPO_EXECUTAVEL = /\bfunction\b|=>|\bclass\b|\bif\s*\(|\bfor\s*\(/;
    expect('export function x() {}').toMatch(CORPO_EXECUTAVEL);
    expect('if (a) { b(); }').toMatch(CORPO_EXECUTAVEL);
    expect('export const A = [1, 2];').not.toMatch(CORPO_EXECUTAVEL);
    expect(codigo).not.toMatch(CORPO_EXECUTAVEL);
  });

  it("a isenção é de UM arquivo e de UMA regra", () => {
    // Contraprova: se a isenção crescesse para outro arquivo ou outra regra, ela
    // deixaria de ser exceção e viraria buraco.
    expect(isento("x/timeline/timelineSchema.ts", "fallback legado / SSE / vocabulário interno")).toBe(true);
    expect(isento("x/timeline/adapter.ts", "fallback legado / SSE / vocabulário interno")).toBe(false);
    expect(isento("x/timeline/timelineSchema.ts", "cor hardcoded")).toBe(false);
  });
});
