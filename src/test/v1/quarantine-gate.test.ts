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
  it("a lista está CONGELADA em exatamente 4 suítes conhecidas", () => {
    expect(QUARANTINE).toHaveLength(4);
    expect(new Set(QUARANTINE.map((q) => q.file)).size).toBe(4); // sem duplicatas
    expect(new Set(QUARANTINE.map((q) => q.debtId)).size).toBe(4); // ticket único por entrada
    expect(QUARANTINE_FILES).toEqual(QUARANTINE.map((q) => q.file));
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
