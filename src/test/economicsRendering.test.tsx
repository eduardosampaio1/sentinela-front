import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CoreMetricsRow from "@/components/dashboard-decision/CoreMetricsRow";
import { mapApiToDashboard } from "@/lib/api";
import type { CoreMetricCardModel } from "@/lib/decisionLayerModel";
import { buildEconomicsPanelModel } from "@/lib/economicsModel";

function metric(overrides: Partial<CoreMetricCardModel>): CoreMetricCardModel {
  return {
    id: "behavior-score",
    label: "Metric",
    value: 62,
    displayValue: "62.0%",
    direction: "higher_better",
    missing: false,
    emphasis: "normal",
    operationalNote: "ok",
    tone: "watch",
    ...overrides,
  };
}

describe("economics rendering", () => {
  it("shows cost metrics without duplicating the currency prefix", () => {
    render(
      <CoreMetricsRow
        items={[
          metric({
            id: "behavior-score",
            label: "Behavior Score",
            value: 62,
            displayValue: "62.0%",
          }),
          metric({
            id: "drift",
            label: "Drift",
            value: 18,
            displayValue: "18.0%",
            direction: "lower_better",
            tone: "safe",
          }),
          metric({
            id: "cost-per-useful-outcome",
            label: "Cost per Useful Outcome",
            value: 0.48,
            displayValue: "US$ 0.48",
            direction: "lower_better",
            tone: "watch",
          }),
          metric({
            id: "confidence",
            label: "Confidence",
            value: 72,
            displayValue: "72.0%",
            tone: "watch",
          }),
        ]}
      />,
    );

    expect(screen.getAllByText("US$ 0.48").length).toBeGreaterThan(0);
    expect(screen.queryByText("$US$ 0.48")).not.toBeInTheDocument();
  });

  it("keeps observed economics from argos_v2 when top-level business_impact is partial", () => {
    const result = mapApiToDashboard({
      analysis_id: "analysis-eco-1",
      analyzed_at: "2026-03-21T12:00:00.000Z",
      consistency_score: 72,
      global_confidence: 0.81,
      risk_level: "HIGH",
      n_conversations: 12,
      n_intents: 3,
      token_waste_estimate: 0,
      cross_intent_similarity: 0,
      critical_alerts_count: 0,
      alerts: [],
      business_impact: {
        ai_health_score: 62.05,
        estimated_handoff_cost: 28.8,
        token_cost_waste: 0,
        conversion_risk: 0.395,
        token_cost_monthly: 0,
        token_cost_yearly: 0,
        handoff_cost_monthly: 28.8,
        handoff_cost_yearly: 345.6,
      },
      argos_v2: {
        contract_version: "2.0",
        scores: {
          AI_HEALTH_SCORE: 62.05,
        },
        signals: {},
        issues: [],
        evidence: {},
        recommendations: [],
        business_impact: {
          ai_health_score: 62.05,
          estimated_handoff_cost: 28.8,
          token_cost_waste: 0,
          conversion_risk: 0.395,
          token_cost_monthly: 0,
          token_cost_yearly: 0,
          handoff_cost_monthly: 28.8,
          handoff_cost_yearly: 345.6,
          cost_per_useful_outcome: 12.2,
          useful_outcomes: 1,
          useful_rate: 0.5,
          observed_token_cost_total: 0.2,
          observed_handoff_cost_total: 12.0,
          total_estimated_cost: 12.2,
          actual_handoffs: 1,
        },
        metadata: {},
      },
    });

    const economics = buildEconomicsPanelModel(result);

    expect(economics.hero[0].displayValue).toBe("US$ 12.20");
    expect(economics.hero[1].displayValue).toBe("50.0%");
    expect(economics.hero[2].displayValue).toBe("US$ 12.20");
    expect(economics.details.find((metric) => metric.id === "observed-token-cost")?.displayValue).toBe(
      "US$ 0.20",
    );
    expect(economics.details.find((metric) => metric.id === "observed-handoff-cost")?.displayValue).toBe(
      "US$ 12.00",
    );
  });
});
