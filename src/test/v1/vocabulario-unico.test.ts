// M46 — a mesma coisa não pode ter dois nomes em duas telas do mesmo produto.
//
// ## O defeito
//
// A M45.4 encontrou três conceitos batizados duas vezes: a visão viva (ANL-01) dizia uma palavra e
// a superfície congelada do resultado (RES-01) dizia outra, para a MESMA medida.
//
//   série temporal ....... "Time series" / "Séries"   ×   "Over time" / "Ao longo do tempo"
//   agregado do resto .... "Other" / "Demais"         ×   "Other labels" / "Outros rótulos"
//   pacote de export ..... "Export"                   ×   "Export package" / "Pacote de export"
//
// Quem lê as duas telas não vê duas palavras: vê **duas coisas**. É a mesma família de defeito que
// o programa persegue em `ausência ≠ indisponibilidade`, aplicada ao vocabulário.
//
// ## Por que RES-01 cedeu
//
// O Blueprint §4.6 congela RES-01: correção sim, feature não. Renomear rótulo para eliminar
// divergência é correção — e a escolha de qual lado cede não é simétrica: ANL-01 é a leitura VIVA,
// RES-01 serve deep link antigo e tem aposentadoria prevista. O vocabulário que sobrevive é o do
// que sobrevive.
//
// ## Por que um gate, e não só a correção
//
// A correção sozinha dura até a próxima pessoa editar um dos dois lados. Este gate lê os dois
// bundles e reprova se os pares divergirem de novo — em QUALQUER dos dois idiomas.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");

type Bundle = Record<string, unknown>;

const bundle = (locale: "en" | "pt"): Bundle =>
  JSON.parse(readFileSync(resolve(RAIZ, `src/i18n/${locale}.json`), "utf-8")) as Bundle;

/** Caminho pontilhado dentro do bundle. Devolve `undefined` se algum degrau não existir. */
function ler(raiz: Bundle, caminho: string): string | undefined {
  let atual: unknown = raiz;
  for (const passo of caminho.split(".")) {
    if (typeof atual !== "object" || atual === null) return undefined;
    atual = (atual as Record<string, unknown>)[passo];
  }
  return typeof atual === "string" ? atual : undefined;
}

/**
 * Os conceitos que existem NAS DUAS superfícies e precisam do mesmo nome.
 *
 * A lista é curta de propósito: ela cobre o que a M45.4 provou divergir, não tudo que se parece.
 * Um par novo aqui é uma decisão de vocabulário, e decisão de vocabulário se toma por escrito.
 */
const PARES: readonly { conceito: string; viva: string; congelada: string }[] = [
  {
    conceito: "série temporal",
    viva: "canonicalAnalysis.analyticsView.series",
    congelada: "canonicalAnalysis.result.analytics.seriesTitle",
  },
  {
    conceito: "agregado do resto",
    viva: "canonicalAnalysis.analyticsView.other",
    congelada: "canonicalAnalysis.result.analytics.otherCount",
  },
  {
    conceito: "pacote de export",
    viva: "canonicalAnalysis.analyticsView.export",
    congelada: "canonicalAnalysis.result.analytics.exportTitle",
  },
];

describe("M46 · vocabulário único entre a visão viva e a superfície congelada", () => {
  for (const locale of ["en", "pt"] as const) {
    describe(locale, () => {
      const b = bundle(locale);

      it("as chaves dos dois lados existem — chave ausente vira comparação de undefined", () => {
        // O piso do INSTRUMENTO. Sem ele, uma chave renomeada faria os dois lados virarem
        // `undefined`, e `undefined === undefined` passaria: o gate declararia harmonia sobre
        // duas ausências.
        for (const p of PARES) {
          expect(ler(b, p.viva), `${locale}: chave viva sumiu — ${p.viva}`).toBeTypeOf("string");
          expect(ler(b, p.congelada), `${locale}: chave congelada sumiu — ${p.congelada}`).toBeTypeOf("string");
        }
      });

      for (const p of PARES) {
        it(`"${p.conceito}" tem UM nome`, () => {
          expect(
            ler(b, p.congelada),
            `${locale}: "${p.conceito}" aparece como "${ler(b, p.congelada)}" em RES-01 e ` +
              `"${ler(b, p.viva)}" em ANL-01. Quem lê as duas telas conclui que são duas medidas.`,
          ).toBe(ler(b, p.viva));
        });
      }
    });
  }
});
