import { describe, expect, it } from "vitest";
import { mapApiToDashboard } from "@/lib/api";
import {
  getAIHealthScore,
  getAnalysisRunId,
  getBaselineComparison,
  getBehaviorScore,
  getBusinessImpact,
  getConfidencePercent,
  getCostPerUsefulOutcome,
  getExecutiveSummary,
  getSemanticDrift,
  getSignalValue,
} from "@/lib/analysisAdapter";

describe("analysis contract adapter", () => {
  it("reads canonical and fallback fields from the mapped dashboard payload", () => {
    const mapped = mapApiToDashboard({
      analysis_id: "analysis-123",
      analysis_run_id: "run-456",
      workspace_id: "ws-1",
      project_id: "prj-1",
      environment_id: "env-1",
      analyzed_at: "2026-03-19T12:00:00.000Z",
      consistency_score: 0.82,
      global_confidence: 0.91,
      risk_level: "MEDIUM",
      n_conversations: 120,
      n_intents: 8,
      token_waste_estimate: 0.13,
      cross_intent_similarity: 0.44,
      response_variance: 0.21,
      response_stability_score: 0.79,
      critical_alerts_count: 1,
      alerts: [],
      argos_v2: {
        contract_version: "1.0.0",
        scores: {
          AI_HEALTH_SCORE: 0.88,
          BEHAVIOR_SCORE: 0.84,
          COST_PER_USEFUL_OUTCOME: 0.42,
        },
        signals: {
          semantic: {
            semantic_drift: 0.27,
            semantic_entropy: 0.31,
          },
          economic: {
            token_efficiency: 0.73,
          },
        },
        business_impact: {
          cost_per_useful_outcome: 0.55,
          projected_ticket_deflection: "moderate",
        },
        executive_summary: "Argos summary",
        metadata: {
          analysis_run_id: "run-456",
          baseline_comparison: {
            delta_ai_health_score: -2.4,
          },
        },
        evidence: {
          strongest_signal: "semantic drift",
        },
      },
      executive_summary: "Top level summary",
      business_impact: {
        cost_per_useful_outcome: 0.48,
      },
      baseline_comparison: {
        delta_ai_health_score: -1.9,
      },
    });

    expect(getAnalysisRunId(mapped)).toBe("run-456");
    expect(getBehaviorScore(mapped)).toBe(84);
    expect(getAIHealthScore(mapped)).toBe(88);
    expect(getConfidencePercent(mapped)).toBe(91);
    expect(getSemanticDrift(mapped)).toBe(27);
    expect(getSignalValue(mapped, "economic", ["token_efficiency"])).toBe(73);
    expect(getCostPerUsefulOutcome(mapped)).toBe(0.48);
    expect(getExecutiveSummary(mapped)).toBe("Top level summary");
    expect(getBusinessImpact(mapped)).toEqual(
      expect.objectContaining({ cost_per_useful_outcome: 0.48 }),
    );
    expect(getBaselineComparison(mapped)).toEqual(
      expect.objectContaining({ delta_ai_health_score: -1.9 }),
    );
  });

  it("falls back to argos metadata when top-level run id is absent", () => {
    const mapped = mapApiToDashboard({
      analysis_id: "analysis-999",
      workspace_id: "ws-1",
      project_id: "prj-1",
      environment_id: "env-1",
      analyzed_at: "2026-03-19T12:00:00.000Z",
      consistency_score: 0.75,
      token_waste_estimate: 0.11,
      cross_intent_similarity: 0.25,
      critical_alerts_count: 0,
      alerts: [],
      argos_v2: {
        contract_version: "1.0.0",
        metadata: {
          job_id: "job-xyz",
        },
      },
    });

    expect(getAnalysisRunId(mapped)).toBe("job-xyz");
    expect(mapped._warnings.some((item) => item.includes("analysis_run_id"))).toBe(true);
  });
});
