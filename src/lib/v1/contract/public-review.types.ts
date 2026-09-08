// Analysis Context e Sentinela Review são projeções públicas opcionais. Elas interpretam as
// medições oficiais, sem expor a identidade operacional do processamento assíncrono.
export type ContextItemState = "suggested" | "accepted" | "edited" | "rejected";
export type ContextCategory =
  "objective" | "critical_journey" | "expected_behavior" | "risk" | "success_indicator" | "operational_constraint";

export interface ContextItemView {
  item_id: string;
  category: ContextCategory;
  text: string;
  state: ContextItemState;
  confidence?: number | null;
  source_span?: { start: number; end: number } | null;
}

export interface ContextStructureView {
  items: ContextItemView[];
}
export interface AnalysisContextView {
  context_contract_version?: string;
  context_id?: string;
  analysis_id: string;
  version?: number;
  state: "empty" | "unavailable" | "draft" | "sealed";
  original_text?: string;
  structured?: ContextStructureView;
  privacy_clearance?: "passed" | "not_required" | "unavailable";
  privacy_policy_version?: string | null;
  context_digest?: string;
  created_at?: string;
  updated_at?: string;
  sealed_at?: string | null;
}

export interface ContextDraftInput {
  original_text: string;
  expected_version?: number;
  accepted_structure: ContextStructureView;
}

export interface ContextSuggestionView {
  context_contract_version: string;
  suggestions: ContextStructureView;
  provider: string;
  model: string;
  prompt_version: string;
}

export type ReviewStatus =
  "not_requested" | "unavailable" | "queued" | "investigating" | "partial" | "completed" | "failed";

export interface ReviewEvidenceView {
  evidence_id: string;
  source: "argos" | "analytics" | "context";
  pointer: string;
  label: string;
  excerpt?: string | null;
  digest: string;
}

export interface ReviewClaimView {
  claim_id: string;
  kind: "fact" | "interpretation" | "recommendation" | "limitation";
  statement: string;
  confidence: number;
  evidence_refs: string[];
  metric_refs: string[];
  intent_refs: string[];
  issue_refs: string[];
  context_refs: string[];
  verification_status: "verified" | "rejected";
}

export interface ReviewInvestigationView {
  investigation_id: string;
  title: string;
  summary: string;
  signal_refs: string[];
  claim_refs: string[];
}

export interface ReviewRecommendedActionView {
  action_id: string;
  priority: "now" | "next" | "later";
  title: string;
  why: string;
  owner: string;
  how: string[];
  configuration: string[];
  success_check: string;
  rollback?: string | null;
  evidence_refs: string[];
}

export type ReviewActionStatus =
  | "accepted"
  | "in_progress"
  | "verifying"
  | "succeeded"
  | "failed"
  | "dismissed"
  | "rolled_back";

export interface ReviewActionEventView {
  event_id: string;
  command_id: string;
  sequence: number;
  from_status: ReviewActionStatus | null;
  to_status: ReviewActionStatus;
  actor_id: string;
  reason?: string | null;
  occurred_at: string;
}

export interface ReviewActionRecordView {
  action_record_id: string;
  analysis_id: string;
  source_review_id: string;
  source_review_version: number;
  source_action_id: string;
  source_action_digest: string;
  snapshot: ReviewRecommendedActionView;
  status: ReviewActionStatus;
  assignee: string;
  due_at?: string | null;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  events: ReviewActionEventView[];
}

export interface ReviewActionListView {
  analysis_id: string;
  state?: "unavailable";
  items: ReviewActionRecordView[];
}

export interface AcceptReviewActionInput {
  command_id: string;
  source_review_id: string;
  source_action_id: string;
  assignee: string;
  due_at?: string | null;
}

export interface TransitionReviewActionInput {
  command_id: string;
  expected_version: number;
  target_status: ReviewActionStatus;
  reason?: string | null;
}

export type ReviewFeedbackRating = "helpful" | "not_helpful";
export type ReviewFeedbackReason =
  | "clear"
  | "actionable"
  | "well_supported"
  | "too_generic"
  | "not_actionable"
  | "missing_evidence"
  | "incorrect_interpretation"
  | "other";

export interface ReviewFeedbackView {
  state?: "empty" | "unavailable";
  feedback_id?: string;
  analysis_id: string;
  source_review_id?: string;
  source_review_version?: number;
  actor_id?: string;
  rating?: ReviewFeedbackRating;
  reason?: ReviewFeedbackReason | null;
  comment?: string | null;
  created_at?: string;
}

export interface SubmitReviewFeedbackInput {
  command_id: string;
  source_review_id: string;
  source_review_version: number;
  rating: ReviewFeedbackRating;
  reason?: ReviewFeedbackReason | null;
  comment?: string | null;
}

export interface ReviewRejectedClaimAuditView {
  claim_digest: string;
  kind: ReviewClaimView["kind"];
  evidence_refs: string[];
  reasons: string[];
}

export interface ReviewVerificationReportView {
  gate_version: string;
  submitted_claim_count: number;
  accepted_claim_count: number;
  rejected_claim_count: number;
  rejected_claims: ReviewRejectedClaimAuditView[];
}

export interface ReviewClaimLineageView {
  claim_id: string;
  official_evidence_refs: string[];
  context_refs: string[];
  metric_refs: string[];
  intent_refs: string[];
  issue_refs: string[];
  coverage_refs: string[];
  source_snapshot_refs: string[];
}

export interface ReviewArtifactView {
  review_contract_version?: string;
  review_id?: string;
  analysis_id: string;
  language?: "pt" | "en";
  version?: number;
  status: ReviewStatus;
  executive_summary?: string | null;
  what_matters_most?: string[];
  strengths?: string[];
  investigations?: ReviewInvestigationView[];
  critical_findings?: string[];
  contradictions?: string[];
  business_impact?: string[];
  recommendations?: string[];
  recommended_actions?: ReviewRecommendedActionView[];
  blind_spots?: string[];
  claims?: ReviewClaimView[];
  evidence?: ReviewEvidenceView[];
  verification_report?: ReviewVerificationReportView | null;
  claim_lineage?: ReviewClaimLineageView[];
  partial_reasons?: string[];
  created_at?: string;
  completed_at?: string | null;
}

export interface ReviewRequestView {
  review_request_id: string;
  status: "queued" | "already_queued";
}

export type AskAnswerStatus = "completed" | "partial" | "insufficient_evidence" | "failed";

export interface AskAnswerView {
  ask_contract_version: string;
  answer_id: string;
  category: string;
  status: AskAnswerStatus;
  fact?: string | null;
  evidence_summary: string[];
  interpretation?: string | null;
  limitation: string;
  next_action: string;
  evidence: ReviewEvidenceView[];
  partial_reasons: string[];
}

export interface AskTurnView {
  turn_id: string;
  analysis_id: string;
  actor_id: string;
  source_review_id: string;
  source_review_version: number;
  question: string;
  answer: AskAnswerView;
  created_at: string;
}

export interface AskConversationView {
  analysis_id: string;
  state?: "unavailable";
  items: AskTurnView[];
}

export interface AskAnalysisInput {
  command_id: string;
  source_review_id: string;
  source_review_version: number;
  question: string;
  language: "pt" | "en";
}

/** Snapshot operacional do catálogo de preços promovido pelo Sentinela. */
export interface PricingRegistryStatusView {
  registry: {
    capture_id: string;
    captured_at: string;
    content_digest_sha256: string;
    parser_version: string;
    alert_count: number;
    route_count: number;
  } | null;
  sync: Record<string, unknown>;
}

export type EconomicsScenarioScale = "dataset" | "per_1k" | "per_100k" | "per_1m";

/** Cenário salvo a partir de uma rota já materializada no resultado oficial. */
export interface SavedEconomicsScenarioView {
  scenario_id: string;
  name?: string;
  route_id: string;
  scale: EconomicsScenarioScale;
  snapshot: {
    amount: number;
    currency: string;
    provider?: string;
    model_id?: string;
    calculation_status?: string;
    registry?: { capture_id?: string; content_digest_sha256?: string };
  };
  created_at?: string;
  updated_at?: string;
}

export interface SavedEconomicsScenarioListView {
  items: SavedEconomicsScenarioView[];
}

/** Reconciliação imutável entre custo observado e simulação oficial, quando comparáveis. */
export interface EconomicsReconciliationView {
  reconciliation_id: string;
  status: "reconciled" | "actual_only";
  snapshot: {
    observed: { amount: number; currency: string; source_kind: string };
    simulated?: { total_cost?: number } | null;
    variance_amount?: number | null;
    variance_pct?: number | null;
  };
  created_at: string;
}

export interface EconomicsReconciliationListView {
  items: EconomicsReconciliationView[];
}

