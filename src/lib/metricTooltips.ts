/**
 * Central dictionary of metric tooltips for Sentinela.
 * Plain English, written for a business user who needs to make a decision —
 * not for an engineer who built the engine.
 */
export const METRIC_TOOLTIPS = {
  // ─── Core metrics ──────────────────────────────────────────────────────────

  behaviorScore:
    "Overall health score for the AI's behavior (0–100). Tells you whether the system is delivering useful, stable responses. Higher is better — the recommended minimum target is 70.",

  semanticDrift:
    "How far the AI's current behavior has shifted from its expected baseline. A high value means responses are becoming inconsistent or off-pattern. Lower is better.",

  drift:
    "The level of behavioral deviation from the baseline. Controlled = within expected range. Elevated = trending toward instability, watch closely. High = real degradation risk, action recommended.",

  cpuo:
    "Cost per Useful Outcome. How many dollars you spend for each interaction that actually delivered value. Lower means the AI is being used efficiently.",

  confidence:
    "How reliable the current analysis readout is. High = strong evidence, safe to act on. Moderate = directionally correct but not conclusive. Low = validate manually before making major decisions.",

  verdict:
    "The overall system diagnosis for this run. Healthy = operating well. Watch = some signals need monitoring. Degraded = performance below expectations, investigate. Critical = immediate action required.",

  targetGap:
    "The difference between the current Behavior Score and the minimum target of 70. A negative number means the system is still below target — the more negative, the further from the goal.",

  // ─── Economics metrics ─────────────────────────────────────────────────────

  usefulRate:
    "The percentage of interactions that produced a useful outcome for the user. Higher is better — it means the AI is fulfilling its purpose most of the time.",

  observedTotalCost:
    "Total observed cost for the analyzed sample, combining LLM token usage and any human escalation (handoff) costs.",

  tokenWasteCost:
    "Estimated cost of tokens consumed in interactions that produced no useful outcome. This is direct budget waste — money spent with no return.",

  observedTokenCost:
    "Cost of LLM tokens consumed by interactions in the analyzed sample. This is the direct processing cost of every message sent through the system.",

  observedHandoffCost:
    "Actual cost of human escalations (handoffs) within the analyzed sample. Frequent handoffs mean the AI isn't resolving issues on its own.",

  estimatedHandoffCost:
    "Estimated handoff cost calculated from the observed escalation rate, used when the real handoff cost wasn't reported directly.",

  conversionRisk:
    "Estimated probability that the identified problems will cause conversion loss or a drop in user satisfaction. Lower is better.",

  projectedTokenCostMonth:
    "Projected LLM token cost over the next 30 days, based on current observed volume. Useful for monthly budget planning.",

  projectedTokenCostYear:
    "Projected LLM token cost over the next 12 months, based on current observed volume. Useful for annual budget planning.",

  projectedHandoffCostMonth:
    "Projected human escalation cost over the next 30 days, based on the current handoff rate.",

  projectedHandoffCostYear:
    "Projected human escalation cost over the next 12 months, based on the current handoff rate.",

  // ─── Behavioral metrics ────────────────────────────────────────────────────

  consistency:
    "Measures whether the system responds consistently to similar questions. High consistency means the model is predictable and reliable — users get comparable answers for comparable queries.",

  responseStability:
    "Stability of responses over time. A drop in this value indicates the model's behavior is varying unexpectedly across conversations or time periods.",

  crossIntentSimilarity:
    "Semantic similarity between responses across different intent categories. A very high value may mean the model is conflating question types or giving overly generic answers.",

  // ─── Panel-level context ───────────────────────────────────────────────────

  certainty:
    "The engine's confidence level in the current diagnosis. High = strong supporting evidence. Medium = directionally correct. Low = treat as a signal, not a conclusion.",

  decisionPosture:
    "Guidance on how to act based on the current diagnosis — whether to monitor, investigate, or take immediate action.",

  spendingSignal:
    "A combined view of cost per useful outcome, useful rate, and waste cost. Shows whether response quality is translating into efficient budget use.",
} as const;

export type MetricTooltipKey = keyof typeof METRIC_TOOLTIPS;
