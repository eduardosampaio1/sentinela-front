import { supabase } from "./supabase";

export interface AnalysisRunSummary {
  id: string;
  created_at: string;
  engine_version: string | null;
  risk_level: string | null;
  n_conversations: number | null;
  n_intents: number | null;
  raw_result?: Record<string, unknown> | null;
}

export async function saveAnalysisRun(params: {
  workspaceId: string;
  createdBy: string;
  sourceFilename?: string;
  inputHash?: string;
  result: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("analysis_runs")
    .insert({
      workspace_id: params.workspaceId,
      created_by: params.createdBy,
      source_filename: params.sourceFilename ?? null,
      input_hash: params.inputHash ?? null,
      engine_version:
        typeof params.result.engine_version === "string"
          ? params.result.engine_version
          : null,
      risk_level:
        typeof params.result.risk_level === "string"
          ? params.result.risk_level
          : null,
      n_conversations:
        typeof params.result.n_conversations === "number"
          ? params.result.n_conversations
          : null,
      n_intents:
        typeof params.result.n_intents === "number"
          ? params.result.n_intents
          : null,
      raw_result: params.result,
      status: "completed",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLatestAnalysisRun(workspaceId: string) {
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAnalysisRunById(runId: string) {
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listAnalysisRuns(workspaceId: string, limit = 6) {
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("id, created_at, engine_version, risk_level, n_conversations, n_intents, raw_result")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (Array.isArray(data) ? data : []) as AnalysisRunSummary[];
}
