// Cadeados BACKEND FIRST da E5 (item 18). Varrem a feature canônica (sem comentários, sem testes)
// e impedem que o resultado analítico seja fabricado/recalculado no navegador.
//
// Não é grep cego: matchers ancorados + prova de dentes + import-graph (quem PODE conhecer o shape).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const AQUI = dirname(fileURLToPath(import.meta.url));
const FEATURE = join(AQUI, "..", "..", "features", "canonical-analysis");
const RESULT_DIR = join(FEATURE, "result");

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

const arquivos = listar(FEATURE);
/** Componentes = tudo que renderiza (ui/), onde NENHUMA aritmética analítica pode existir. */
const componentes = arquivos.filter((f) => f.includes(`${join("canonical-analysis", "ui")}`));
/** Só estes podem conhecer o shape provisório do payload. */
const PODEM_CONHECER_SHAPE = ["validator.ts", "adapter.ts", "provisionalSchema.ts"];

// 1-2: aritmética analítica / Math usado para criar score ou percentual não contratado.
const ARITMETICA_ANALITICA = /\*\s*100\b|\/\s*100\b|Math\.(round|max|min|abs|pow|sqrt|log)\s*\(|\breduce\s*\(/;
// 7-8: veredito/priorização no navegador.
const VEREDITO_OU_PRIORIZACAO = /\bverdict\b|\bseverity\b|\bpriorit(y|ize|ized)\b|\.sort\s*\(/i;
// 10: data de análise criada no cliente.
const DATA_LOCAL = /new Date\(\s*\)|Date\.now\s*\(/;
// 11: zero como substituto de ausência.
const ZERO_PARA_AUSENCIA = /\?\?\s*0\b|\|\|\s*0\b/;
// 12-13: origem proibida do resultado.
const ORIGEM_PROIBIDA = /@\/lib\/api\b|@\/lib\/supabase|supabase|\/rest\/v1|localStorage|indexedDB/;
// 14: progresso percentual inventado.
const PROGRESSO = /<Progress[\s>]|progressPercent|loadingProgress/;

describe("Cadeado BACKEND FIRST — resultado (E5)", () => {
  it("os matchers têm dentes (sanidade)", () => {
    expect(ARITMETICA_ANALITICA.test("const pct = valor * 100")).toBe(true);
    expect(ARITMETICA_ANALITICA.test("Math.round(x)")).toBe(true);
    expect(ARITMETICA_ANALITICA.test("items.reduce((a, b) => a + b, 0)")).toBe(true);
    expect(ARITMETICA_ANALITICA.test("const total = view.totalRecords")).toBe(false);
    expect(VEREDITO_OU_PRIORIZACAO.test("const verdict = 'bad'")).toBe(true);
    expect(VEREDITO_OU_PRIORIZACAO.test("recs.sort((a,b)=>b.p-a.p)")).toBe(true);
    expect(DATA_LOCAL.test("analyzed_at: new Date()")).toBe(true);
    expect(DATA_LOCAL.test("new Date(view.analyzedAt)")).toBe(false); // formatar data RECEBIDA é OK
    expect(ZERO_PARA_AUSENCIA.test("valor ?? 0")).toBe(true);
    expect(ZERO_PARA_AUSENCIA.test("valor ?? null")).toBe(false);
    expect(ORIGEM_PROIBIDA.test('from "@/lib/api"')).toBe(true);
    expect(PROGRESSO.test("<Progress value={50} />")).toBe(true);
  });

  it("varre arquivos reais (não passa a vazio)", () => {
    expect(arquivos.some((f) => f.endsWith("adapter.ts"))).toBe(true);
    expect(componentes.some((f) => f.endsWith("ResultPage.tsx"))).toBe(true);
    expect(componentes.length).toBeGreaterThanOrEqual(5);
  });

  it("1-2: NENHUM componente faz aritmética analítica (só o adapter formata)", () => {
    for (const arq of componentes) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      const m = codigo.match(ARITMETICA_ANALITICA);
      expect(m, `${arq}: aritmética analítica em componente "${m?.[0]}"`).toBeNull();
    }
  });

  it("3: só validator/adapter/schema conhecem o SHAPE do payload (view model é livre)", () => {
    // O que se proíbe é conhecer o PAYLOAD BRUTO: o literal do schema, o import do shape
    // provisional e o acesso a `.result` cru. Ler o VIEW MODEL (v.indicators, item.availability)
    // é o contrato de saída do adapter — legítimo e esperado no componente.
    const SHAPE_BRUTO = [
      "provisional-analysis-result-v1",
      "provisionalSchema",
      "ProvisionalResult",
      "ProvisionalIndicator",
    ];
    const ACESSO_RESULT_CRU = /\.data\.result\b|\bpublico\.result\b|\.result\.indicators\b|\bresult\.summary\b/;
    for (const arq of arquivos) {
      const base = arq.split(/[\\/]/).pop() as string;
      if (PODEM_CONHECER_SHAPE.includes(base)) continue;
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      for (const marca of SHAPE_BRUTO) {
        expect(codigo.includes(marca), `${arq}: conhece o shape provisório (${marca})`).toBe(false);
      }
      const m = codigo.match(ACESSO_RESULT_CRU);
      expect(m, `${arq}: acessa o payload bruto "${m?.[0]}"`).toBeNull();
    }
  });

  it("3b: o cadeado do shape tem dentes", () => {
    const SHAPE = /provisional-analysis-result-v1|provisionalSchema|ProvisionalResult|ProvisionalIndicator/;
    const CRU = /\.data\.result\b|\bpublico\.result\b|\.result\.indicators\b|\bresult\.summary\b/;
    expect(SHAPE.test('import type { ProvisionalResult } from "./provisionalSchema"')).toBe(true);
    expect(SHAPE.test('if (payload.schema === "provisional-analysis-result-v1")')).toBe(true);
    expect(SHAPE.test("const x = view.indicators")).toBe(false); // view model é livre
    expect(CRU.test("resultado.data.result.indicators")).toBe(true);
    expect(CRU.test("adaptado.view.indicators")).toBe(false);
  });

  it("4: todo indicador do descriptor tem sourceField (rastreável ao backend)", async () => {
    const { INDICATOR_DESCRIPTORS } = await import("@/features/canonical-analysis/result/descriptors");
    const ids = Object.keys(INDICATOR_DESCRIPTORS);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const d = INDICATOR_DESCRIPTORS[id];
      expect(d.sourceField, `${id} sem sourceField`).toBeTruthy();
      expect(d.labelKey).toContain(id);
      expect(d.descriptionKey).toContain(id);
    }
  });

  it("7-8: nenhum veredito/severidade/priorização no navegador", () => {
    for (const arq of arquivos) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      const m = codigo.match(VEREDITO_OU_PRIORIZACAO);
      expect(m, `${arq}: veredito/priorização local "${m?.[0]}"`).toBeNull();
    }
  });

  it("10: data de análise nunca criada no cliente", () => {
    for (const arq of arquivos) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      const m = codigo.match(DATA_LOCAL);
      expect(m, `${arq}: data fabricada no cliente "${m?.[0]}"`).toBeNull();
    }
  });

  it("11: zero nunca substitui ausência na fronteira do resultado", () => {
    for (const arq of listar(RESULT_DIR)) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      const m = codigo.match(ZERO_PARA_AUSENCIA);
      expect(m, `${arq}: ausência virando zero "${m?.[0]}"`).toBeNull();
    }
  });

  it("12-13: resultado nunca vem de Supabase/banco/storage/endpoint legado", () => {
    for (const arq of arquivos) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      const m = codigo.match(ORIGEM_PROIBIDA);
      expect(m, `${arq}: origem proibida "${m?.[0]}"`).toBeNull();
    }
  });

  it("9/14: sem progresso percentual inventado", () => {
    for (const arq of arquivos) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      expect(codigo.match(PROGRESSO), `${arq}: progresso inventado`).toBeNull();
    }
  });

  it("15: adapter é a fronteira ÚNICA (nenhum outro módulo importa o validator)", () => {
    for (const arq of arquivos) {
      const base = arq.split(/[\\/]/).pop() as string;
      if (base === "adapter.ts" || base === "validator.ts") continue;
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      expect(codigo.includes("./validator"), `${arq}: importa o validator direto`).toBe(false);
      expect(codigo.includes("result/validator"), `${arq}: importa o validator direto`).toBe(false);
    }
  });

  it("fixtures PROVISÓRIAS nunca entram no código de produção da feature", () => {
    for (const arq of arquivos) {
      const codigo = semComentarios(readFileSync(arq, "utf8"));
      expect(codigo.includes("test/fixtures"), `${arq}: fixture importada em código de produção`).toBe(false);
    }
  });
});
