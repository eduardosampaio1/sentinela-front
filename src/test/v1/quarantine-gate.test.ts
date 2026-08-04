// Gate da quarentena de baseline (Onda 6 E1). Impede que a quarentena vire depósito:
// congela a lista em exatamente 4, exige que cada arquivo exista e AINDA contenha sua âncora
// (o motivo continua verdadeiro), e verifica a derivação usada no `test.exclude` do vitest.
// Consertar uma suíte remove a âncora → este gate reprova → obriga a tirá-la da quarentena.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { QUARANTINE, QUARANTINE_FILES } from "@/test/quarantine";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."); // raiz do repo

describe("Gate — quarentena de baseline E1", () => {
  // 4 -> 1 na Onda 8 -> 0 com a aposentadoria do dashboard legado.
  //
  // Todas saíram do mesmo jeito: o ARQUIVO foi removido junto com o código que exercitava.
  // Dívida quitada por REMOÇÃO, não por conserto — e a distinção importa, porque "conserto"
  // sugere que o comportamento continua e passou a funcionar, quando na verdade ele deixou de
  // existir. A última foi Q4 (`apiErrorFormatting`), que morreu com `lib/api.ts`.
  //
  // A lista SÓ ENCOLHE: entrada nova exige editar aqui, e é isso que impede a quarentena virar
  // depósito. Zero é o estado desejado, não um acidente — se voltar a crescer, este número
  // muda e alguém precisa justificar.
  it("a lista está VAZIA — nenhuma suíte em quarentena", () => {
    expect(QUARANTINE).toHaveLength(0);
    expect(QUARANTINE_FILES).toEqual([]);
  });

  it("toda entrada é dead-stack ou legacy-contract (nunca camada canônica /v1)", () => {
    for (const q of QUARANTINE) {
      expect(["dead-stack", "legacy-contract"]).toContain(q.category);
      expect(q.file).not.toContain("/v1/"); // a E1 nova nunca entra em quarentena
      expect(q.reason.length).toBeGreaterThan(20);
    }
  });

  it("cada arquivo existe e AINDA contém sua âncora (motivo verdadeiro)", () => {
    for (const q of QUARANTINE) {
      const caminho = join(RAIZ, q.file);
      expect(existsSync(caminho), `${q.file}: sumiu — remova da quarentena`).toBe(true);
      const conteudo = readFileSync(caminho, "utf8");
      expect(
        conteudo.includes(q.ancora),
        `${q.file}: âncora "${q.ancora}" não está mais presente — a suíte pode ter sido consertada; remova da quarentena (${q.debtId})`,
      ).toBe(true);
    }
  });
});
