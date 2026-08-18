// A ARBITRAGEM entre origens, e a linha que separa "checkout velho" de "duas autoridades".
//
// O resolvedor tratava QUALQUER diferença de digest como ambiguidade, e o gate ficava vermelho
// em função de quais pastas existiam no disco de quem rodava — 12 testes caíam de uma vez, e a
// saída documentada era declarar `SENTINELA_CONTRACT_ORIGIN`. Diagnóstico que exige ritual para
// contornar deixou de ser diagnóstico.
//
// Medido no estado real: `../sentinela` e `../sentinela-facts` são o MESMO repositório — mesmo
// remoto, 198 de 200 commits em comum — em dois checkouts. Um tem 12 operações, o outro 27, e as
// 12 estão TODAS entre as 27. Isso não é duas autoridades: é uma, em dois pontos do tempo.
//
// O que estes casos travam é a LINHA. Subconjunto estrito resolve; qualquer operação própria em
// qualquer candidata volta a ser `ambigua`, porque aí não há "mais completa" — há duas.

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { explicarResolucao, resolverOrigemDoContrato } from "./contractOrigin";

const SEM_ENV = {} as NodeJS.ProcessEnv;

/** Escreve um contrato com as operações dadas e devolve a PASTA — a candidata é a pasta. */
function origem(ops: readonly [string, string][]): string {
  const dir = mkdtempSync(join(tmpdir(), "origem-"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "public-v1.json"),
    JSON.stringify({
      version: "public-v1",
      operations: ops.map(([method, path]) => ({ method, path })),
    }),
    "utf-8",
  );
  return dir;
}

const A = ["GET", "/v1/analyses"] as [string, string];
const B = ["POST", "/v1/analyses"] as [string, string];
const C = ["GET", "/v1/instances"] as [string, string];
const D = ["POST", "/v1/subscriptions"] as [string, string];

describe("arbitragem · subconjunto estrito NÃO é ambiguidade", () => {
  it("a maior vence, e o motivo diz que a outra ficou para trás", () => {
    const r = resolverOrigemDoContrato([origem([A, B, C]), origem([A, B])], SEM_ENV);
    expect(r.motivo).toBe("checkout-desatualizado");
    expect(r.escolhida?.operacoes).toBe(3);
    // A explicação precisa NOMEAR a que ficou para trás. Sem isso, "resolvido" some com a
    // informação de que existe um checkout velho no disco — e ele continua lá.
    expect(explicarResolucao(r)).toMatch(/SUBCONJUNTO estrito/);
    expect(explicarResolucao(r)).toMatch(/→ 2/);
  });

  it("a ORDEM das candidatas não decide — a maior vence dos dois lados", () => {
    // O defeito original era `find` devolvendo a primeira do disco. Se a arbitragem dependesse
    // da ordem, teríamos trocado um sorteio por outro.
    const pequena = origem([A]);
    const grande = origem([A, B, C]);
    for (const lista of [[pequena, grande], [grande, pequena]]) {
      const r = resolverOrigemDoContrato(lista, SEM_ENV);
      expect(r.motivo).toBe("checkout-desatualizado");
      expect(r.escolhida?.operacoes).toBe(3);
    }
  });

  it("três candidatas encadeadas: a que contém todas vence", () => {
    const r = resolverOrigemDoContrato(
      [origem([A]), origem([A, B, C, D]), origem([A, B])],
      SEM_ENV,
    );
    expect(r.motivo).toBe("checkout-desatualizado");
    expect(r.escolhida?.operacoes).toBe(4);
  });
});

describe("arbitragem · divergência REAL continua sendo recusada", () => {
  it("cada uma com operação própria → `ambigua`, e ninguém é escolhido", () => {
    // O coração do gate original, preservado. Aqui não há "mais completa": há duas, e escolher
    // seria adivinhar.
    const r = resolverOrigemDoContrato([origem([A, C]), origem([A, D])], SEM_ENV);
    expect(r.motivo).toBe("ambigua");
    expect(r.escolhida).toBeNull();
    expect(explicarResolucao(r)).toMatch(/AMBÍGUA/);
  });

  it("mesmo TAMANHO com conteúdo diferente → `ambigua`", () => {
    // O caso que uma arbitragem por contagem erraria: duas de tamanho 2, conjuntos distintos.
    const r = resolverOrigemDoContrato([origem([A, C]), origem([B, D])], SEM_ENV);
    expect(r.motivo).toBe("ambigua");
  });

  it("uma candidata VAZIA não é subconjunto — é candidata quebrada", () => {
    // `operations: []` casaria a definição matemática de subconjunto e faria a maior vencer
    // calada. Mas contrato sem operação nenhuma é JSON quebrado ou arquivo errado, e deixar
    // isso passar como "checkout velho" esconderia um problema real.
    const r = resolverOrigemDoContrato([origem([A, B]), origem([])], SEM_ENV);
    expect(r.motivo).toBe("ambigua");
  });

  it("candidatas IDÊNTICAS seguem no motivo próprio, não no novo", () => {
    // Sem isto, `checkout-desatualizado` engoliria o caso de duas cópias iguais — e o vocabulário
    // passaria a dizer "uma ficou para trás" sobre origens que não ficaram.
    const iguais = [A, B] as const;
    const r = resolverOrigemDoContrato([origem([...iguais]), origem([...iguais])], SEM_ENV);
    expect(r.motivo).toBe("candidatas-identicas");
  });
});
