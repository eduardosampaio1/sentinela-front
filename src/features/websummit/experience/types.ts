export type ExperienceState =
  | "idle"
  | "aware"
  | "listening"
  | "understanding"
  | "deciding"
  | "responding"
  | "complete"
  | "error";

export type TraceStage = "understand" | "decide" | "control" | "respond";

export interface ExperienceDecision {
  llmRequired: boolean;
  route: string;
  risk: "low" | "medium" | "high";
  rationale: string;
  contextStrategy: string;
}

export interface ExperienceTraceStep {
  stage: TraceStage;
  label: string;
  detail: string;
  status: "completed" | "limited";
}

export interface ExperienceResult {
  answer: string;
  decision: ExperienceDecision;
  trace: ExperienceTraceStep[];
  mode: "remote" | "fallback";
  illustrative: boolean;
}

export interface WebSummitExperienceProvider {
  submit(input: string, signal?: AbortSignal): Promise<ExperienceResult>;
}

export interface ExperienceScenario {
  id: string;
  label: string;
  prompt: string;
  kind: "simple" | "complex" | "risky";
}
