import { supabase } from "./supabase";

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