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

describe("cópia local de public-v1 × origem", () => {
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

  it.runIf(ORIGEM)("o documento do resultado é `analysis-result-v1` na origem", () => {
    const snapshot = JSON.parse(readFileSync(resolve(ORIGEM!, "public-v1.json"), "utf-8"));
    expect(snapshot.result_document_schema).toBe("analysis-result-v1");
    expect(snapshot.result_document_owner).toBe("sentinela-result-assembler");
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
