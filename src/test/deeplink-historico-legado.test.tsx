import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Deep link legado do detalhe de análise.
 *
 * Depois da migração do histórico (4A/3) nada navega para `/dashboard/history/:id` — a linha
 * leva direto à rota canônica. Mas URLs salvas e compartilhadas continuam existindo, então a
 * rota vira **redirect** para o renderizador canônico em vez de sumir.
 *
 * O que estes cadeados protegem:
 *
 * 1. a rota legada não volta a montar a `RunDetailPage` — reconstruir um segundo renderizador
 *    do mesmo documento `analysis-result-v1` duplicaria a `CanonicalResultPage` com semântica
 *    legada;
 * 2. o destino é a rota canônica, não uma tela intermediária;
 * 3. `RunDetailPage` deixa de ser importada pelo router — é o que torna a prova de desuso
 *    verificável no lote de remoção.
 */

const ROUTER = resolve(__dirname, "../app/router.tsx");

describe("deep link legado /dashboard/history/:id", () => {
  const fonte = readFileSync(ROUTER, "utf8");

  it("a rota legada redireciona, não monta a tela legada", () => {
    const linha = fonte
      .split("\n")
      .find((l) => l.includes('path: "/dashboard/history/:id"'));
    expect(linha, "a rota legada sumiu — deep links salvos quebrariam").toBeDefined();
    expect(linha).toContain("RedirecionaDetalheLegado");
    expect(linha).not.toContain("RunDetailPage");
  });

  it("o destino é a rota canônica de resultado", () => {
    expect(fonte).toContain("/canonical/analyses/${encodeURIComponent(id)}/result");
  });

  it("o router não importa mais RunDetailPage", () => {
    // Prova de desuso que o lote de remoção vai consumir: enquanto o router a importasse, ela
    // continuaria no bundle e a remoção seria adivinhação.
    expect(fonte).not.toMatch(/RunDetailPage\s*=\s*lazy/);
    expect(fonte).not.toMatch(/import[^\n]*RunDetailPage/);
  });
});
