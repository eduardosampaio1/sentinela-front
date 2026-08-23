// A FIAÇÃO do bullet no herói — e a razão de ela existir agora.
//
// O `Heroi` recusou este medidor com um argumento correto: *"não há faixa esperada em contrato
// nenhum... desenhar a régua e inventar a marca transformaria julgamento meu em dado do
// produtor"*. Duas fatias de backend derrubaram a premissa — `PublicMeasurement.thresholds`
// publica os dois cortes que o motor APLICA.
//
// Este arquivo prova a fiação, que é o que o teste da primitiva NÃO cobre: a primitiva sabe
// desenhar; aqui se prova que o herói **passa os dados certos** e, principalmente, que ele
// **não desenha nada quando o limiar não veio**.
//
// Por que arquivo separado do `ArgosView.test.tsx`: aquele monta a view inteira contra o
// artefato REAL, e o artefato está preso à dívida do Postgres — `scores: []` e `intents: []`
// desde a D1. Um teste de fiação que dependesse dele mediria o vazio e ficaria verde.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { PublicScore } from "@/lib/v1/contract/public-v3.types";

import { Heroi } from "./Heroi";

const MEDIDA = {
  id: "behavior_score",
  value: 80.36,
  availability: "measured",
  reason: "ok",
  scale: { kind: "score_100", minimum: null, maximum: null },
} as const;

function montar(measurement: Record<string, unknown>) {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <LanguageProvider>
      <Heroi escore={{ measurement } as unknown as PublicScore} rotulo="Behavior score" />
    </LanguageProvider>,
  );
}

describe("Herói · o bullet só existe quando o produtor declarou os cortes", () => {
  it("COM `thresholds`, o medidor aparece e diz o que mostra", () => {
    montar({ ...MEDIDA, thresholds: { warn: 75, critical: 60 } });
    const fig = screen.getByRole("img");
    // A frase é interpolada: sem isto a tela mostraria `{{warn}}` cru e o teste passaria.
    expect(fig.getAttribute("aria-label")).toMatch(/Behavior score/);
    expect(fig.getAttribute("aria-label")).toMatch(/75/);
    expect(fig.getAttribute("aria-label")).toMatch(/60/);
    expect(fig.getAttribute("aria-label")).not.toMatch(/\{\{/);
  });

  it("SEM `thresholds`, NÃO há medidor — é o caso das outras 36 saídas", () => {
    // O cadeado que impede a régua cinza "só para mostrar a escala": uma barra sem zonas
    // convida a leitura de posição que nada sustenta.
    montar(MEDIDA);
    expect(screen.queryByRole("img")).toBeNull();
  });

  // Os tres casos abaixo pedem o marcador por `[data-marcador]`. Os dois primeiros passavam
  // com o seletor antigo, e passavam por ACIDENTE: `querySelector` devolve o primeiro do DOM, e
  // o marcador vinha antes dos rotulos de corte. Verde por ordem de renderizacao e verde que a
  // proxima reordenacao apaga.
  it("a régua vem da ESCALA, não dos cortes", () => {
    // Deduzir os extremos dos próprios limiares encolheria o eixo até as zonas, e a posição do
    // marcador passaria a exagerar toda variação. `score_100` vive em 0..100, e 80,36 tem de
    // cair a ~80% do eixo — não a 100%, que é onde cairia numa régua de 60..75.
    const { container } = montar({ ...MEDIDA, thresholds: { warn: 75, critical: 60 } });
    const marcador = container.querySelector("[data-marcador]") as HTMLElement;
    expect(marcador).toBeTruthy();
    const esquerda = parseFloat(marcador.style.left);
    expect(esquerda).toBeGreaterThan(78);
    expect(esquerda).toBeLessThan(82);
  });

  it("`ratio_unit` usa régua 0..1, e o mesmo número cairia noutro lugar", () => {
    // A prova de que a régua é lida da escala e não fixada em 100: o mesmo componente com
    // `ratio_unit` põe 0,8 quase no fim do eixo.
    const { container } = montar({
      ...MEDIDA,
      value: 0.8,
      scale: { kind: "ratio_unit", minimum: null, maximum: null },
      thresholds: { warn: 0.75, critical: 0.6 },
    });
    const marcador = container.querySelector("[data-marcador]") as HTMLElement;
    expect(parseFloat(marcador.style.left)).toBeGreaterThan(78);
  });

  it("medição AUSENTE com limiar: as zonas ficam, o marcador some", () => {
    // O vão COM referência. A tela sabe onde ficaria o bom e não desenha traço sem régua —
    // e é por isso que o contrato permite `thresholds` sem `value`.
    const { container } = montar({
      ...MEDIDA,
      value: null,
      availability: "not_measured",
      reason: "no_input_data",
      thresholds: { warn: 75, critical: 60 },
    });
    expect(screen.getByRole("img")).toBeInTheDocument();
    // Pergunta pelo MARCADOR, nao pela forma do CSS dele. A versao anterior contava
    // `span[style*='left']:not([style*='opacity'])`, que era o marcador enquanto ele fosse o
    // unico elemento posicionado da regua. Quando os cortes passaram a ser escritos na fracao
    // em que estao, o mesmo seletor passou a achar tres — e reprovou uma tela correta.
    expect(container.querySelectorAll("[data-marcador]")).toHaveLength(0);
  });
});
