// Gate de DIVERGÊNCIA: a cópia local de `public-v1` não pode derivar da origem.
//
// O frontend mantém uma cópia dos tipos do contrato público — o que é razoável (o repo é
// separado, não há build cruzado), e perigoso pelo mesmo motivo: a origem muda, a cópia fica,
// o `tsc` continua verde, e o defeito só aparece quando a UI lê um campo que não existe mais
// (ou deixa de ler um que passou a existir).
//
// Este arquivo compara a cópia com a ORIGEM (`sentinela/docs/contracts/`), quando ela está
// disponível no disco. Não é comparação de arquivo inteiro: formatação e comentários podem
// divergir legitimamente. O que precisa casar é a SUPERFÍCIE — os campos de cada projeção
// pública, que é justamente o que quebra a UI quando muda.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CANONICAL_RESULT_SCHEMA } from "@/features/canonical-analysis/result/canonicalSchema";
import { CANONICAL_RESULT_V2_SCHEMA } from "@/features/canonical-analysis/result/canonicalSchemaV2";

const RAIZ = resolve(__dirname, "../../..");
const COPIA = resolve(RAIZ, "src/lib/v1/contract/public-v1.types.ts");

/** A origem fica no repo do Gateway, ao lado deste.
 *
 * A lista é ORDENADA e a primeira que existir vence — o que é uma escolha, não um detalhe.
 * Estes dois caminhos podem ser **worktrees do mesmo repositório em branches diferentes**
 * (foi o que a Onda 8 encontrou: `sentinela-facts` em `integracao-facts-producer` e
 * `sentinela` em `fix/argos-analysis-pipeline`, com contratos que NÃO batem entre si).
 *
 * Nesse cenário "a origem" é ambígua, e qual delas o gate pega passa a depender de quais
 * pastas existem na máquina. `SENTINELA_CONTRACT_ORIGIN` resolve isso quando importa:
 * quem sabe qual checkout é a autoridade diz o caminho, em vez de torcer pela ordem.
 */
const ORIGENS = process.env.SENTINELA_CONTRACT_ORIGIN
  ? [resolve(process.env.SENTINELA_CONTRACT_ORIGIN)]
  : [resolve(RAIZ, "../sentinela-facts/docs/contracts"), resolve(RAIZ, "../sentinela/docs/contracts")];
const ORIGEM = ORIGENS.find((p) => existsSync(resolve(p, "public-v1.json")));

/** Extrai os campos declarados de uma interface TS pelo nome. */
function camposDaInterface(fonte: string, nome: string): string[] {
  const inicio = fonte.indexOf(`export interface ${nome} {`);
  if (inicio < 0) return [];
  const fim = fonte.indexOf("\n}", inicio);
  const corpo = fonte.slice(inicio, fim);
  return corpo
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("*") && !l.startsWith("/*"))
    .map((l) => l.split(/[?:]/)[0].trim())
    .filter(Boolean)
    .sort();
}

/** Extrai os membros de um array `const` de estados (`PUBLIC_STATES`) da cópia. */
function estadosDaCopia(fonte: string): string[] {
  const inicio = fonte.indexOf("export const PUBLIC_STATES");
  if (inicio < 0) return [];
  // `= [` e não o primeiro `[`: a anotação de tipo é `readonly AnalysisStatus[]`, e casar com
  // o colchete dela devolve uma lista VAZIA — que passa em qualquer laço e em qualquer
  // comparação de subconjunto sem verificar nada.
  const abre = fonte.indexOf("= [", inicio) + 2;
  const fecha = fonte.indexOf("]", abre);
  return [...fonte.slice(abre, fecha).matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort();
}

describe("cópia local de public-v1 × origem", () => {
  // Esta suíte comparava só os CAMPOS dos read-models. O vocabulário de ESTADOS — a coisa de
  // que a jornada inteira depende, e que o próprio arquivo da cópia anuncia como sua razão de
  // existir — passava sem ninguém olhar: dava para somar ou remover um estado na cópia e o
  // gate de "não derivou da origem" continuava verde.
  it.runIf(ORIGEM)("o vocabulário de ESTADOS casa com o contrato da origem", () => {
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    const daCopia = estadosDaCopia(readFileSync(COPIA, "utf-8"));
    expect(daCopia.length, "PUBLIC_STATES não foi encontrado na cópia").toBeGreaterThan(0);
    expect(daCopia).toEqual([...(snapshot.public_states as string[])].sort());
  });

  it.runIf(ORIGEM)("todo estado do array também existe no tipo `AnalysisStatus`", () => {
    // O array e a união são duas declarações do mesmo fato. Se divergirem, o `switch` da
    // máquina de apresentação compila (a união mandou) enquanto o laço de teste percorre
    // outra lista (o array mandou) — e cada um prova uma coisa diferente.
    const texto = readFileSync(COPIA, "utf-8");
    const uniao = texto.slice(
      texto.indexOf("export type AnalysisStatus"),
      texto.indexOf("export const PUBLIC_STATES"),
    );
    const estados = estadosDaCopia(texto);
    expect(estados.length, "PUBLIC_STATES não foi encontrado na cópia").toBeGreaterThan(0);
    for (const estado of estados) {
      expect(uniao, `"${estado}" está em PUBLIC_STATES mas não em AnalysisStatus`).toContain(
        `"${estado}"`,
      );
    }
  });
  it.runIf(ORIGEM)("o read-model do RESULTADO casa com o contrato da origem", () => {
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    const daCopia = camposDaInterface(readFileSync(COPIA, "utf-8"), "AnalysisResultView");
    expect(daCopia).toEqual([...(snapshot.result_read_model_fields as string[])].sort());
  });

  it.runIf(ORIGEM)("o read-model de STATUS casa com o contrato da origem", () => {
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    const daCopia = camposDaInterface(readFileSync(COPIA, "utf-8"), "AnalysisStatusView");
    expect(daCopia).toEqual([...(snapshot.status_read_model_fields as string[])].sort());
  });

  it.runIf(ORIGEM)("o read-model da LISTAGEM casa com o contrato da origem", () => {
    // Faltava. `AnalysisResultView` e `AnalysisStatusView` eram comparados; a listagem não —
    // e foi por ela que `engine_version` entrou na cópia e na tela sem gate nenhum reagir.
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    const daCopia = camposDaInterface(readFileSync(COPIA, "utf-8"), "AnalysisListItem");
    expect(daCopia).toEqual([...(snapshot.list_item_fields as string[])].sort());
  });

  it.runIf(ORIGEM)("nenhum campo NUNCA público aparece na cópia dos tipos", () => {
    // O contrato declara `nunca_publicos` desde a Onda 5.5, e o lado do frontend nunca o leu.
    // A checagem é no ARQUIVO inteiro, não numa interface: o campo proibido não pode aparecer
    // em projeção nenhuma, nem numa nova que alguém acrescente amanhã.
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    const proibidos = snapshot.nunca_publicos as string[];
    expect(proibidos.length).toBeGreaterThan(0);

    const texto = readFileSync(COPIA, "utf-8");
    // Comentário PODE citar o proibido — é onde se explica por que ele não está aqui. O que
    // não pode é declaração de campo. Sem esta distinção, documentar a regra a violaria.
    const semComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const campo of proibidos) {
      // A âncora era `^\s*campo` — só pegava a declaração no INÍCIO da linha. Passavam verdes
      // `readonly engine_version?: string`, um campo depois de qualquer modificador, e a forma
      // inline `{ engine_version?: string }`. A promessa ("em projeção nenhuma") era mais
      // ampla que o alcance.
      //
      // Agora a fronteira à esquerda é qualquer coisa que NÃO seja parte de um identificador:
      // `engine_version:` é pego onde quer que esteja, e `my_engine_version:` continua livre —
      // ele não é o campo proibido.
      expect(
        new RegExp(`(^|[^A-Za-z0-9_$])${campo}\\??\\s*:`, "m").test(semComentarios),
        `a cópia declara o campo NUNCA público \`${campo}\``,
      ).toBe(false);
    }
  });

  it.runIf(ORIGEM)("a origem declara os DOIS documentos do resultado", () => {
    // Passou a ser plural na MF6.4b: a rota pública serve o `analysis-result-v2` quando ele
    // existe. O campo singular saiu — dois campos declarando a mesma coisa divergiriam na
    // próxima versão, e o errado seria o que alguém leu.
    //
    // Esta prova é o que impede o frontend de suportar uma versão que a origem não declara (e o
    // contrário): os dois lados precisam concordar sobre o vocabulário do discriminador.
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    expect(snapshot.result_document_schemas).toEqual([
      "analysis-result-v1",
      "analysis-result-v2",
    ]);
    expect(snapshot.result_document_schema).toBeUndefined();
    expect(snapshot.result_document_owner).toBe("sentinela-result-assembler");
  });

  it.runIf(ORIGEM)("este frontend suporta EXATAMENTE os documentos que a origem declara", () => {
    // A verificação cruzada que importa: duas suítes verdes não provam que os dois repos falam
    // do mesmo vocabulário. Aqui as constantes DESTE frontend são comparadas com a declaração
    // do repo dono — se a origem publicar uma v3, este teste vira o aviso de que a tela ainda
    // não a lê (e o estado seguro é o que o usuário veria até lá).
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    expect([CANONICAL_RESULT_SCHEMA, CANONICAL_RESULT_V2_SCHEMA].sort()).toEqual(
      [...snapshot.result_document_schemas].sort(),
    );
  });

  it("a cópia declara de onde veio", () => {
    // Sem a nota de origem, a próxima pessoa não tem como saber que existe um dono deste
    // contrato em outro repositório — e edita a cópia achando que edita o contrato.
    const texto = readFileSync(COPIA, "utf-8");
    expect(texto).toContain("ORIGEM");
    expect(texto).toContain("sentinela");
  });

  it("a origem existe — ou alguém declarou explicitamente que não existe", () => {
    // A versão anterior deste caso avisava no console e terminava em `expect(true).toBe(true)`.
    // Isso é um gate que confunde PULADO com PASSOU: sem o repo irmão no disco, os três casos
    // acima não rodam, o arquivo reporta 5 verdes, e ninguém verificou contrato nenhum. É o
    // mesmo defeito que esta onda já encontrou três vezes em lugares diferentes — e o console
    // não conta, porque suíte verde ninguém lê.
    //
    // Agora o padrão é FALHAR. Rodar sem a origem continua possível, mas exige dizer isso:
    // `SENTINELA_CONTRACT_ORIGIN_ABSENT=1`. A diferença entre as duas situações é que uma
    // aparece no comando e a outra aparecia em lugar nenhum.
    if (ORIGEM) return;

    const declarado = process.env.SENTINELA_CONTRACT_ORIGIN_ABSENT === "1";
    expect(
      declarado,
      `origem de public-v1 não encontrada em ${ORIGENS.join(" | ")}. Os casos de comparação ` +
        "NÃO rodaram — este arquivo não verificou o contrato. Para rodar assim de propósito " +
        "(clone isolado, sem o repo irmão), declare SENTINELA_CONTRACT_ORIGIN_ABSENT=1.",
    ).toBe(true);
  });
});
