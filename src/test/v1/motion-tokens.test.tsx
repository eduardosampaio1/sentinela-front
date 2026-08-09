// M09 — MOTION: o vocabulário congelado, o reduced motion real, e a catraca do timing literal.
//
// ## As três coisas que este gate protege
//
//   1. **O vocabulário é FROZEN** — cinco durações, quatro curvas, `spring-direct`. Não mais. Uma
//      sexta duração é a porta pela qual "congelado" deixa de significar alguma coisa.
//   2. **Reduced motion é COMPORTAMENTO, não documentação.** Era o defeito real encontrado nesta
//      missão: o bloco existia e fazia `transition-duration: 0.01ms` em `*` — o "desligar tudo"
//      que a D34 proíbe com essas palavras. Quem pedia menos movimento recebia menos INFORMAÇÃO.
//   3. **Timing literal não nasce em componente novo.** A dívida existente é medida; a nova
//      reprova.
//
// ## O que jsdom prova, e o que não prova
//
// jsdom não computa CSS: media query não é avaliada, e `motion-safe:`/`motion-reduce:` não mudam
// nada no DOM renderizado — as classes ficam lá, inertes. Então esta suíte separa dois tipos de
// prova, e diz qual é qual:
//
//   • **estrutura renderizada** — as classes `motion-*` existem no DOM real, e o rótulo textual
//     que assume sob reduced motion é um elemento de verdade. Isso jsdom prova.
//   • **regra CSS** — o conteúdo do bloco `@media (prefers-reduced-motion: reduce)`, lido do
//     arquivo. Não é o navegador aplicando; é a regra estando escrita como a D34 manda.
//
// Mesma honestidade que a M04 já precisou ter com contraste: jsdom não calcula, então o contraste
// é provado por aritmética sobre os valores declarados, não por `axe`.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "@/design/patterns/EstadosDeTela";

const RAIZ = resolve(__dirname, "../../..");
const TOKENS = readFileSync(resolve(RAIZ, "src/design/tokens/tokens.css"), "utf-8");
const GLOBALS = readFileSync(resolve(RAIZ, "src/styles/globals.css"), "utf-8");

/** Comentário fora: a regra precisa poder ser explicada onde ela vale. */
const semComentarios = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const TOKENS_LIMPO = semComentarios(TOKENS);

function valorDoToken(nome: string): string | null {
  const m = TOKENS_LIMPO.match(new RegExp(`--${nome}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. O vocabulário congelado — Constituição §5
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** Os valores exatos da Constituição. Divergir aqui é divergir da autoridade, não do gosto. */
const DURACOES: ReadonlyArray<readonly [string, string]> = [
  ["ds-duration-instant", "0ms"],
  ["ds-duration-fast", "120ms"],
  ["ds-duration-base", "200ms"],
  ["ds-duration-slow", "320ms"],
  ["ds-duration-deliberate", "480ms"],
];

const CURVAS: ReadonlyArray<readonly [string, string]> = [
  ["ds-easing-standard", "cubic-bezier(0.2, 0, 0, 1)"],
  ["ds-easing-enter", "cubic-bezier(0, 0, 0.2, 1)"],
  ["ds-easing-exit", "cubic-bezier(0.4, 0, 1, 1)"],
  ["ds-easing-emphasis", "cubic-bezier(0.2, 0, 0, 1.2)"],
];

describe("M09 · 1. o vocabulário de motion é o da Constituição", () => {
  for (const [nome, esperado] of DURACOES) {
    it(`\`${nome}\` vale ${esperado}`, () => {
      expect(valorDoToken(nome), `${nome} ausente ou divergente`).toBe(esperado);
    });
  }

  for (const [nome, esperado] of CURVAS) {
    it(`\`${nome}\` vale ${esperado}`, () => {
      expect(valorDoToken(nome), `${nome} ausente ou divergente`).toBe(esperado);
    });
  }

  it("`spring-direct` existe — manipulação direta tem papel próprio", () => {
    expect(valorDoToken("ds-spring-direct")).toBeTruthy();
  });

  it("🔒 são CINCO durações e QUATRO curvas — não mais", () => {
    // O caso que protege o congelamento. Uma sexta duração passaria despercebida por todos os
    // casos acima, que só olham o que já foi declarado.
    const duracoes = [...TOKENS_LIMPO.matchAll(/--ds-duration-[a-z-]+\s*:/g)].map((m) => m[0]);
    const curvas = [...TOKENS_LIMPO.matchAll(/--ds-easing-[a-z-]+\s*:/g)].map((m) => m[0]);
    expect(duracoes, `durações demais: ${duracoes.join(" ")}`).toHaveLength(5);
    expect(curvas, `curvas demais: ${curvas.join(" ")}`).toHaveLength(4);
  });

  it("o período do esqueleto respeita a regra de 1 Hz", () => {
    // Não é uma sexta duração: é outra grandeza, e a Constituição a restringe por regra própria
    // — "esqueleto não pulsa mais rápido que 1 Hz". A maior duração (480ms) pulsaria a ~2 Hz.
    const periodo = valorDoToken("ds-skeleton-pulse-period");
    expect(periodo, "período do esqueleto não declarado").toBeTruthy();
    const ms = Number(String(periodo).replace("ms", ""));
    expect(ms, "pulsa mais rápido que 1 Hz").toBeGreaterThanOrEqual(1000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Reduced motion — a regra CSS, lida do arquivo
// ═══════════════════════════════════════════════════════════════════════════════════════════

function blocoReducedMotion(): string {
  const limpo = semComentarios(GLOBALS);
  const i = limpo.indexOf("@media (prefers-reduced-motion: reduce)");
  expect(i, "não há bloco de prefers-reduced-motion").toBeGreaterThan(-1);
  // Recorte COM FIM: sem ele, a busca varreria o resto do arquivo e qualquer termo procurado
  // apareceria em outro lugar — o defeito que fez uma asserção da M24 passar sempre.
  const fim = limpo.indexOf("@media", i + 10);
  return limpo.slice(i, fim === -1 ? limpo.length : fim);
}

describe("M09 · 2. reduced motion preserva a informação e remove o deslocamento (D34)", () => {
  it("o bloco existe", () => {
    expect(blocoReducedMotion().length).toBeGreaterThan(50);
  });

  it("NÃO é 'desligar tudo' — o que carrega informação continua transicionando", () => {
    // A prova do defeito que esta missão corrigiu. `transition-property` restrito é o que separa
    // "removi o deslocamento" de "removi tudo": cor e opacidade seguem comunicando a mudança.
    const bloco = blocoReducedMotion();
    expect(bloco, "sem `transition-property`: volta a ser desligar tudo").toContain(
      "transition-property",
    );
    for (const prop of ["opacity", "color", "background-color", "border-color"]) {
      expect(bloco, `\`${prop}\` deixou de transicionar — a informação some junto`).toContain(prop);
    }
  });

  it("o deslocamento NÃO está na lista — transform e width valem no ato", () => {
    const propriedades = blocoReducedMotion().match(/transition-property\s*:([^;]+);/)?.[1] ?? "";
    for (const prop of ["transform", "width", "height", "translate", "margin"]) {
      expect(propriedades, `\`${prop}\` ainda desliza sob reduced motion`).not.toContain(prop);
    }
  });

  it("as durações do bloco vêm de TOKEN, não de literal", () => {
    // `0.01ms` era o literal da versão anterior. Um número aqui volta a ser uma decisão de motion
    // tomada fora do vocabulário.
    const bloco = blocoReducedMotion();
    expect(bloco).toContain("var(--ds-duration-fast)");
    expect(bloco).toContain("var(--ds-duration-instant)");
    expect(bloco, "timing literal dentro do próprio bloco de reduced motion").not.toMatch(
      /:\s*[\d.]+m?s\s*!/,
    );
  });

  it("o que pulsa para de pulsar — uma iteração", () => {
    expect(blocoReducedMotion()).toMatch(/animation-iteration-count\s*:\s*1/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Reduced motion — a estrutura renderizada, que jsdom prova de verdade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M09 · 3. o esqueleto entrega informação quando o movimento sai", () => {
  it("o pulso é condicionado a `motion-safe` — não pulsa para quem pediu menos movimento", () => {
    const { container } = render(<LoadingState rotulo="Carregando análises" />);
    const barras = container.querySelectorAll('[aria-hidden="true"]');
    expect(barras.length).toBeGreaterThan(0);
    for (const b of barras) {
      expect(b.getAttribute("class") ?? "", "esqueleto pulsa incondicionalmente").toContain(
        "motion-safe:animate-pulse",
      );
    }
  });

  it("o período do pulso vem do token, não de literal no componente", () => {
    const { container } = render(<LoadingState rotulo="Carregando" />);
    const barra = container.querySelector('[aria-hidden="true"]') as HTMLElement | null;
    expect(barra?.style.animationDuration).toContain("--ds-skeleton-pulse-period");
  });

  it("o rótulo textual assume quando o movimento é removido", () => {
    // A tabela D34: "esqueleto pulsa → estático, COM RÓTULO TEXTUAL". O rótulo é `sr-only` apenas
    // sob `motion-safe` — ou seja, ele fica VISÍVEL para quem pediu reduced motion.
    render(<LoadingState rotulo="Carregando análises" />);
    const visiveis = screen
      .getAllByText("Carregando análises")
      .map((e) => e.getAttribute("class") ?? "");
    expect(
      visiveis.some((c) => c.includes("motion-safe:sr-only")),
      "não há rótulo que apareça sob reduced motion",
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. A catraca do timing literal
// ═══════════════════════════════════════════════════════════════════════════════════════════

const PADRAO_TIMING =
  /\bduration-\[?\d+m?s\]?|\b\d+ms\b|cubic-bezier\s*\([^)]*\)|\bease-(?:in-out|out|in|linear)\b/g;

/**
 * DÍVIDA DECLARADA — timing literal que já existia, por arquivo.
 *
 * Nominal e COM CONTAGEM, pelo mesmo motivo da baseline da M07: nome sozinho é permissão
 * vitalícia. Com número, a dívida é catraca — e um caso reprova a folga se ela encolher sem o
 * número acompanhar no mesmo commit.
 *
 * Migrar estes 5 está fora do escopo da M09 (a missão veta migração em massa). O que a M09 fecha
 * é a porta: nenhum arquivo NOVO entra nesta lista.
 */
const DIVIDA_TIMING: ReadonlyMap<string, number> = new Map([
  ["src/components/ui/sheet.tsx", 1],
  ["src/features/aion/AionPage.tsx", 5],
  ["src/features/landing/LandingPage.tsx", 1],
  ["src/shared/states/LoadingState.tsx", 4],
  ["src/styles/globals.css", 13],
]);

import { readdirSync, statSync } from "node:fs";
import { extname, relative } from "node:path";

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = resolve(dir, e);
    if (statSync(p).isDirectory()) arquivos(p, acc);
    else if ([".ts", ".tsx", ".css"].includes(extname(p))) acc.push(p);
  }
  return acc;
}

const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");
const TOKENS_REL = "src/design/tokens/tokens.css";

const MEDIDO = arquivos(resolve(RAIZ, "src"))
  .map((p) => posix(p))
  .filter((rel) => !/\.(test|spec|stories)\./.test(rel) && !rel.startsWith("src/test/"))
  // `tokens.css` é a ÚNICA origem autorizada de valor literal — é o que ele é.
  .filter((rel) => rel !== TOKENS_REL)
  .map((rel) => ({
    rel,
    n: (semComentarios(readFileSync(resolve(RAIZ, rel), "utf-8")).match(PADRAO_TIMING) ?? []).length,
  }))
  .filter((x) => x.n > 0);

describe("M09 · 4. timing literal não nasce em componente novo", () => {
  it("o gate enxerga timing literal de verdade — a varredura não está vazia", () => {
    expect(MEDIDO.length, "nenhum literal encontrado: a detecção quebrou?").toBeGreaterThan(0);
  });

  it("nenhum arquivo NOVO com timing literal — o DoD do plano", () => {
    const novos = MEDIDO.filter((x) => !DIVIDA_TIMING.has(x.rel)).map(
      (x) => `${x.rel} — ${x.n} literal(is); use os tokens de motion`,
    );
    expect(novos, "timing literal fora do vocabulário canônico").toEqual([]);
  });

  it("a dívida não cresceu em nenhum arquivo", () => {
    const cresceram = MEDIDO.filter((x) => {
      const teto = DIVIDA_TIMING.get(x.rel);
      return teto !== undefined && x.n > teto;
    }).map((x) => `${x.rel} — ${x.n} literais, teto ${DIVIDA_TIMING.get(x.rel)}`);
    expect(cresceram, "a dívida de timing só pode encolher").toEqual([]);
  });

  it("quando um arquivo encolhe, o número desce no MESMO commit", () => {
    const comFolga = [...DIVIDA_TIMING.entries()]
      .map(([rel, teto]) => ({ rel, teto, atual: MEDIDO.find((m) => m.rel === rel)?.n ?? 0 }))
      .filter((x) => x.atual < x.teto)
      .map((x) => `${x.rel} — caiu para ${x.atual}; baixe o teto de ${x.teto}`);
    expect(comFolga, "teto desatualizado deixa folga para o literal voltar").toEqual([]);
  });

  it("o DESIGN SYSTEM está limpo — zero timing literal", () => {
    // A Constituição §3: "Valor literal em componente é defeito, não estilo." No DS não há dívida
    // declarada: ele é a origem do vocabulário, e um literal aqui contradiz o próprio arquivo.
    const noDesign = MEDIDO.filter((x) => x.rel.startsWith("src/design/"));
    expect(noDesign.map((x) => `${x.rel} — ${x.n}`), "literal dentro do Design System").toEqual([]);
  });
});
