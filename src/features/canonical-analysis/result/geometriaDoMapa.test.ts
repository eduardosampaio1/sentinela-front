// A conta que o cadeado `backend-first-result` empurrou para fora de `ui/` — e que, fora de lá,
// virou testável. Os três casos são as três formas de a moldura errar.

import { describe, expect, it } from "vitest";
import { ALTURA_DO_NO, alturaDoMapa } from "./geometriaDoMapa";

describe("altura da moldura do mapa de procedência", () => {
  it("um desdobramento raso não fica espremido — o piso segura", () => {
    // Dois nós na mesma faixa: o fundo daria 72px, e uma moldura de 72px não é um mapa.
    expect(alturaDoMapa([0, 0])).toBe(200);
  });

  it("a última linha CABE — é o defeito que dimensionar pelo conteúdo existe para evitar", () => {
    // Seis janelas de série, passo de 70px: a última começa em 350 e termina em 402.
    const ys = [0, 70, 140, 210, 280, 350];
    const h = alturaDoMapa(ys);
    expect(h).toBeGreaterThanOrEqual(350 + ALTURA_DO_NO);
    expect(h).toBe(422);
  });

  it("o teto cobre o pior caso REAL — seis filhos mais o nó do «não desenhados»", () => {
    // Sete linhas: 6 * 70 + 52 + 20 = 492, acima do teto. Ele corta em 480, e 480 ainda mostra
    // o topo da sétima — que é onde está o texto que importa.
    expect(alturaDoMapa([0, 70, 140, 210, 280, 350, 420])).toBe(480);
  });

  it("sem nós não há moldura negativa", () => {
    expect(alturaDoMapa([])).toBe(200);
  });

  it("a ordem das posições não importa: é o MAIOR que manda, não o último", () => {
    expect(alturaDoMapa([350, 0, 140])).toBe(alturaDoMapa([0, 140, 350]));
  });
});
