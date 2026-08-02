import { describe, expect, it } from "vitest";
import { linhaHistoricoDe } from "./historicoView";
import type { AnalysisListItem } from "@/lib/v1";

/**
 * O adapter existe para que a decisão sobre **o que não existe** fique num lugar só.
 *
 * Sem ele, cada tela migrada escolheria por conta própria o que pôr no lugar dos campos
 * ausentes — e uma delas escolheria `0`. Estes testes congelam a escolha: ausência é `null`,
 * e `null` chega à tela como ausência.
 */

const BASE: AnalysisListItem = {
  analysis_id: "an-1",
  status: "completed",
  record_count: 120,
  result_available: true,
  created_at: "2026-08-01T10:00:00Z",
};

describe("linha de histórico canônica", () => {
  it("projeta os campos que o backend afirma", () => {
    expect(
      linhaHistoricoDe({ ...BASE, engine_version: "engine-9.9", observed_conversations: 42 }),
    ).toEqual({
      analysisId: "an-1",
      status: "completed",
      createdAt: "2026-08-01T10:00:00Z",
      recordCount: 120,
      nConversations: 42,
      engineVersion: "engine-9.9",
      resultAvailable: true,
    });
  });

  it("campo ausente vira null, NUNCA zero nem string vazia", () => {
    // `0` numa coluna de contagem e `""` numa de versão sao lidos como medicao. Ausência
    // precisa chegar à tela como ausência para ser renderizada como tal.
    const linha = linhaHistoricoDe(BASE);
    expect(linha.nConversations).toBeNull();
    expect(linha.engineVersion).toBeNull();
  });

  it("null explícito do backend é preservado como null", () => {
    const linha = linhaHistoricoDe({
      ...BASE,
      engine_version: null,
      observed_conversations: null,
    });
    expect(linha.nConversations).toBeNull();
    expect(linha.engineVersion).toBeNull();
  });

  it("zero medido é preservado como zero, e não confundido com ausência", () => {
    // A distinção que o `?? null` protege: `0` medido é um fato, e tem de sobreviver.
    expect(linhaHistoricoDe({ ...BASE, observed_conversations: 0 }).nConversations).toBe(0);
  });

  it("não inventa risk_level nem n_intents", () => {
    // Não existem no modelo canônico. O tipo não os declara, e o adapter não os produz —
    // nem como null, que sugeriria que um dia chegam por este caminho.
    const linha = linhaHistoricoDe({ ...BASE, observed_conversations: 7 }) as Record<string, unknown>;
    expect("riskLevel" in linha).toBe(false);
    expect("nIntents" in linha).toBe(false);
  });
});
