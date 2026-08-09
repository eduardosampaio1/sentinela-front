// M06 — analisador da FRONTEIRA DA BIBLIOTECA: biblioteca externa não é API pública de página.
//
// ## O defeito que isto impede
//
// Quando uma página importa Radix direto, a biblioteca deixa de ser detalhe do Design System e
// vira contrato da página. O efeito não aparece no dia em que acontece — aparece na troca. Trocar
// Radix por outra coisa, ou mudar a política de foco, deixa de ser uma edição em `src/design/**`
// e vira uma varredura por todas as telas, cada uma com seu jeito de ter usado. É o mesmo defeito
// que a M08 matou no nível do token: dois vocabulários para a mesma coisa, e o segundo nasce
// invisível.
//
// ## Por que AST, e não grep
//
// Mesma razão da M04 e da M05, e as duas já pagaram por ela: comentário não é nó de AST, então a
// regra pode ser explicada onde ela vale sem se autoacusar. E o gate precisa ver `import()`
// dinâmico, que é o caminho preferido de quem quer contornar um gate de import estático.
//
// ## O que este analisador NÃO decide
//
// Ele não sabe quem tem licença. Devolve todo import de biblioteca de apresentação, com arquivo e
// linha, e **o teste** decide quem podia. Essa separação é o que permite ao gate distinguir três
// coisas que um analisador com lista embutida confundiria: o que é permitido (`src/design/**`), o
// que é dívida declarada e medida (`src/components/ui/**`), e o que é violação nova.

import ts from "typescript";

export interface ImportDeBiblioteca {
  arquivo: string;
  linha: number;
  especificador: string;
  dinamico: boolean;
}

/**
 * As bibliotecas que o plano nomeia: `@radix-ui/*`, `recharts`, `motion`.
 *
 * `framer-motion` entra junto porque é o **mesmo pacote com o nome antigo** — proibir só o nome
 * novo deixaria a porta velha aberta, e é exatamente assim que uma regra vira decoração.
 *
 * Nenhuma delas é proibida por ser ruim. São proibidas FORA do Design System porque são decisões
 * de apresentação, e decisão de apresentação tem um dono só.
 */
const BIBLIOTECAS_DE_APRESENTACAO: readonly RegExp[] = [
  /^@radix-ui\//,
  /^recharts(\/|$)/,
  /^motion(\/|$)/,
  /^framer-motion(\/|$)/,
];

/** O especificador aponta para uma biblioteca de apresentação? */
export function ehBibliotecaDeApresentacao(especificador: string): boolean {
  return BIBLIOTECAS_DE_APRESENTACAO.some((r) => r.test(especificador));
}

/**
 * Devolve TODOS os imports de biblioteca de apresentação de um arquivo — sem julgar licença.
 *
 * Comentário nunca é visitado: a AST não o expõe como nó.
 */
export function analisarImportesDeBiblioteca(
  arquivo: string,
  fonte: string,
): ImportDeBiblioteca[] {
  const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const achados: ImportDeBiblioteca[] = [];
  const linhaDe = (no: ts.Node) => sf.getLineAndCharacterOfPosition(no.getStart(sf)).line + 1;

  const visitar = (no: ts.Node): void => {
    let especificador: string | null = null;
    let dinamico = false;

    if (
      (ts.isImportDeclaration(no) || ts.isExportDeclaration(no)) &&
      no.moduleSpecifier &&
      ts.isStringLiteral(no.moduleSpecifier)
    ) {
      especificador = no.moduleSpecifier.text;
    } else if (
      ts.isCallExpression(no) &&
      no.expression.kind === ts.SyntaxKind.ImportKeyword &&
      no.arguments[0] &&
      ts.isStringLiteral(no.arguments[0])
    ) {
      especificador = (no.arguments[0] as ts.StringLiteral).text;
      dinamico = true;
    }

    if (especificador !== null && ehBibliotecaDeApresentacao(especificador)) {
      achados.push({ arquivo, linha: linhaDe(no), especificador, dinamico });
    }

    ts.forEachChild(no, visitar);
  };

  ts.forEachChild(sf, visitar);
  return achados;
}
