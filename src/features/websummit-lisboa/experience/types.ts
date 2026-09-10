export type LisboaExperienceState =
  | "idle"
  | "aware"
  | "receiving"
  | "understanding"
  | "evaluating"
  | "deciding"
  | "controlling"
  | "responding"
  | "complete"
  | "resting"
  | "error";

export type LisboaTraceStage = "understand" | "decide" | "control" | "respond";

export interface LisboaDecision {
  llmRequired: boolean;
  route: string;
  risk: "low" | "medium" | "high";
  rationale: string;
  contextStrategy: string;
  action?: string;
  policy?: string;
  evidence?: string;
}

export interface LisboaTraceStep {
  stage: LisboaTraceStage;
  label: string;
  detail: string;
  status: "completed" | "limited";
}

export interface LisboaExperienceResult {
  answer: string;
  decision: LisboaDecision;
  trace: LisboaTraceStep[];
  mode: "remote" | "fallback";
  illustrative: boolean;
}

export interface LisboaExperienceProvider {
  submit(input: string, signal?: AbortSignal): Promise<LisboaExperienceResult>;
}
