import { supabase } from "./supabase";

export type AnalysisJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export interface AnalysisJobRecord {
  id: string;
  workspace_id: string;
  created_by: string;
  status: AnalysisJobStatus;
  source_filename: string | null;
  input_hash: string | null;
  dataset_path: string | null;
  analysis_run_id: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface CreateAnalysisJobParams {
  workspaceId: string;
  createdBy: string;
  sourceFilename?: string;
  inputHash?: string;
  datasetPath: string;
}

const DATASET_BUCKET = "analysis-datasets";

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadDatasetToStorage(params: {
  workspaceId: string;
  inputHash: string;
  file: File;
}) {
  const safeName = sanitizeFilename(params.file.name || "dataset.jsonl");
  const path = `${params.workspaceId}/${params.inputHash}-${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(DATASET_BUCKET)
    .upload(path, params.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: params.file.type || "application/x-ndjson",
    });

  if (error) throw error;

  return {
    bucket: DATASET_BUCKET,
    path,
    fullPath: `${DATASET_BUCKET}/${path}`,
  };
}

export async function createAnalysisJob(params: CreateAnalysisJobParams) {
  const { data, error } = await supabase
    .from("analysis_jobs")
    .insert({
      workspace_id: params.workspaceId,
      created_by: params.createdBy,
      source_filename: params.sourceFilename ?? null,
      input_hash: params.inputHash ?? null,
      dataset_path: params.datasetPath,
      status: "queued",
    })
    .select()
    .single();

  if (error) throw error;
  return data as AnalysisJobRecord;
}

export async function getAnalysisJobById(jobId: string) {
  const { data, error } = await supabase
    .from("analysis_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw error;
  return data as AnalysisJobRecord | null;
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
