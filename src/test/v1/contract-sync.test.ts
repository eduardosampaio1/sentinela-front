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
import {
  CANONICAL_RESULT_V3_SCHEMA,
  FAMILIAS_ARGOS,
} from "@/features/canonical-analysis/result/contratoV3";

const RAIZ = resolve(__dirname, "../../..");
const COPIA = resolve(RAIZ, "src/lib/v1/contract/public-v1.types.ts");
const COPIA_V3 = resolve(RAIZ, "src/lib/v1/contract/public-v3.types.ts");

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

  it.runIf(ORIGEM)("a origem declara os TRÊS documentos do resultado", () => {
    // Passou a ser plural na MF6.4b: a rota pública serve o `analysis-result-v2` quando ele
    // existe. O campo singular saiu — dois campos declarando a mesma coisa divergiriam na
    // próxima versão, e o errado seria o que alguém leu.
    //
    // Virou TRÊS na Manifest Sync do produtor: o Gateway já servia `analysis-result-v3` por
    // negociação (`?result_schema_version=`) e o manifesto seguia declarando dois. Este caso
    // ficou vermelho no dia em que a origem passou a dizer a verdade, e é assim que ele deve
    // se comportar — o vermelho foi o aviso, não o defeito.
    //
    // Esta prova é o que impede o frontend de suportar uma versão que a origem não declara (e o
    // contrário): os dois lados precisam concordar sobre o vocabulário do discriminador.
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    expect(snapshot.result_document_schemas).toEqual([
      "analysis-result-v1",
      "analysis-result-v2",
      "analysis-result-v3",
    ]);
    expect(snapshot.result_document_schema).toBeUndefined();
    expect(snapshot.result_document_owner).toBe("sentinela-result-assembler");
  });

  it.runIf(ORIGEM)("este frontend suporta EXATAMENTE os documentos que a origem declara", () => {
    // A verificação cruzada que importa: duas suítes verdes não provam que os dois repos falam
    // do mesmo vocabulário. Aqui as constantes DESTE frontend são comparadas com a declaração
    // do repo dono — quando a origem publicou a v3, este teste virou o aviso de que a tela ainda
    // não a lia (e o estado seguro era o que o usuário veria até lá).
    //
    // O aviso foi atendido: `CANONICAL_RESULT_V3_SCHEMA` existe, o documento tem tipos e
    // validador de fronteira. Ele fica verde por RECONHECIMENTO, e não por ter sido afrouxado —
    // a igualdade continua exata nos dois sentidos, então declarar um documento que a origem
    // não serve reprova aqui do mesmo jeito.
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    expect(
      [CANONICAL_RESULT_SCHEMA, CANONICAL_RESULT_V2_SCHEMA, CANONICAL_RESULT_V3_SCHEMA].sort(),
    ).toEqual([...snapshot.result_document_schemas].sort());
  });

  it.runIf(ORIGEM)("a cópia dos tipos v3 não DERIVOU da origem", () => {
    // Mesma armadilha da cópia v1, e a v3 é mais nova — logo, mais fácil de esquecer. O
    // documento tem onze famílias; o `tsc` fica verde se a cópia perder uma, porque perder um
    // campo opcional não quebra tipo nenhum. Só a comparação com a origem acusa.
    const origem = readFileSync(resolve(ORIGEM!, "public-v3.types.ts"), "utf-8");
    const copia = readFileSync(COPIA_V3, "utf-8");

    const daOrigem = camposDaInterface(origem, "AnalysisResultV3Document");
    const daCopia = camposDaInterface(copia, "AnalysisResultV3Document");
    expect(daOrigem.length, "a ORIGEM não declara o documento v3").toBeGreaterThan(0);
    expect(daCopia).toEqual(daOrigem);

    // As medições são o que a tela lê campo a campo; um `reason` ou um `scale` que suma da
    // cópia vira estado inventado na interface, não erro de compilação.
    // ## A lista CRESCEU, e a brecha era exatamente onde a proxima entrega vai passar
      //
      // Ela cobria quatro tipos. Mutei a copia para medir o alcance: apagar `data_coverage` de
      // `PublicMeasurement` reprova — o gate tem dente. Apagar `maximum` de **`Scale`** passa com
      // doze verdes.
      //
      // `Scale` e o tipo que carrega `minimum`/`maximum`, e e o candidato natural a receber a faixa
      // ESPERADA que `docs/PEDIDO-FAIXA-ESPERADA.md` pede. Se o produtor a publicasse ali hoje, a
      // copia local ficaria velha, o `tsc` seguiria verde, e o campo simplesmente nao chegaria a
      // tela. E o mesmo desfecho que o catalogo do ARGOS descreve para as 26 metricas que "puderam
      // sumir sem ninguem recusar nenhuma".
      //
      // A lista passou a ser TODA interface que esta tela le campo a campo. Nenhuma delas quebra
      // compilacao ao perder um campo opcional — e e por isso que a comparacao e a unica defesa.
      for (const tipo of [
        "PublicMeasurement", "PublicIndicatorV3", "PublicScore", "PublicRisk",
        "Scale", "PublicProjection", "PublicIntent", "PublicSummary", "MethodMetadata",
        "Partiality", "PublicAlert", "PublicIssue", "PublicRecommendation",
        "PublicEvidenceSummary", "PublicExecutiveSummary", "PublicDenominator",
      ]) {
      expect(camposDaInterface(copia, tipo), `${tipo} divergiu da origem`).toEqual(
        camposDaInterface(origem, tipo),
      );
    }
  });

  it.runIf(ORIGEM)("as famílias que o frontend conhece são as do documento da ORIGEM", () => {
    // `FAMILIAS_ARGOS` é a lista que a View usa para decidir o que pode existir. Se a origem
    // publicar uma família nova e esta lista ficar, a tela some com ela em silêncio — que é o
    // mesmo defeito do contrato parado, um nível acima.
    const origem = readFileSync(resolve(ORIGEM!, "public-v3.types.ts"), "utf-8");
    const doDocumento = camposDaInterface(origem, "AnalysisResultV3Document");
    const metadados = new Set([
      "analysis_id",
      "result_schema_version",
      "indicator_registry_version",
      "measurement_contract_version",
      "argos_catalog_version",
      "method",
      "partiality",
      "summary",
    ]);
    const familiasDaOrigem = doDocumento.filter((c) => !metadados.has(c)).sort();
    expect([...FAMILIAS_ARGOS].sort()).toEqual(familiasDaOrigem);
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
