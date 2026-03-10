import { supabase } from "./supabase";

export type AnalysisJobStatus = "queued" | "running" | "completed" | "failed";

export interface CreateAnalysisJobParams {
  workspaceId: string;
  createdBy: string;
  sourceFilename?: string;
  inputHash?: string;
  datasetPayload?: unknown[];
}

export interface AnalysisJobRecord {
  id: string;
  workspace_id: string;
  created_by: string;
  status: AnalysisJobStatus;
  source_filename: string | null;
  input_hash: string | null;
  dataset_payload: unknown[] | null;
  analysis_run_id: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export async function createAnalysisJob(params: CreateAnalysisJobParams) {
  const { data, error } = await supabase
    .from("analysis_jobs")
    .insert({
      workspace_id: params.workspaceId,
      created_by: params.createdBy,
      source_filename: params.sourceFilename ?? null,
      input_hash: params.inputHash ?? null,
      dataset_payload: params.datasetPayload ?? null,
      status: "queued",
    })
    .select()
    .single();

  if (error) throw error;
  return data as AnalysisJobRecord;
}

export async function markAnalysisJobRunning(jobId: string) {
  const { data, error } = await supabase
    .from("analysis_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (error) throw error;
  return data as AnalysisJobRecord;
}

export async function markAnalysisJobCompleted(
  jobId: string,
  analysisRunId?: string | null
) {
  const { data, error } = await supabase
    .from("analysis_jobs")
    .update({
      status: "completed",
      analysis_run_id: analysisRunId ?? null,
      finished_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (error) throw error;
  return data as AnalysisJobRecord;
}

export async function markAnalysisJobFailed(jobId: string, errorMessage: string) {
  const { data, error } = await supabase
    .from("analysis_jobs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (error) throw error;
  return data as AnalysisJobRecord;
}