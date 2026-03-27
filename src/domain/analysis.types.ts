// ============================================================
// Domain: Analysis Types
// These are the internal domain models, mapped from API responses
// via adapters. Components should use these types, not raw API types.
// ============================================================

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertSeverity = "critical" | "high" | "warning" | "info";
export type AnalysisDataSource = "cached" | "fresh";

export interface DomainAlert {
  id: string;
  severity: AlertSeverity;
  intent?: string | null;
  title: string;
  problem: string;
  recommendation: string;
  firstSeen?: string;
  lastSeen?: string;
  status: "open" | "resolved";
}

export interface DomainIntentScore {
  intent: string;
  score: number;
  nConversations?: number;
  responseVariance?: number;
  responseStabilityScore?: number;
  meanAssistantChars?: number;
  stdAssistantChars?: number;
  severity?: string;
}

export interface DomainArgosScores {
  aiHealthScore?: number | null;
  behaviorScore?: number | null;
  costPerUsefulOutcome?: number | null;
  [key: string]: number | null | undefined;
}

export interface DomainArgosSignals {
  semantic?: Record<string, number>;
  structural?: Record<string, number>;
  behavioral?: Record<string, number>;
  [key: string]: Record<string, number> | undefined;
}

export interface DomainIssue {
  issueId?: string;
  issueType?: string;
  severity?: string;
  confidence?: number;
  title?: string;
  summary?: string;
  category?: string;
  recommendation?: string;
}

export interface DomainRecommendation {
  priority?: number;
  action?: string;
  title?: string;
  reason?: string;
  expectedImpact?: string;
}

export interface EconomicSavingsDrivers {
  tokenWaste: number;
  handoffInefficiency: number;
  lowUsefulRate: number;
}

export interface EconomicSavingsRange {
  min: number;
  max: number;
}

export interface EconomicImpact {
  currentCost: number;
  optimizedCostEstimate: number;
  avoidedCost: number;
  avoidedCostRange: EconomicSavingsRange;
  drivers: EconomicSavingsDrivers;
}

export interface EconomicExplanation {
  summary: string;
  assumptions: string[];
  confidence: "high" | "medium" | "low";
  lowDataWarning?: string | null;
}

export interface DomainBusinessImpact {
  costPerUsefulOutcome?: number | null;
  usefulRate?: number | null;
  usefulOutcomes?: number | null;
  totalEstimatedCost?: number | null;
  observedTokenCostTotal?: number | null;
  observedHandoffCostTotal?: number | null;
  tokenCostWaste?: number | null;
  estimatedHandoffCost?: number | null;
  conversionRisk?: number | null;
  tokenCostMonthly?: number | null;
  tokenCostYearly?: number | null;
  handoffCostMonthly?: number | null;
  handoffCostYearly?: number | null;
  actualHandoffs?: number | null;
  // Sprint 3: ROI Engine
  avoidedCost?: number | null;
  optimizedCostEstimate?: number | null;
  avoidedCostRange?: EconomicSavingsRange | null;
  economicImpact?: EconomicImpact | null;
  economicExplanation?: EconomicExplanation | null;
  economicModelVersion?: string | null;
}

export interface DomainAnalysis {
  // Identity — required: every analysis must have stable identity for cache/interp/navigation
  analysisId: string;
  analysisRunId: string;
  datasetHash?: string;
  analyzedAt: string;
  engineVersion?: string;

  // Context
  workspaceId?: string;
  projectId?: string;
  environmentId?: string;

  // Core metrics
  consistencyScore: number;
  globalConfidence?: number | null;
  riskLevel?: RiskLevel;
  nConversations?: number;
  nIntents?: number;

  // Behavior
  tokenWasteEstimate: number;
  crossIntentSimilarity: number;
  responseVariance?: number | null;
  responseStabilityScore?: number | null;
  intentCoverageScore?: number | null;
  coveredIntents?: number | null;
  totalIntents?: number | null;
  minSamplesPerIntent?: number | null;
  underrepresentedIntents?: string[];

  // Alerts and issues
  criticalAlertsCount: number;
  alerts: DomainAlert[];
  issues?: DomainIssue[];

  // Intents
  intents?: DomainIntentScore[];

  // Deep analysis (Argos v2)
  scores?: DomainArgosScores;
  signals?: DomainArgosSignals;
  recommendations?: DomainRecommendation[];
  businessImpact?: DomainBusinessImpact;
  executiveSummary?: string | null;

  // Computed
  behaviorScore?: number | null;
  semanticDrift?: number | null;
  aiHealthScore?: number | null;

  // Sprint 4: Structured recommendation contract
  sprint4?: Sprint4Raw | null;

  // Meta
  warnings: string[];
  cacheKey?: string;
}

// Sprint 4 raw domain types (before view model mapping)
export interface Sprint4Raw {
  top: Sprint4RecommendationRaw | null;
  secondary: Sprint4RecommendationRaw[];
  modelVersion: string;
}

export interface Sprint4RecommendationRaw {
  id: string;
  priority: number;
  title: string;
  problem: string;
  impact: {
    type: string;
    estimatedSavings: number | null;
    riskReduction: string;
  };
  evidence: {
    usefulRate?: number;
    actualHandoffs?: number;
    signals?: string[];
  };
  action: {
    summary: string;
    steps: string[];
    category: string;
  };
  confidence: number;
  priorityScore: number;
  actionCategory: string;
}
