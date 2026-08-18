// O MOTIVO do veredito na tela — os três estados, e a degradação honesta.
//
// Esta fatia entrou ANTES da visual por decisão de owner, e a razão é medível: `severity` não é
// o limiar aplicado ao escore. O motor a escala para `WARN` por evidência de mismatch semântico
// **sem olhar a nota** (`_sentinela_governance.py:161`), e com o motor real uma intenção com
// `governance_score = 100` sai `WARN`. Publicado o limiar, aquele 100 cai na zona VERDE — então
// sem o motivo a tela pinta verde ao lado de um crachá de atenção e não tem o que dizer.
//
// Os três estados do contrato viram três comportamentos distintos aqui, e é isso que se prova:
//
//   `null`        produtor não declarou   → a tela DIZ "não publicado"
//   `[]`          declarou, sem motivo    → não há linha
//   preenchido    os códigos, na ordem    → traduzidos, ou CRUS quando não há tradução

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { PublicIntent } from "@/lib/v1/contract/public-v3.types";

import { Intencoes } from "./Intencoes";

const ESCORE = {
  id: "intent_score",
  value: 100,
  availability: "measured",
  reason: "ok",
  scale: { kind: "score_100", minimum: null, maximum: null },
  thresholds: { warn: 75, critical: 60 },
} as const;

function montar(extra: Record<string, unknown>) {
  window.localStorage.setItem("sentinela:language", "pt");
  const intencao = {
    intent_id: "cobranca.segunda_via",
    score: ESCORE,
    support: 12,
    underrepresented: false,
    ...extra,
  } as unknown as PublicIntent;
  return render(
    <LanguageProvider>
      <Intencoes intents={[intencao]} pisoDeAmostra={5} />
    </LanguageProvider>,
  );
}

describe("Intenções · o veredito diz POR QUÊ", () => {
  it("o caso que a fatia existe para resolver: nota na zona verde, veredito de atenção, COM motivo", () => {
    montar({ severity: "WARN", severity_reason: ["SEMANTIC_MISMATCH_EVIDENCE"] });
    expect(screen.getByText(/WARN/)).toBeInTheDocument();
    // Sem esta linha, a tela mostraria atenção ao lado de 100 e nada explicaria.
    expect(screen.getByText(/respostas fora da intenção/)).toBeInTheDocument();
  });

  it("vários códigos saem NA ORDEM em que o produtor os emitiu", () => {
    // A ordem é informação: o primeiro determinou o veredito, os demais agravam. Reordenar
    // alfabeticamente aqui trocaria a causa pelo agravante.
    montar({
      severity: "CRITICAL",
      severity_reason: ["SCORE_BELOW_CRIT", "CROSS_INTENT_PENALTY"],
    });
    const linha = screen.getByText(/escore abaixo do crítico/);
    expect(linha.textContent).toMatch(/escore abaixo do crítico.*contaminação entre intenções/);
  });

  it("`null` é DITO — produtor que não declarou não vira silêncio", () => {
    // Veredito sem explicação é o defeito. "Não publicado" é honesto onde o silêncio não é.
    montar({ severity: "WARN", severity_reason: null });
    expect(screen.getByText(/não publicado/)).toBeInTheDocument();
  });

  it("`[]` não desenha linha nenhuma — declarou e não há motivo", () => {
    montar({ severity: "WARN", severity_reason: [] });
    expect(screen.queryByText(/não publicado/)).toBeNull();
    expect(screen.queryByText(/respostas fora da intenção/)).toBeNull();
  });

  it("veredito OK não mostra motivo, mesmo quando há um", () => {
    // `OK` com `CROSS_INTENT_PENALTY` é caso REAL: a penalidade é registrada sem mudar o
    // veredito. Mostrá-la ao lado de um OK sugeriria um problema que o produtor não declarou.
    montar({ severity: "OK", severity_reason: ["CROSS_INTENT_PENALTY"] });
    expect(screen.queryByText(/contaminação entre intenções/)).toBeNull();
  });

  it("código DESCONHECIDO sai cru — sumir seria pior que não traduzir", () => {
    // O vocabulário é aberto no contrato de propósito: código novo no motor chega ao consumidor
    // em vez de derrubar a montagem. Aqui isso vira a regra do `default`.
    montar({ severity: "WARN", severity_reason: ["MOTIVO_QUE_AINDA_NAO_EXISTE"] });
    expect(screen.getByText(/MOTIVO_QUE_AINDA_NAO_EXISTE/)).toBeInTheDocument();
  });
});
