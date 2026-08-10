// M11 — CONTRASTE dos tons de estado, medido.
//
// ## Por que este arquivo existe separado da suíte de componente
//
// A regra da missão é explícita: *contraste que dependa de CSS computado deve ser provado em
// ambiente capaz de medi-lo, e não declarado verde pelo jsdom*. O jsdom não resolve cascata nem
// calcula cor final, e por isso a regra `color-contrast` do `axe` fica desabilitada lá — habilitá-la
// devolveria verde sem ter medido nada.
//
// A saída não é adiar a prova: é medir o que **não** depende de CSS computado. Os valores estão
// declarados no vocabulário canônico, a cadeia de apelidos está declarada em `globals.css`, e o
// contraste WCAG é aritmética sobre esses valores. Este arquivo resolve a cadeia e calcula.
//
// O que ele NÃO prova, e por isso continua registrado como aberto: opacidade herdada, sobreposição
// e qualquer cor que só exista depois da cascata. Isso é prova de browser, e a Constituição já a
// exige na primeira superfície real.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  aparenciaDeEixo,
  aparenciaPublica,
  ESTADOS_DE_EIXO,
  ESTADOS_PUBLICOS,
} from "./estados";

const RAIZ = resolve(__dirname, "../../..");
const CANONICO = resolve(RAIZ, "src/design/tokens/tokens.css");
const GLOBALS = resolve(RAIZ, "src/styles/globals.css");

const semComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const DECL = /(--[a-z0-9-]+)\s*:\s*([^;}]+)[;}]/g;

function declaracoes(caminho: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const [, nome, valor] of semComentarios(readFileSync(caminho, "utf-8")).matchAll(DECL)) {
    m.set(nome, valor.trim());
  }
  return m;
}

/** Resolve `--x → var(--ds-y) → "220 50% 5%"` percorrendo a cadeia de apelidos. */
function resolver(nome: string, tabelas: Map<string, string>[], prof = 0): string {
  if (prof > 10) throw new Error(`cadeia de apelidos circular em ${nome}`);
  for (const t of tabelas) {
    const v = t.get(nome);
    if (v === undefined) continue;
    const alias = v.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/);
    return alias ? resolver(alias[1], tabelas, prof + 1) : v;
  }
  throw new Error(`token não declarado: ${nome}`);
}

/** `"220 50% 5%"` → luminância relativa WCAG. */
function luminancia(hsl: string): number {
  const m = hsl.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) throw new Error(`valor não é tripla HSL: "${hsl}"`);
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  const [r, g, b] = (
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x]
  ).map((v) => v + mm);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const TABELAS = [declaracoes(CANONICO), declaracoes(GLOBALS)];
const val = (nome: string) => resolver(nome, TABELAS);

/** Os tons que o `StatusBadge` realmente usa, e o fundo sobre o qual ele aparece. */
const TONS = {
  neutro: "--muted-foreground",
  positivo: "--success",
  atencao: "--warning",
  negativo: "--destructive",
} as const;

/** O badge vive sobre painel (`--card`) e sobre o fundo da aplicação (`--background`). */
const FUNDOS = ["--card", "--background"] as const;

/**
 * O ponto cego que a M32 fechou.
 *
 * Este arquivo mede cada tom contra `--card` e `--background`, e estava verde. O axe, na HOME-01,
 * acusou **4,12:1** no rótulo do chip neutro — porque a ênfase `neutro` pintava `bg-muted`, um
 * terceiro fundo que ninguém media. Acrescentar `--muted` à lista faria o gate medir um par que
 * o produto deixou de desenhar; a correção honesta é impedir que a ênfase invente fundo.
 *
 * Se um chip precisar de preenchimento novo, este caso reprova e o token entra em `FUNDOS`.
 */
describe("M32 · nenhuma ênfase de chip inventa fundo fora do que o gate mede", () => {
  it("as ênfases usam só `transparent`, `--card`/`--background` implícitos, ou `--secondary`", () => {
    const chip = readFileSync(resolve(__dirname, "../primitives/Chip.tsx"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/.*$/gm, " ");
    const fundos = [...chip.matchAll(/bg-([a-z-]+)/g)].map((m) => m[1]);
    // `secondary` é o sólido, e ele carrega `text-secondary-foreground` — par próprio, declarado.
    expect(fundos.filter((f) => !["transparent", "secondary"].includes(f))).toEqual([]);
  });
});

describe("M11 · contraste dos tons de estado, calculado dos valores declarados", () => {
  it("o instrumento está certo antes de acusar o código", () => {
    // Controle: branco sobre preto é 21:1, e branco sobre branco é 1:1. Sem isto, um erro na
    // fórmula produziria números plausíveis e o gate aprovaria qualquer coisa.
    expect(contraste("0 0% 100%", "0 0% 0%")).toBeCloseTo(21, 1);
    expect(contraste("0 0% 100%", "0 0% 100%")).toBeCloseTo(1, 5);
    // E a cadeia de apelidos resolve mesmo: `--muted-foreground` só existe via `--ds-text-muted`.
    expect(val("--muted-foreground")).toBe(val("--ds-text-muted"));
  });

  it("todo tom de estado alcança 4.5:1 como TEXTO, nos dois fundos", () => {
    // O rótulo do badge é texto pequeno. 4.5:1 é o mínimo de 1.4.3 — e V4 diz que contraste é
    // folga, não mínimo, então o número medido fica registrado na mensagem.
    const abaixo: string[] = [];
    for (const [tom, token] of Object.entries(TONS)) {
      for (const fundo of FUNDOS) {
        const r = contraste(val(token), val(fundo));
        if (r < 4.5) abaixo.push(`${tom} sobre ${fundo}: ${r.toFixed(2)}:1`);
      }
    }
    expect(abaixo, "tom de estado abaixo de 4.5:1 como texto").toEqual([]);
  });

  it("todo tom de estado alcança 3:1 como ELEMENTO NÃO-TEXTO (o ícone)", () => {
    // 1.4.11: o ícone é gráfico, e o piso dele é 3:1. Ele é o segundo canal de V6 — um ícone que
    // não se enxerga não é canal nenhum.
    const abaixo: string[] = [];
    for (const [tom, token] of Object.entries(TONS)) {
      for (const fundo of FUNDOS) {
        const r = contraste(val(token), val(fundo));
        if (r < 3) abaixo.push(`${tom} sobre ${fundo}: ${r.toFixed(2)}:1`);
      }
    }
    expect(abaixo, "ícone de estado abaixo de 3:1").toEqual([]);
  });

  it("onde dois TONS não se distinguem em cinza, a FORMA precisa distinguir", () => {
    // 🔎 **Medição, não suposição.** `positivo` (success) e `atencao` (warning) estão a **1,14:1**
    // um do outro — em escala de cinza são praticamente a mesma mancha. Esses valores vieram da
    // paleta viva e foram PRESERVADOS pela M08 sem alteração; mudá-los aqui seria regressão
    // visual em todo consumidor existente, e escolher cor nova exige a revisão que a Constituição
    // marca como PROVISIONAL até a primeira superfície real.
    //
    // A primeira versão deste caso exigia que todos os tons se distinguissem em cinza. Isso é
    // mais forte do que V6 pede e do que o sistema entrega. O que V6 exige é que o SIGNIFICADO
    // nunca dependa só de cor — e a garantia disso é a FORMA. Então a asserção passou a ser
    // exatamente essa, o que na prática cobre mais pares do que a anterior.
    const LIMIAR_CINZA = 1.2;
    const tons = Object.entries(TONS) as [keyof typeof TONS, string][];
    const indistinguiveis = new Set<string>();
    for (let i = 0; i < tons.length; i++) {
      for (let j = i + 1; j < tons.length; j++) {
        if (contraste(val(tons[i][1]), val(tons[j][1])) < LIMIAR_CINZA) {
          indistinguiveis.add([tons[i][0], tons[j][0]].sort().join("|"));
        }
      }
    }
    // O par medido precisa continuar sendo reconhecido — se um dia os valores mudarem e ele sumir
    // daqui, este caso deixaria de testar qualquer coisa e viraria verde por vacuidade.
    expect(
      [...indistinguiveis],
      "os tons deixaram de colidir em cinza — atualize a evidência em vez de manter o caso inerte",
    ).toEqual(["atencao|positivo"]);

    // E agora o que realmente importa: nenhum par de estados com tons indistinguíveis pode
    // compartilhar a forma.
    const todos = [
      ...ESTADOS_PUBLICOS.map((e) => ({ e: String(e), ...aparenciaPublica(e) })),
      ...ESTADOS_DE_EIXO.map((e) => ({ e: String(e), ...aparenciaDeEixo(e) })),
    ];
    const colisoes: string[] = [];
    for (let i = 0; i < todos.length; i++) {
      for (let j = i + 1; j < todos.length; j++) {
        const a = todos[i];
        const b = todos[j];
        if (a.tom === b.tom) continue; // já coberto pela prova estrutural do componente
        const par = [a.tom, b.tom].sort().join("|");
        if (indistinguiveis.has(par) && a.forma === b.forma) {
          colisoes.push(`${a.e} (${a.tom}) × ${b.e} (${b.tom}) — ambos "${a.forma}"`);
        }
      }
    }
    expect(
      colisoes,
      "tons indistinguíveis em cinza E mesma forma: o significado passou a depender só de cor",
    ).toEqual([]);
  });

  it("`atencao` e `negativo` NÃO são o mesmo tom — pedido de ação ≠ falha", () => {
    // O par que mais dói confundir: `needs_mapping` pede uma pessoa, `failed` diz que quebrou.
    expect(val(TONS.atencao)).not.toBe(val(TONS.negativo));
    expect(contraste(val(TONS.atencao), val(TONS.negativo))).toBeGreaterThan(1.2);
  });
});
