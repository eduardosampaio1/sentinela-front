// M05 — analisador da FRONTEIRA DO MOCK: matéria de teste não vaza para o produto.
//
// ## O defeito que isto impede
//
// Mock que vaza não quebra nada — é justamente esse o problema. A tela monta, o número aparece,
// a demo funciona, e ninguém descobre que aquilo nunca veio do backend. Este programa já viu o
// caso concreto: um console que mostrava massa sintética como se fosse medição real, e a única
// razão de alguém ter notado foi uma auditoria, não uma falha.
//
// O vazamento tem duas portas, e as duas estão aqui:
//
//   • **import** — um componente importa `@/test/msw/handlers` ou `msw` direto e passa a servir
//     dado de teste em produção;
//   • **identificador** — o componente não importa nada, mas carrega `mockAnalises` embutido.
//     Nenhum grafo de import pega isso; só olhar os nomes pega.
//
// ## Por que AST, e não grep
//
// A regra precisa ser EXPLICADA onde ela vale, e explicar exige escrever a palavra proibida. Um
// gate textual reprovaria o comentário `// nenhum mock entra aqui`, e a saída que todo mundo
// escolhe é parar de documentar. Comentário não é nó de AST, então some do julgamento de graça.
//
// Grep também já provou ser cego nesta casa por outros motivos: alias de import escapa, e um byte
// NUL no fonte faz o arquivo inteiro virar "binário" e sair da varredura sem avisar.
//
// ## Por que o analisador é separado do teste
//
// Mesma razão da M04: se os dentes morassem no teste, eles só existiriam enquanto a árvore real
// tivesse alvos. Separado, o teste prova primeiro que o analisador acusa fontes sintéticas — os
// dentes deixam de depender de a pasta estar povoada — e só depois o aplica à árvore.

import ts from "typescript";

export type TipoDeVazamento = "import" | "identificador";

export interface Vazamento {
  arquivo: string;
  linha: number;
  tipo: TipoDeVazamento;
  detalhe: string;
}

/**
 * Especificadores de import que apontam para MATÉRIA DE TESTE.
 *
 * O plano escreveu `src/mocks/**`. Essa pasta não existe: neste repositório a matéria de teste
 * mora em `src/test/msw/` e `src/test/fixtures/`. O gate segue a árvore real, não o nome que o
 * plano supôs — um gate apontado para pasta inexistente passa por vacuidade, que é o modo
 * preferido de um gate morrer sem ninguém perceber.
 *
 * `src/mocks/` continua na lista de propósito: se alguém criar a pasta amanhã, ela já nasce
 * coberta em vez de nascer fora do alcance.
 */
const MATERIA_DE_TESTE: readonly RegExp[] = [
  /^msw(\/|$)/,
  /(^|\/)mocks?(\/|$)/,
  /(^|\/)__mocks__(\/|$)/,
  /(^|\/)test(\/|$)/,
  /(^|\/)fixtures?(\/|$)/,
  /^@faker-js\//,
];

/** Um especificador de import aponta para matéria de teste? */
export function ehMateriaDeTeste(especificador: string): boolean {
  return MATERIA_DE_TESTE.some((r) => r.test(especificador));
}

/**
 * As quatro famílias que o plano nomeia: `mock`, `fixture`, `scenario`, `MSW`.
 *
 * Exatamente essas quatro, sem inflar. `stub` e `seed` seriam defensáveis, mas não estão no
 * escopo autorizado e um gate que cresce por conta própria deixa de ser o que foi aprovado.
 */
const PALAVRAS_DE_TESTE: readonly string[] = [
  "mock",
  "mocks",
  "mocked",
  "fixture",
  "fixtures",
  "scenario",
  "scenarios",
  "msw",
];

/**
 * Casa a palavra dentro de um identificador composto.
 *
 * `mockAnalises`, `MOCK_LISTA`, `dados-fixture` e `useScenario` são todos o mesmo problema escrito
 * de quatro jeitos. A quebra por camelCase, `-` e `_` normaliza os quatro antes de comparar.
 */
export function temPalavraDeTeste(texto: string): string | null {
  const alvo = texto
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .toLowerCase();
  const partes = alvo.split(/\s+/);
  for (const palavra of PALAVRAS_DE_TESTE) {
    if (partes.includes(palavra)) return palavra;
  }
  return null;
}

/**
 * Analisa UM arquivo de produto e devolve os vazamentos de matéria de teste.
 *
 * Comentário nunca é visitado — a AST não o expõe como nó, e é de propósito: é onde a regra é
 * explicada. Literal de string também fica de fora: o plano proíbe IDENTIFICADOR, e uma copy que
 * diga "scenario" para a pessoa lendo a tela não é um vazamento de mock.
 */
export function analisarVazamentoDeMock(arquivo: string, fonte: string): Vazamento[] {
  const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const vazamentos: Vazamento[] = [];
  const linhaDe = (no: ts.Node) => sf.getLineAndCharacterOfPosition(no.getStart(sf)).line + 1;

  const visitar = (no: ts.Node): void => {
    const especificador =
      (ts.isImportDeclaration(no) || ts.isExportDeclaration(no)) &&
      no.moduleSpecifier &&
      ts.isStringLiteral(no.moduleSpecifier)
        ? no.moduleSpecifier.text
        : ts.isCallExpression(no) &&
            no.expression.kind === ts.SyntaxKind.ImportKeyword &&
            no.arguments[0] &&
            ts.isStringLiteral(no.arguments[0])
          ? (no.arguments[0] as ts.StringLiteral).text
          : null;

    if (especificador !== null) {
      if (ehMateriaDeTeste(especificador)) {
        vazamentos.push({
          arquivo,
          linha: linhaDe(no),
          tipo: "import",
          detalhe: `importa matéria de teste: \`${especificador}\``,
        });
      }
      // O especificador já foi julgado como caminho. Não reprocessar como identificador —
      // senão `@/test/msw/handlers` seria contado duas vezes pela mesma falta.
      return;
    }

    if (ts.isIdentifier(no) || ts.isPrivateIdentifier(no)) {
      const achado = temPalavraDeTeste(no.text);
      if (achado) {
        vazamentos.push({
          arquivo,
          linha: linhaDe(no),
          tipo: "identificador",
          detalhe: `identificador \`${no.text}\` carrega \`${achado}\``,
        });
      }
    } else if (ts.isJsxAttribute(no) && ts.isIdentifier(no.name)) {
      const achado = temPalavraDeTeste(no.name.text);
      if (achado) {
        vazamentos.push({
          arquivo,
          linha: linhaDe(no),
          tipo: "identificador",
          detalhe: `atributo JSX \`${no.name.text}\` carrega \`${achado}\``,
        });
      }
    }

    ts.forEachChild(no, visitar);
  };

  ts.forEachChild(sf, visitar);
  return vazamentos;
}
