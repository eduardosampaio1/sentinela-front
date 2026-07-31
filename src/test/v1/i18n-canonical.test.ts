// Cobertura i18n da jornada canônica: cada um dos 7 estados públicos tem title/message não-vazios
// em EN e PT. Lê os JSON via fs (não depende de resolveJsonModule) — cadeado contra estado sem texto.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PUBLIC_STATES } from "@/lib/v1";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function carregar(lang: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RAIZ, "src", "i18n", `${lang}.json`), "utf8")) as Record<string, unknown>;
}

function buscar(obj: Record<string, unknown>, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>(
    (atual, seg) => (atual && typeof atual === "object" ? (atual as Record<string, unknown>)[seg] : undefined),
    obj,
  );
}

describe("i18n canônico — 7 estados cobertos em EN e PT", () => {
  for (const lang of ["en", "pt"]) {
    it(`${lang}: cada estado tem title/message não-vazios`, () => {
      const dict = carregar(lang);
      for (const s of PUBLIC_STATES) {
        for (const campo of ["title", "message"] as const) {
          const chave = `canonicalAnalysis.state.${s}.${campo}`;
          const valor = buscar(dict, chave);
          expect(typeof valor, `${lang} ${chave}`).toBe("string");
          expect((valor as string).length, `${lang} ${chave} vazio`).toBeGreaterThan(0);
        }
      }
    });
  }
});
