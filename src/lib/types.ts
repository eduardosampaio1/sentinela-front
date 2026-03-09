export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AlertSeverity = "critical" | "high" | "warning" | "info";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  intent?: string | null;
  title?: string;
  problem: string;
  recommendation: string;
  first_seen?: string;
  last_seen?: string;
  status?: "open" | "resolved";
}

export interface IntentScore {
  intent: string;
  score: number;
  n_conversations?: number;
  response_variance?: number;
  response_stability_score?: number;
  mean_assistant_chars?: number;
  std_assistant_chars?: number;
  severity?: string;
}

export interface AnalysisResponse {
  analysis_id?: string;
  dataset_hash?: string;
  created_at?: string;
  engine_version?: string;
  consistency_score?: number;
  global_confidence?: number;
  risk_level?: RiskLevel;
  n_conversations?: number;
  n_intents?: number;
  token_waste_estimate?: number;
  cross_intent_similarity?: number;
  response_variance?: number;
  response_stability_score?: number;
  intent_coverage_score?: number;
  covered_intents?: number;
  total_intents?: number;
  min_samples_per_intent?: number;
  underrepresented_intents?: string[];
  critical_alerts_count?: number;
  waste_rate?: number;
  alerts?: AlertItem[];
  intent_scores?: IntentScore[];
}
