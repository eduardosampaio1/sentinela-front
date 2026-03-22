import type { AnalysisResult } from "./api";
import {
  getActualHandoffs,
  getConversionRisk,
  getCostPerUsefulOutcome,
  getEstimatedHandoffCost,
  getHandoffCostMonthly,
  getHandoffCostYearly,
  getObservedHandoffCostTotal,
  getObservedTokenCostTotal,
  getTokenCostMonthly,
  getTokenCostWaste,
  getTokenCostYearly,
  getTotalEstimatedCost,
  getUsefulOutcomes,
  getUsefulRate,
} from "./analysisAdapter";

export type EconomicsMetricTone = "observed" | "derived" | "projected" | "neutral";

export interface EconomicsHeroMetric {
  id: "cpuo" | "useful-rate" | "observed-total-cost";
  label: string;
  value: number | null;
  displayValue: string;
  supportingText: string;
}

export interface EconomicsDetailMetric {
  id: string;
  label: string;
  value: number | null;
  displayValue: string;
  supportingText: string;
  tone: EconomicsMetricTone;
}

export interface EconomicsPanelModel {
  hero: EconomicsHeroMetric[];
  details: EconomicsDetailMetric[];
  usefulOutcomes: number | null;
  available: boolean;
  notes: string[];
}

function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  if (value > 0 && value < 0.01) return "US$ <0.01";
  return `US$ ${value.toFixed(2)}`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  return `${value.toFixed(1)}%`;
}

export function buildEconomicsPanelModel(result: AnalysisResult | null): EconomicsPanelModel {
  const cpuo = getCostPerUsefulOutcome(result);
  const usefulRate = getUsefulRate(result);
  const usefulOutcomes = getUsefulOutcomes(result);
  const observedTokenCost = getObservedTokenCostTotal(result);
  const observedHandoffCost = getObservedHandoffCostTotal(result);
  const totalEstimatedCost = getTotalEstimatedCost(result);
  const tokenCostWaste = getTokenCostWaste(result);
  const estimatedHandoffCost = getEstimatedHandoffCost(result);
  const conversionRisk = getConversionRisk(result);
  const tokenCostMonthly = getTokenCostMonthly(result);
  const tokenCostYearly = getTokenCostYearly(result);
  const handoffCostMonthly = getHandoffCostMonthly(result);
  const handoffCostYearly = getHandoffCostYearly(result);
  const actualHandoffs = getActualHandoffs(result);

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
      supportingText:
        "Observed token cost plus observed handoff cost for the analyzed dataset.",
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
      supportingText: actualHandoffs === null
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
      supportingText: "Projected handoff burden derived from containment pressure and expected escalation.",
      tone: "derived",
    },
    {
      id: "conversion-risk",
      label: "Conversion Risk",
      value: conversionRisk,
      displayValue: formatPercent(conversionRisk),
      supportingText: "Projected revenue or completion pressure derived from the current system state.",
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
    available: hero.some((item) => item.value !== null) || details.some((item) => item.value !== null),
    notes: [
      "All currency values are displayed in USD.",
      "Observed values come from the analyzed dataset; projected values are engine extrapolations.",
    ],
  };
}
