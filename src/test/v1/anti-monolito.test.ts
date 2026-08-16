// M07 — o gate ANTI-MONÓLITO: a regra da casa deixa de ser frase e vira catraca.
//
// ## A regra
//
// *"Acima de 1.000 linhas bloqueia fechamento."* Ela existia como texto, e texto não reprova nada:
// `LandingPage` (1.215) e `AionPage` (1.180) a violavam no dia em que foi escrita e continuaram
// violando por ondas inteiras, sem que ninguém precisasse decidir nada.
//
// ## O que este gate faz — e o que NÃO faz
//
// Ele **não decompõe** os monólitos. O plano é explícito: decompor é missão própria (D17). O que
// ele faz é separar duas coisas que estavam misturadas e que têm respostas opostas:
//
//   • **dívida existente** — três arquivos já acima do limite. Ficam, medidos, e só encolhem.
//   • **regressão nova** — qualquer outro arquivo que passe de 1.000. Reprova na hora.
//
// Sem essa separação, só há duas saídas ruins: reprovar tudo (e o gate é desligado na primeira
// semana) ou permitir tudo acima do limite (e o limite não existe).
//
// ## Por que a baseline tem TETO, e não só nome
//
// Nome sozinho é permissão vitalícia: `LandingPage` poderia ir a 3.000 linhas sem o gate piscar.
// Com teto congelado, a dívida vira catraca — ela desce e nunca sobe. E quando desce, o teto tem
// de descer junto **no mesmo commit**, senão sobra folga silenciosa para crescer de volta até o
// número velho, que é como uma catraca se transforma em teatro.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");

/** A regra da casa, em número. */
const LIMITE = 1000;

const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");

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

/**
 * Conta linhas físicas, exatamente como `wc -l`.
 *
 * A régua importa tanto quanto o número: os valores 1.215 e 1.180 que o plano cita saíram de
 * `wc -l`, e uma medida diferente (linhas sem comentário, linhas sem branco) produziria uma
 * baseline **incomparável** com a que está documentada — o gate pareceria calibrado e estaria
 * medindo outra coisa.
 */
export function contarLinhas(conteudo: string): number {
  const partes = conteudo.split("\n");
  return partes[partes.length - 1] === "" ? partes.length - 1 : partes.length;
}

interface Divida {
  teto: number;
  motivo: string;
}

/**
 * DÍVIDA DECLARADA — os arquivos que já nasceram acima do limite.
 *
 * NOMINAL, e com teto. Exceção por pasta (`src/features/**`, `src/test/**`) daria passe livre a
 * todo arquivo futuro que caísse ali: é assim que dívida declarada vira permissão sem que ninguém
 * tenha decidido isso.
 */
// AQUI FICAVAM `LandingPage.tsx` (1215 → 1182 → **52**) e `AionPage.tsx` (1180 → 1167 → **51**).
//
// Os dois entraram nesta lista na M07 com o motivo *"decompor é missão própria (D17)"*, e ficaram
// nela por dez missões. A M47 fez a D17: os dois viraram nove e dez arquivos, nenhum acima de 240
// linhas, e o caso `arquivo que caiu abaixo do limite SAI da lista` os expulsou daqui — que é
// exatamente o desfecho que este gate foi escrito para provocar.
//
// A M46 já tinha arrancado deles os blocos de token, e não por virtude: a catraca recusou as ~44
// linhas de comentário que as correções de a11y exigiam. Uma dívida que impede a própria correção
// é uma dívida que acabou de anunciar o prazo.
const BASELINE: ReadonlyMap<string, Divida> = new Map([
  [
    "src/test/fixtures/canonical-result/massasV2.ts",
    {
      teto: 1035,
      motivo:
        "massa de teste do analysis-result-v2 — dados, não lógica de produto. O plano não previu " +
        "este arquivo e nenhuma missão o decompõe; entra nominalmente para que o número não cresça " +
        "sem alguém decidir, em vez de sair por exceção de pasta",
    },
  ],
]);

const MEDIDOS = arquivos(SRC).map((p) => ({
  rel: posix(p),
  linhas: contarLinhas(readFileSync(p, "utf-8")),
}));

const ACIMA = MEDIDOS.filter((x) => x.linhas > LIMITE);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. A régua
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M07 · 1. a régua mede o que diz medir", () => {
  it("conta linhas físicas como `wc -l`", () => {
    expect(contarLinhas("a\nb\nc\n")).toBe(3);
    expect(contarLinhas("a\nb\nc")).toBe(3); // sem newline final: `wc -l` diria 2, mas a linha existe
    expect(contarLinhas("")).toBe(0);
    expect(contarLinhas("\n")).toBe(1);
  });

  it("reproduz os números que o plano documenta", () => {
    // Se este caso quebrar, ou os arquivos mudaram (e a baseline precisa acompanhar) ou a régua
    // mudou (e a baseline inteira virou incomparável). Os dois exigem alguém olhar.
    const landing = MEDIDOS.find((x) => x.rel === "src/features/landing/LandingPage.tsx");
    const aion = MEDIDOS.find((x) => x.rel === "src/features/aion/AionPage.tsx");
    // M47 — os dois monólitos do plano DEIXARAM de ser monólitos.
    //
    // O plano documentava 1215 e 1180. A M46 baixou para 1182 e 1167 extraindo os tokens; a M47
    // decompôs os dois de vez. Hoje são as composições, e nada mais.
    //
    // Os números continuam EXATOS aqui de propósito. Se a régua mudar (contar linhas de outro
    // jeito), estes dois valores saem do lugar e a baseline inteira vira incomparável — que é a
    // falha que este caso existe para pegar, e ela não depende de o arquivo ser grande.
    expect(landing?.linhas, "LandingPage divergiu do número do plano").toBe(52);
    expect(aion?.linhas, "AionPage divergiu do número do plano").toBe(51);

    // E a régua tem de continuar reconhecendo um arquivo GRANDE, senão ela só foi verificada
    // contra arquivos pequenos e a comparação com a baseline não vale.
    const massas = MEDIDOS.find((x) => x.rel === "src/test/fixtures/canonical-result/massasV2.ts");
    expect(massas?.linhas, "massasV2 divergiu — a régua mudou?").toBe(1035);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Anti-vacuidade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M07 · 2. o gate não passa por ausência de alvo", () => {
  it("a varredura enxerga a árvore", () => {
    expect(MEDIDOS.length, "nenhum arquivo varrido — a raiz está errada?").toBeGreaterThan(100);
  });

  it("o limite é o da regra da casa, não um número frouxo", () => {
    expect(LIMITE).toBe(1000);
  });

  it("a baseline não está vazia — senão não há dívida sendo medida", () => {
    expect(BASELINE.size).toBeGreaterThan(0);
  });

  it("todo arquivo da baseline EXISTE no disco", () => {
    // Uma entrada apontando para arquivo que não existe é folga invisível: ela nunca reprova, e
    // se alguém criar um arquivo com aquele caminho ele já nasce dispensado do limite.
    const fantasmas = [...BASELINE.keys()].filter(
      (k) => !MEDIDOS.some((m) => m.rel === k),
    );
    expect(fantasmas, "baseline aponta para arquivo inexistente").toEqual([]);
  });

  it("cada entrada da baseline carrega o motivo escrito", () => {
    for (const [arquivo, d] of BASELINE) {
      expect(d.motivo.length, `${arquivo}: dívida sem justificativa`).toBeGreaterThan(40);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Regressão nova — o que o gate existe para impedir
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M07 · 3. nenhum monólito NOVO", () => {
  it(`nenhum arquivo fora da baseline passa de ${LIMITE} linhas`, () => {
    const novos = ACIMA.filter((x) => !BASELINE.has(x.rel)).map(
      (x) => `${x.rel} — ${x.linhas} linhas`,
    );
    expect(novos, `monólito novo: acima de ${LIMITE} linhas bloqueia fechamento`).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. A catraca — a dívida desce e nunca sobe
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M07 · 4. a dívida legada só pode encolher", () => {
  it("nenhum arquivo da baseline passou do seu teto", () => {
    const cresceram = [...BASELINE.entries()]
      .map(([rel, d]) => ({ rel, teto: d.teto, atual: MEDIDOS.find((m) => m.rel === rel)?.linhas }))
      .filter((x) => x.atual !== undefined && x.atual > x.teto)
      .map((x) => `${x.rel} — ${x.atual} linhas, teto ${x.teto}`);
    expect(cresceram, "monólito legado cresceu; a dívida só pode encolher").toEqual([]);
  });

  it("quando um arquivo encolhe, o teto desce no MESMO commit", () => {
    // Sem este caso a catraca é teatro: um arquivo que caísse de 1.215 para 1.100 deixaria 115
    // linhas de folga silenciosa, e ele poderia voltar ao tamanho antigo sem nada ficar vermelho.
    const comFolga = [...BASELINE.entries()]
      .map(([rel, d]) => ({ rel, teto: d.teto, atual: MEDIDOS.find((m) => m.rel === rel)?.linhas }))
      .filter((x) => x.atual !== undefined && x.atual < x.teto)
      .map((x) => `${x.rel} — encolheu para ${x.atual}; baixe o teto de ${x.teto} para ${x.atual}`);
    expect(comFolga, "teto desatualizado deixa folga para o monólito crescer de volta").toEqual([]);
  });

  it("arquivo que caiu abaixo do limite SAI da lista", () => {
    // Dívida resolvida tem de desaparecer da lista no mesmo commit. Uma entrada que sobrevive ao
    // problema vira permissão para quem chegar depois com o mesmo caminho.
    const resolvidos = [...BASELINE.keys()]
      .map((rel) => ({ rel, atual: MEDIDOS.find((m) => m.rel === rel)?.linhas }))
      .filter((x) => x.atual !== undefined && x.atual <= LIMITE)
      .map((x) => `${x.rel} — ${x.atual} linhas, já está dentro do limite: remova da BASELINE`);
    expect(resolvidos, "dívida resolvida continua declarada").toEqual([]);
  });

  it("a baseline cobre TODOS os arquivos que hoje estão acima do limite", () => {
    // O outro lado do caso 3: se um arquivo acima do limite não estivesse na baseline nem fosse
    // acusado como novo, ele estaria fora dos dois caminhos — e o gate reportaria verde.
    expect(ACIMA.map((x) => x.rel).sort()).toEqual([...BASELINE.keys()].sort());
  });
});
