// FREEZE — o vocabulário de ESTADOS do produto está congelado.
//
// ## O que este gate congela, e por que ele faltava
//
// O programa inteiro gira em torno de estados. As lições que mais custaram são todas sobre eles:
// `ausência ≠ indisponibilidade ≠ não medido`, `503 não vira "não existe"`, `retenção por
// privacidade não é falha`, `vazio ≠ erro ≠ carregando`. A M45 gastou oito tranches provando que
// cada superfície distingue os seus.
//
// E o VOCABULÁRIO em si — quais estados existem — nunca teve gate. Ele mora em
// `src/design/patterns/estados.ts` como três uniões de tipo, e um tipo não reprova: acrescentar
// `"paused"` ali compila, passa em tudo, e produz um `default` de `switch` renderizando a tela
// errada em silêncio. Foi assim que a M14 descobriu `needs_mapping` caindo no `default` do
// AnalysisPage — ver `feedback_maquina_de_estado_sem_consumidor`.
//
// ## Por que ler do ARQUIVO, e não redeclarar aqui
//
// Uma cópia da lista neste teste seria uma segunda fonte de verdade: as duas divergiriam, e a
// divergência é invisível porque as duas "passam". O gate extrai os membros do arquivo de origem e
// compara com a lista congelada. Se `estados.ts` mudar, isto reprova — que é o objetivo.
//
// ## O que ele NÃO faz
//
// Não afirma que cada estado é renderizado — isso é dos gates de jornada (`jornadaCanonica`), da
// matriz transversal (35 journeys) e das capturas com provador. Este congela a FRONTEIRA: nenhum
// estado entra ou sai do produto sem alguém decidir por escrito.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const ESTADOS = resolve(RAIZ, "src/design/patterns/estados.ts");
const CONTRATO = resolve(RAIZ, "src/lib/v1/contract/public-v1.types.ts");

/**
 * Os membros de uma união de tipo declarada como `export type Nome = | "a" | "b";`.
 *
 * Extrai do texto, e não do TypeScript: um tipo não existe em runtime, e importar o módulo daria
 * acesso a nada. O recorte vai do nome até o `;` que fecha — sem fim, um `slice` pegaria a união
 * seguinte e o gate mediria duas listas como se fossem uma (`feedback_gate_cego_por_recorte_e_escape`).
 */
function uniao(fonte: string, nome: string): string[] {
  const i = fonte.indexOf(`export type ${nome} =`);
  if (i < 0) return [];
  const fim = fonte.indexOf(";", i);
  if (fim < 0) return [];
  return [...fonte.slice(i, fim).matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

const patterns = readFileSync(ESTADOS, "utf-8");
const contrato = readFileSync(CONTRATO, "utf-8");

/**
 * O INVENTÁRIO CONGELADO.
 *
 * Cada nome aqui é uma tela, ou um pedaço de tela, que alguém desenhou e alguém mediu. Acrescentar
 * um membro sem acrescentar a linha correspondente aqui reprova — e é essa fricção que impede um
 * estado novo de nascer sem tela.
 */
const CONGELADO = {
  /** O ciclo de vida da análise, do contrato público. */
  EstadoPublico: [
    "preparing",
    "receiving",
    "queued",
    "running",
    "recovering",
    "needs_mapping",
    // A tela: `case "ready_to_submit"` em `AnalysisPage`, com o botão de submeter.
    // A prova: `AnalysisPage.e6.test.tsx` e `journey-proofs.test.tsx` submetem a partir dele.
    //
    // Ele nasceu de um defeito medido em homologação: `artifact_ready` respondia `preparing`, o
    // mesmo status de quem não mandou arquivo. O front escolhe a tela pelo status e mostrava
    // "adicionar dataset" para uma análise com o dataset canônico pronto — e o botão de submeter
    // vivia em `receiving`, onde submeter falha. ZERO das 6 análises do workspace virou job.
    "ready_to_submit",
    "completed",
    "failed",
  ],
  /** Os quatro eixos de progresso. `unavailable` ≠ `unknown` ≠ `withheld` — a distinção é o produto. */
  EstadoDeEixo: [
    "pending",
    "running",
    "ready",
    "partial",
    "withheld",
    "failed",
    "unknown",
    "unavailable",
    "preparing",
    "expired",
  ],
} as const;

/** O estado do componente analítico, que vive no contrato e não no Design System. */
const COMPONENTE_CONGELADO = ["ready", "partial", "withheld", "failed", "unknown"];

describe("FREEZE · o vocabulário de estados não muda em silêncio", () => {
  it("o extrator enxerga as uniões — senão tudo passa por vacuidade", () => {
    // O PISO DO INSTRUMENTO. Se `export type` virar `type` ou o arquivo for renomeado, as uniões
    // vêm vazias e `[] === []` aprova qualquer coisa. O programa já foi enganado por massa vazia
    // mais de uma vez; aqui a massa é o próprio vocabulário.
    for (const nome of Object.keys(CONGELADO)) {
      expect(uniao(patterns, nome).length, `união \`${nome}\` não foi extraída`).toBeGreaterThan(5);
    }
    expect(
      uniao(contrato, "AnalyticsComponentStatus").length,
      "união `AnalyticsComponentStatus` não foi extraída do contrato",
    ).toBeGreaterThan(3);
  });

  for (const [nome, esperado] of Object.entries(CONGELADO)) {
    it(`\`${nome}\` tem exatamente os ${esperado.length} estados congelados`, () => {
      expect(
        uniao(patterns, nome),
        `o vocabulário de \`${nome}\` mudou. Um estado NOVO precisa de tela, de prova e de uma ` +
          `linha nesta lista — nesta ordem. Um estado REMOVIDO precisa que ninguém mais o sirva.`,
      ).toEqual(esperado);
    });
  }

  it("`AnalyticsComponentStatus` tem exatamente os 5 estados congelados", () => {
    expect(
      uniao(contrato, "AnalyticsComponentStatus"),
      "o vocabulário do componente analítico mudou — e ele é do CONTRATO: mexer aqui é mexer no " +
        "que o produtor publica, não no que a tela desenha.",
    ).toEqual(COMPONENTE_CONGELADO);
  });

  it("os três vocabulários não se confundem entre si", () => {
    // `preparing` e `running` existem nos DOIS de propósito, e `failed` nos três. O resto não pode
    // vazar: um estado de eixo aparecendo no ciclo de vida da análise seria a mesma confusão que o
    // programa persegue em `ausência ≠ indisponibilidade`, um nível acima.
    const compartilhados = CONGELADO.EstadoPublico.filter((s) =>
      (CONGELADO.EstadoDeEixo as readonly string[]).includes(s),
    );
    expect(
      compartilhados.sort(),
      "um nome novo passou a existir nos dois vocabulários: ou é a mesma coisa (e então um dos " +
        "dois é redundante), ou são coisas diferentes com o mesmo nome (e aí a tela vai mentir)",
    ).toEqual(["failed", "preparing", "running"]);
  });
});
