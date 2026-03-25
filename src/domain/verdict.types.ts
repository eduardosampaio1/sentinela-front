// ============================================================
// Domain: Verdict and Decision Types
// ============================================================

export type DecisionVerdict = "Healthy" | "Watch" | "Degraded" | "Critical";
export type MetricTone = "safe" | "watch" | "risk" | "neutral";
export type MetricDirection = "higher_better" | "lower_better";
export type ConfidenceCertainty = "high" | "medium" | "low" | "unknown";

// --- Verdict Strip ---

export interface VerdictModel {
  verdict: DecisionVerdict;
  message: string;
  certainty: ConfidenceCertainty;
  certaintyLabel: string;
  escalated: boolean;
  score?: number | null;
}

// --- Risk ---

export interface RiskModel {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string;
  impact: string;
  category?: string;
}

// --- Recommendation ---

export interface RecommendationModel {
  headline: string;
  context: string;
  expectedImpact?: string;
  primaryCtaLabel: string;
  secondaryCtaLabel?: string;
  escalated: boolean;
}

// --- Economics ---

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
  tone: "observed" | "derived" | "projected" | "neutral";
}

export interface EconomicsViewModel {
  hero: EconomicsHeroMetric[];
  details: EconomicsDetailMetric[];
  usefulOutcomes: number | null;
  available: boolean;
  notes: string[];
}

// --- Confidence ---

export interface ConfidenceModel {
  percent: number | null;
  displayValue: string;
  certainty: ConfidenceCertainty;
  limitingFactors: string[];
  tone: MetricTone;
}

// --- Core Metric Card ---

export interface CoreMetricViewModel {
  id: "behavior-score" | "drift" | "cost-per-useful-outcome" | "confidence";
  label: string;
  value: number | null;
  displayValue: string;
  direction: MetricDirection;
  missing: boolean;
  missingLabel?: string;
  operationalNote: string;
  tone: MetricTone;
}

// --- Decision Layer (full executive view model) ---

export interface DecisionViewModel {
  verdict: VerdictModel;
  topRisk: RiskModel | null;
  recommendation: RecommendationModel;
  economics: EconomicsViewModel;
  confidence: ConfidenceModel;
  coreMetrics: CoreMetricViewModel[];
  recurrence: RecurrenceModel;
}

export interface RecurrenceModel {
  recurring: boolean;
  repeatedRuns: number;
  focus: string | null;
}

// --- Problem item (for internal processing) ---

export interface ProblemItem {
  id: string;
  title: string;
  impact: string;
  affectedInteractions: string;
  severity: "critical" | "high" | "medium" | "low";
  category?: string;
}

export interface RecommendationItem {
  title: string;
  reason: string;
  expectedImpact: string;
  priority?: number;
}
