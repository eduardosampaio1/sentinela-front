// ============================================================
// Economics Adapter
// Builds EconomicsViewModel from DomainAnalysis
// ============================================================

import type { DomainAnalysis } from "@/domain/analysis.types";
import type { EconomicsViewModel, EconomicsHeroMetric, EconomicsDetailMetric } from "@/domain/verdict.types";

function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  if (value > 0 && value < 0.01) return "US$ <0.01";
  return `US$ ${value.toFixed(2)}`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  return `${value.toFixed(1)}%`;
}

export function buildEconomicsViewModel(analysis: DomainAnalysis): EconomicsViewModel {
  const bi = analysis.businessImpact ?? {};

  const cpuo = bi.costPerUsefulOutcome ?? null;
  const usefulRate = bi.usefulRate ?? null;
  const usefulOutcomes = bi.usefulOutcomes ?? null;
  const totalEstimatedCost = bi.totalEstimatedCost ?? null;
  const observedTokenCost = bi.observedTokenCostTotal ?? null;
  const observedHandoffCost = bi.observedHandoffCostTotal ?? null;
  const tokenCostWaste = bi.tokenCostWaste ?? null;
  const estimatedHandoffCost = bi.estimatedHandoffCost ?? null;
  const conversionRisk = bi.conversionRisk ?? null;
  const tokenCostMonthly = bi.tokenCostMonthly ?? null;
  const tokenCostYearly = bi.tokenCostYearly ?? null;
  const handoffCostMonthly = bi.handoffCostMonthly ?? null;
  const handoffCostYearly = bi.handoffCostYearly ?? null;
  const actualHandoffs = bi.actualHandoffs ?? null;

  const hero: EconomicsHeroMetric[] = [
    {
      id: "cpuo",
      label: "Cost per Useful Outcome",
      value: cpuo,
      displayValue: formatUsd(cpuo),
      supportingText:
        cpuo === null
          ? "Requires outcome and cost signals in the dataset."
          : "Observed total cost divided by useful outcomes.",
    },
    {
      id: "useful-rate",
      label: "Useful Rate",
      value: usefulRate,
      displayValue: formatPercent(usefulRate),
      supportingText:
        usefulOutcomes === null
          ? "Useful outcome count not available for this run."
          : `${usefulOutcomes} useful outcomes detected in this run.`,
    },
    {
      id: "observed-total-cost",
      label: "Observed Total Cost",
      value: totalEstimatedCost,
      displayValue: formatUsd(totalEstimatedCost),
      supportingText: "Observed token cost plus observed handoff cost for the analyzed dataset.",
    },
  ];

  const details: EconomicsDetailMetric[] = [
    {
      id: "observed-token-cost",
      label: "Observed Token Cost",
      value: observedTokenCost,
      displayValue: formatUsd(observedTokenCost),
      supportingText: "Sum of trace.estimated_cost_usd observed in the analyzed dataset.",
      tone: "observed",
    },
    {
      id: "observed-handoff-cost",
      label: "Observed Handoff Cost",
      value: observedHandoffCost,
      displayValue: formatUsd(observedHandoffCost),
      supportingText:
        actualHandoffs === null
          ? "Observed cost attributed to actual handoffs in this dataset."
          : `Observed cost attributed to ${actualHandoffs} actual handoffs in this dataset.`,
      tone: "observed",
    },
    {
      id: "token-waste-cost",
      label: "Token Waste Cost",
      value: tokenCostWaste,
      displayValue: formatUsd(tokenCostWaste),
      supportingText: "Projected cost of verbose or inefficient responses, derived by the engine.",
      tone: "derived",
    },
    {
      id: "estimated-handoff-cost",
      label: "Estimated Handoff Cost",
      value: estimatedHandoffCost,
      displayValue: formatUsd(estimatedHandoffCost),
      supportingText:
        "Projected handoff burden derived from containment pressure and expected escalation.",
      tone: "derived",
    },
    {
      id: "conversion-risk",
      label: "Conversion Risk",
      value: conversionRisk,
      displayValue: formatPercent(conversionRisk),
      supportingText:
        "Projected revenue or completion pressure derived from the current system state.",
      tone: "derived",
    },
    {
      id: "projected-token-cost-month",
      label: "Projected Token Cost / Month",
      value: tokenCostMonthly,
      displayValue: formatUsd(tokenCostMonthly),
      supportingText: "Projected monthly token cost extrapolated by the engine.",
      tone: "projected",
    },
    {
      id: "projected-token-cost-year",
      label: "Projected Token Cost / Year",
      value: tokenCostYearly,
      displayValue: formatUsd(tokenCostYearly),
      supportingText: "Projected yearly token cost extrapolated by the engine.",
      tone: "projected",
    },
    {
      id: "projected-handoff-cost-month",
      label: "Projected Handoff Cost / Month",
      value: handoffCostMonthly,
      displayValue: formatUsd(handoffCostMonthly),
      supportingText: "Projected monthly handoff burden extrapolated by the engine.",
      tone: "projected",
    },
    {
      id: "projected-handoff-cost-year",
      label: "Projected Handoff Cost / Year",
      value: handoffCostYearly,
      displayValue: formatUsd(handoffCostYearly),
      supportingText: "Projected yearly handoff burden extrapolated by the engine.",
      tone: "projected",
    },
  ];

  return {
    hero,
    details,
    usefulOutcomes,
    available:
      hero.some((m) => m.value !== null) || details.some((m) => m.value !== null),
    notes: [
      "All currency values are displayed in USD.",
      "Observed values come from the analyzed dataset; projected values are engine extrapolations.",
    ],
  };
}
