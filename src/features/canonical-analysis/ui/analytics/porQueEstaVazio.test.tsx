import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import pt from "@/i18n/pt.json";

function texto(objeto: unknown): string {
  return JSON.stringify(objeto);
}

describe("PorQueEstaVazio removido", () => {
  it("não mantém a explicação antiga de famílias vazias", () => {
    expect(texto(en)).not.toContain("Nothing is broken down by field");
    expect(texto(pt)).not.toContain("Nada está aberto por campo");
  });
});
