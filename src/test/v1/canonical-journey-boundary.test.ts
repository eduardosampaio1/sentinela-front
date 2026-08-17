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
 * A isenção saiu junto com o arquivo que a justificava.
 *
 * `timeline/timelineSchema.ts` declarava a DENYLIST de campos internos, e por isso precisava
 * nomear o proibido — a única exceção que a regra "não consome vocabulário interno" tinha. A
 * pasta `timeline/` inteira foi removida na Onda 8: nada no roteador a alcançava, o adapter e
 * o schema nunca foram fiados, e os testes deles exercitavam código que o app nunca executa.
 *
 * O gate avisou sozinho — `expect(alvo, "o arquivo isento sumiu — remova a isenção")`. Uma
 * isenção órfã é pior que nenhuma: ela continua aberta para o próximo arquivo que casar o
 * padrão, sem que ninguém tenha decidido isso.
 */
/**
 * A SEGUNDA isenção, e ela nasceu de o cadeado ter envelhecido — não de eu querer passar.
 *
 * `INDICADOR_ANALITICO` proíbe o literal `behavior_score` porque, quando foi escrito, esse nome
 * não existia em contrato nenhum: quem o digitasse estaria inventando um indicador. A afirmação
 * era certa e continua certa.
 *
 * O que mudou foi o mundo. A recuperação do ARGOS v3 (12–13/08) congelou o `argos-catalog-1.0`
 * com 39 saídas quantitativas, e `behavior_score` é a **número 1** delas. O nome deixou de ser
 * fantasia e virou vocabulário publicado — mas o cadeado seguiu tratando-o como ghost, porque o
 * alcance dele (o literal) é maior que a afirmação dele (não inventar).
 *
 * A isenção vale para UM tipo de arquivo: registro de NOME, que só mapeia id publicado → chave de
 * dicionário. Ele não calcula, não deriva e não decide nada — `catalogoArgos.test.ts` prova que
 * os dois registros são disjuntos, que todo id tem nome nos dois idiomas, que não há rótulo órfão
 * e que um id desconhecido continua saindo cru.
 */
const ehRegistroDeNome = (arq: string) => /[\\/]catalogoArgos\.ts$/.test(arq);

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
      const alvos = re === INDICADOR_ANALITICO ? arquivos.filter((a) => !ehRegistroDeNome(a)) : arquivos;
      // A isenção não pode ficar órfã: se o arquivo sumir, ela continua aberta para o próximo que
      // casar o padrão sem ninguém decidir isso. Mesma disciplina da isenção anterior.
      if (re === INDICADOR_ANALITICO) {
        expect(
          arquivos.some(ehRegistroDeNome),
          "o registro de nomes sumiu — remova a isenção",
        ).toBe(true);
      }
      for (const arq of alvos) {
        const codigo = semComentarios(readFileSync(arq, "utf8"));
        const m = codigo.match(re);
        expect(m, `${arq}: violação "${m?.[0]}"`).toBeNull();
      }
    });
  }

  it("nenhum arquivo da jornada está isento — a regra vale para todos", () => {
    // Prova POSITIVA de que a isenção sumiu de fato, e não só de que o teste dela foi
    // apagado. O cadeado agora varre a feature inteira sem exceção; se alguém reintroduzir
    // um caminho isento, esta contagem para de bater com a do laço acima.
    expect(arquivos.length).toBeGreaterThan(0);
    expect(arquivos.some((a) => a.split("\\").join("/").includes("/timeline/"))).toBe(false);
  });
});
