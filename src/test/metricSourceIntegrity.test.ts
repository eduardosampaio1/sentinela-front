/**
 * Integridade de origem das métricas — Fase 1 e 2 do veredito do Ceifador.
 *
 * FASE 1 — cada tile lê UM campo. Sem cadeia de fallback.
 *   O bug: extractBehaviorScore tentava
 *     BEHAVIOR_SCORE -> behavior_score -> AI_HEALTH_SCORE -> ai_health_score -> global_confidence
 *   O motor nunca emite BEHAVIOR_SCORE, entao vencia o AI_HEALTH_SCORE: a tela dizia
 *   "Behavior Score 67.6%" exibindo o score COMPOSTO. E o ultimo elo era a CONFIANCA —
 *   se o health faltasse, o tile de comportamento mostraria confianca.
 *   Mesma mecanica no drift: semantic_drift -> semantic_dispersion -> semantic_entropy.
 *
 * FASE 2 — o front precisa respeitar confidence_detail.
 *   O motor declara, por score, status/confidence/limitations. A tela ignorava e exibia
 *   "High certainty" sobre um AI_HEALTH_SCORE que o proprio motor marca como
 *   status: partial, confidence: low (0.6).
 */

import { describe, expect, it } from "vitest";

import {
  extractBehaviorScore,
  extractSemanticDrift,
  extractScoreConfidence,
} from "@/adapters/analysisAdapter";
import type { AnalysisResult } from "@/lib/api";

/** Payload com a forma REAL de producao (analysis bed12577). */
function realShapedResult(overrides: Record<string, unknown> = {}): AnalysisResult {
  return {
    analysis_id: "a-1",
    global_confidence: 1.0,
    argos_v2: {
      scores: {
        AI_HEALTH_SCORE: 67.61,
        BEHAVIORAL_HEALTH_SCORE: 55.45,
        ECONOMIC_HEALTH_SCORE: 70.26,
        SEMANTIC_HEALTH_SCORE: 65.64,
        STRUCTURAL_HEALTH_SCORE: 89.86,
      },
      signals: {
        semantic: { semantic_dispersion: 0.4409, semantic_entropy: 0.31 },
      },
      evidence: {
        interaction_session_metrics_summary: { session_drift_score: 0.4554 },
      },
    },
    confidence_detail: {
      scores: {
        AI_HEALTH_SCORE: {
          value: 67.61,
          status: "partial",
          confidence: "low",
          confidence_score: 0.6,
          limitations: ["partial dependencies: ECONOMIC_HEALTH_SCORE"],
        },
        BEHAVIORAL_HEALTH_SCORE: {
          value: 55.45,
          status: "available",
          confidence: "high",
          confidence_score: 0.88,
          limitations: [],
        },
      },
    },
    ...overrides,
  } as unknown as AnalysisResult;
}

// ── FASE 1 — um campo por tile ────────────────────────────────────────────────

describe("extractBehaviorScore — sem cadeia de fallback", () => {
  it("le BEHAVIORAL_HEALTH_SCORE, nao o composto AI_HEALTH_SCORE", () => {
    expect(extractBehaviorScore(realShapedResult())).toBe(55.45);
  });

  it("devolve null quando o campo falta — nunca cai para AI_HEALTH_SCORE", () => {
    const r = realShapedResult({
      argos_v2: { scores: { AI_HEALTH_SCORE: 67.61 }, signals: {}, evidence: {} },
    });
    expect(extractBehaviorScore(r)).toBeNull();
  });

  it("devolve null quando o campo falta — nunca cai para global_confidence", () => {
    const r = realShapedResult({
      argos_v2: { scores: {}, signals: {}, evidence: {} },
      global_confidence: 1.0,
    });
    expect(extractBehaviorScore(r)).toBeNull();
  });
});

describe("extractSemanticDrift — drift de verdade, nao dispersao", () => {
  it("le session_drift_score de evidence", () => {
    expect(extractSemanticDrift(realShapedResult())).toBe(45.54);
  });

  it("devolve null quando nao ha drift — nunca cai para semantic_dispersion", () => {
    const r = realShapedResult({
      argos_v2: {
        scores: {},
        signals: { semantic: { semantic_dispersion: 0.4409 } },
        evidence: {},
      },
    });
    expect(extractSemanticDrift(r)).toBeNull();
  });
});

// ── FASE 2 — respeitar confidence_detail ──────────────────────────────────────

describe("extractScoreConfidence — a explicabilidade que o motor ja publica", () => {
  it("expoe status, confianca e limitacoes declaradas pelo motor", () => {
    const c = extractScoreConfidence(realShapedResult(), "AI_HEALTH_SCORE");
    expect(c).toEqual({
      status: "partial",
      confidence: "low",
      confidenceScore: 0.6,
      limitations: ["partial dependencies: ECONOMIC_HEALTH_SCORE"],
    });
  });

  it("nao inventa confianca alta quando o motor nao declarou nada", () => {
    const r = realShapedResult({ confidence_detail: {} });
    expect(extractScoreConfidence(r, "AI_HEALTH_SCORE")).toBeNull();
  });

  it("distingue o score confiavel do score parcial no mesmo payload", () => {
    const r = realShapedResult();
    expect(extractScoreConfidence(r, "BEHAVIORAL_HEALTH_SCORE")?.confidence).toBe("high");
    expect(extractScoreConfidence(r, "AI_HEALTH_SCORE")?.confidence).toBe("low");
  });
});
