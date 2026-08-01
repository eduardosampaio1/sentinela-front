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

/** A origem fica no repo do Gateway, ao lado deste. Sem ele, o gate skipa com motivo. */
const ORIGENS = [
  resolve(RAIZ, "../sentinela-facts/docs/contracts"),
  resolve(RAIZ, "../sentinela/docs/contracts"),
];
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

  it("quando a origem não está no disco, o gate diz isso em vez de passar calado", () => {
    // Um gate que some em silêncio quando a dependência falta é pior que gate nenhum: ele
    // reporta verde sem ter verificado nada.
    if (!ORIGEM) {
      expect(ORIGENS.length).toBeGreaterThan(0);
      console.warn(
        `[contract-sync] origem de public-v1 nao encontrada em ${ORIGENS.join(" | ")} — ` +
          "os casos de comparacao NAO rodaram nesta execucao",
      );
    }
    expect(true).toBe(true);
  });
});
