// M04 — analisador da FRONTEIRA DO DESIGN SYSTEM.
//
// A regra da Constituição §3: o Design System **não conhece domínio e não acessa backend**.
// Primitive não sabe o que é Análise, Instância ou Workspace; nenhuma camada do DS importa query.
//
// ## Por que AST e não grep
//
// Grep encontra texto. Texto inclui comentário — e o comentário é justamente onde a regra precisa
// ser explicada. Um gate que reprova `// este primitive NÃO conhece Análise` obriga a documentação
// a violar a própria regra, e a saída todo mundo escolhe é parar de documentar.
//
// Grep também não distingue `import { x } from "@tanstack/react-query"` de uma string qualquer, e
// já custou caro nesta casa concluir "ninguém consome" a partir de busca textual: alias escapa.
//
// A AST resolve os dois: comentário não é nó, e `ImportDeclaration` é `ImportDeclaration`.
//
// ## Por que este arquivo existe separado do teste
//
// Hoje `src/design/` não tem nenhum arquivo `.ts`. Um gate que só varresse a pasta passaria por
// vacuidade — o modo preferido de um gate morrer sem ninguém perceber. Separando o ANALISADOR do
// alvo, o teste consegue provar que ele tem dentes contra fontes sintéticas e, só depois, aplicá-lo
// à árvore real. Os dentes deixam de depender de a pasta estar povoada.

import ts from "typescript";

export type TipoDeViolacao = "dominio" | "query";

export interface Violacao {
  arquivo: string;
  linha: number;
  tipo: TipoDeViolacao;
  detalhe: string;
}

/**
 * Módulos que o Design System não pode importar, em nenhuma camada.
 *
 * `@tanstack/react-query` é a regra nomeada na Constituição. Os demais estão aqui porque são as
 * outras portas para o mesmo lugar: o DS que importa `lib/v1` conhece o contrato público, e o que
 * importa `msw` conhece o mock — e a Constituição proíbe as duas coisas pelo mesmo motivo.
 */
const MODULOS_PROIBIDOS: readonly RegExp[] = [
  /^@tanstack\/react-query$/,
  /(^|\/)lib\/v1(\/|$)/,
  /^msw(\/|$)/,
  /^@supabase\//,
  /(^|\/)features\//,
  /(^|\/)contexts\//,
  /(^|\/)mocks?(\/|$)/,
];

/**
 * Vocabulário de DOMÍNIO. São os três objetos da hierarquia congelada em D7
 * (`Workspace → Instâncias → Análises`), nas formas que apareceriam em código.
 *
 * `instance` é palavra comum em inglês, e é flagrada assim mesmo: aqui ela **é** um objeto de
 * domínio com significado próprio, e um primitive que precise dela provavelmente está sendo
 * empurrado para conhecer o produto. Se um caso legítimo aparecer, ele vira exceção **declarada** —
 * nunca silenciosa.
 */
const PALAVRAS_DE_DOMINIO: readonly string[] = [
  "analysis",
  "analyses",
  "analise",
  "análise",
  "analises",
  "análises",
  "instance",
  "instances",
  "instancia",
  "instância",
  "workspace",
  "workspaces",
];

const DOMINIO = new RegExp(`(^|[^a-zà-ú0-9_])(${PALAVRAS_DE_DOMINIO.join("|")})([^a-zà-ú0-9_]|$)`, "i");

/** Casa a palavra isolada OU como parte de um identificador camel/kebab/snake. */
function temDominio(texto: string): string | null {
  const alvo = texto.replace(/([a-zà-ú0-9])([A-ZÀ-Ú])/g, "$1 $2").replace(/[-_]/g, " ");
  for (const palavra of PALAVRAS_DE_DOMINIO) {
    if (new RegExp(`(^|\\s)${palavra}(\\s|$)`, "i").test(alvo)) return palavra;
  }
  return DOMINIO.test(texto) ? texto : null;
}

/**
 * Analisa UM arquivo do Design System e devolve as violações de fronteira.
 *
 * Comentário nunca é visitado: a AST não o expõe como nó. É de propósito — é onde a regra é
 * explicada.
 */
export function analisarFronteira(arquivo: string, fonte: string): Violacao[] {
  const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violacoes: Violacao[] = [];
  const linhaDe = (no: ts.Node) => sf.getLineAndCharacterOfPosition(no.getStart(sf)).line + 1;

  const registrar = (no: ts.Node, tipo: TipoDeViolacao, detalhe: string) =>
    violacoes.push({ arquivo, linha: linhaDe(no), tipo, detalhe });

  const visitar = (no: ts.Node): void => {
    // ── importações ──────────────────────────────────────────────────────────────────────
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
      const proibido = MODULOS_PROIBIDOS.find((r) => r.test(especificador));
      if (proibido) {
        registrar(no, "query", `importa \`${especificador}\` — o DS não acessa backend nem domínio`);
      }
      const dominio = temDominio(especificador);
      if (dominio) {
        registrar(no, "dominio", `caminho de import carrega domínio: \`${especificador}\``);
      }
      return; // o especificador já foi julgado; não reprocessar como string literal
    }

    // ── identificadores e literais ───────────────────────────────────────────────────────
    if (ts.isIdentifier(no) || ts.isPrivateIdentifier(no)) {
      const achado = temDominio(no.text);
      if (achado) registrar(no, "dominio", `identificador \`${no.text}\``);
    } else if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) {
      const achado = temDominio(no.text);
      if (achado) registrar(no, "dominio", `literal \`"${no.text}"\``);
    } else if (ts.isJsxAttribute(no) && ts.isIdentifier(no.name)) {
      const achado = temDominio(no.name.text);
      if (achado) registrar(no, "dominio", `atributo JSX \`${no.name.text}\``);
    }

    ts.forEachChild(no, visitar);
  };

  ts.forEachChild(sf, visitar);
  return violacoes;
}
