// Os TRÊS campos que o contrato publicava e a tela não mostrava.
//
// Medido contra `PublicMeasurement`: ele publica ONZE campos, e o corpo da medição renderizava
// OITO. `confidence`, `domain` e `thresholds` só apareciam no herói ou em lugar nenhum — e os
// três mudam a leitura do número que está ao lado deles.
//
// O protótipo levava este detalhe para uma GAVETA lateral. Aqui não: lá os cartões carregam só
// nome e valor, então a gaveta é o único lugar onde o resto cabe; aqui o cartão já traz
// cobertura, escala e método inline. Três campos a mais não pagam foco preso, scrim e escape.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { PublicMeasurement } from "@/lib/v1/contract/public-v3.types";

import { Medicao } from "./Medicao";

const base = {
  id: "intent_score",
  value: 82,
  availability: "measured",
  reason: "ok",
  scale: { kind: "score_100", minimum: null, maximum: null },
} as const;

function montar(extra: Record<string, unknown>) {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <LanguageProvider>
      <Medicao medicao={{ ...base, ...extra } as unknown as PublicMeasurement} rotulo="Intent score" />
    </LanguageProvider>,
  );
}

describe("Medição · os três campos que faltavam", () => {
  it("a CONFIANÇA da medição aparece, e com rótulo próprio", () => {
    // "da medição", nunca "Confiança" seco: `Global confidence` é outra coisa — escore sobre a
    // análise inteira — e dois números com o mesmo nome na mesma tela é a confusão que o campo
    // foi criado para desfazer.
    montar({ confidence: 0.64 });
    expect(screen.getByText(/Confiança da medição/)).toBeInTheDocument();
  });

  it("o DOMÍNIO publicado aparece", () => {
    montar({ domain: "behavioral" });
    expect(screen.getByText("Domínio:")).toBeInTheDocument();
    expect(screen.getByText("behavioral")).toBeInTheDocument();
  });

  it("os LIMIARES aparecem escritos, cada um NOMEADO", () => {
    // O bullet desenha a régua para quem vê; este par é o canal que sobrevive à escala de cinza
    // e o que permite CONFERIR a posição do marcador.
    montar({ thresholds: { warn: 75, critical: 60 } });
    expect(screen.getByText("atenção 75 · crítico 60")).toBeInTheDocument();
  });

  it("`critical > warn` (maior é pior) fica legível pelo NOME, não pela ordem", () => {
    // A ordem NÃO carrega direção — os dois ramos da versão anterior produziam o mesmo texto,
    // e a mutação que os trocava por `min · max` sobreviveu por ser equivalente. É o NOME ao
    // lado de cada número que diz qual é qual.
    montar({ thresholds: { warn: 0.5, critical: 0.8 }, scale: { kind: "ratio_unit", minimum: null, maximum: null } });
    expect(screen.getByText("atenção 0,5 · crítico 0,8")).toBeInTheDocument();
  });

  it("sem os três, NENHUMA linha é inventada", () => {
    // O caso das 36 saídas sem limiar. Uma linha vazia ou um traço afirmaria que existe algo ali.
    montar({});
    expect(screen.queryByText(/Confiança da medição/)).toBeNull();
    expect(screen.queryByText("Domínio:")).toBeNull();
    expect(screen.queryByText("Limiares:")).toBeNull();
  });

  it("confiança 1 não é escrita — certeza total não é ressalva", () => {
    montar({ confidence: 1 });
    expect(screen.queryByText(/Confiança da medição/)).toBeNull();
  });
});
