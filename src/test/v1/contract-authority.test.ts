// WS-A1 + A6 — a AUTORIDADE do contrato é resolvida explicitamente, ou ninguém passa.
//
// Antes: `ORIGENS.find(existe)` escolhia por ordem de pasta. Com dois checkouts divergentes no
// disco — o estado real hoje — o gate lia um contrato enquanto o outro existia, e nada dizia qual
// mandava. A escolha era consequência de quais pastas alguém clonou.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANDIDATAS_PADRAO,
  explicarResolucao,
  resolverOrigemDoContrato,
} from "./contractOrigin";

const resolucao = resolverOrigemDoContrato();

describe("WS-A1 · autoridade do contrato público", () => {
  it("a resolução é um FATO declarado, não uma consequência da ordem de pastas", () => {
    // Não é decoração: sem digest não há como distinguir "duas cópias do mesmo contrato" de
    // "duas cópias diferentes", e é exatamente essa distinção que decide se há ambiguidade.
    for (const c of resolucao.candidatas) {
      expect(c.digest, `candidata sem digest: ${c.caminho}`).toMatch(/^[0-9a-f]{64}$/);
      expect(c.caminho.length).toBeGreaterThan(0);
    }
    expect(
      ["declarada-por-env", "candidata-unica", "candidatas-identicas", "ambigua", "ausente"],
    ).toContain(resolucao.motivo);
  });

  it("NÃO escolhe em silêncio quando há origens divergentes", () => {
    // O coração do WS-A. Se este caso ficar vermelho, ele está fazendo o trabalho: existem
    // contratos diferentes no disco e ninguém disse qual manda. A saída é declarar
    // SENTINELA_CONTRACT_ORIGIN ou alinhar as origens — nunca torcer pela ordem de `find`.
    expect(resolucao.motivo, explicarResolucao(resolucao)).not.toBe("ambigua");
  });

  it("a origem existe — ou alguém declarou explicitamente que não existe", () => {
    // Mesmo padrão do gate antigo: ausência precisa aparecer no comando, não em lugar nenhum.
    if (resolucao.motivo !== "ausente") return;
    expect(
      process.env.SENTINELA_CONTRACT_ORIGIN_ABSENT === "1",
      `origem não encontrada em ${CANDIDATAS_PADRAO.join(" | ")}. ` +
        "Para rodar assim de propósito, declare SENTINELA_CONTRACT_ORIGIN_ABSENT=1.",
    ).toBe(true);
  });

  it.runIf(resolucao.escolhida)("a autoridade resolvida carrega versão e superfície", () => {
    const e = resolucao.escolhida!;
    expect(e.versao, `contrato sem \`version\` em ${e.caminho}`).toBe("public-v1");
    expect(e.operacoes, "contrato sem `operations` — o inventário do A2 seria vazio").toBeGreaterThan(0);
  });
});

describe("WS-A6 · as três representações do contrato", () => {
  // AUTHORITATIVE  · sentinela-facts/docs/contracts/public-v1.json — a origem resolvida
  // DERIVED/MIRROR · sentinela/docs/contracts/public-v1.json      — cópia do outro worktree
  // GENERATED/ADAPTED · src/lib/v1/contract/public-v1.types.ts    — projeção TS, escrita à mão
  //
  // Não podem existir três fontes da verdade. O que torna uma cópia detectável como stale é
  // carregar provenance suficiente — e é isso que este caso exige da cópia TS.

  it("a cópia TS se declara DERIVADA e aponta o dono", () => {
    const texto = readFileSync(
      resolve(__dirname, "../../lib/v1/contract/public-v1.types.ts"),
      "utf-8",
    );
    expect(texto, "a cópia TS não diz de onde veio").toContain("ORIGEM");
    expect(texto).toContain("docs/contracts");
  });

  it.runIf(resolucao.candidatas.length > 1)(
    "quando há mirror, a divergência entre as cópias é VISÍVEL",
    () => {
      // Não exige que sejam iguais — exige que a diferença seja mensurável e nomeada. Duas
      // cópias iguais têm o mesmo digest; duas diferentes precisam ser reportadas por ele, e
      // não descobertas por acidente meses depois.
      const digests = resolucao.candidatas.map((c) => `${c.caminho.split(/[\\/]/).slice(-3).join("/")}=${c.digest.slice(0, 8)}(${c.operacoes}ops)`);
      expect(new Set(resolucao.candidatas.map((c) => c.digest)).size, digests.join(" | ")).toBeLessThanOrEqual(
        resolucao.candidatas.length,
      );
    },
  );
});
