import { supabase } from "./supabase";
import { getAuthClient } from "@/lib/auth/index";
import { gwListAnalysisRuns, gwLatestAnalysisRun, gwAnalysisRunById } from "./gatewayContext";

export interface AnalysisRunSummary {
  id: string;
  workspace_id: string | null;
  project_id: string | null;
  environment_id: string | null;
  created_at: string;
  engine_version: string | null;
  risk_level: string | null;
  n_conversations: number | null;
  n_intents: number | null;
  status?: string | null;
  raw_result?: Record<string, unknown> | null;
}

interface AnalysisScope {
  workspaceId: string;
  projectId: string;
  environmentId: string;
}

function withEmbeddedAnalysisRunId<T extends { id: string; raw_result?: Record<string, unknown> | null }>(
  run: T | null | undefined,
): T | null | undefined {
  if (!run) return run;
  if (!run.raw_result || typeof run.raw_result !== "object") return run;

  const rawResult = run.raw_result as Record<string, unknown>;
  const existingRunId =
    typeof rawResult.analysis_run_id === "string" ? rawResult.analysis_run_id.trim() : "";
  if (existingRunId) return run;

  return {
    ...run,
    raw_result: {
      ...rawResult,
      analysis_run_id: run.id,
    },
  };
}

export async function saveAnalysisRun(params: {
  workspaceId: string;
  projectId: string;
  environmentId: string;
  createdBy: string;
  sourceFilename?: string;
  inputHash?: string;
  result: Record<string, unknown>;
}) {
  if (getAuthClient().provider === "keycloak") {
    // O backend ja persistiu o analysis_run no Postgres (materializador de
    // resultados). Escrever daqui iria para o client placeholder do Supabase e
    // renderia um toast "History sync failed" para algo que foi persistido com
    // sucesso. O caller trata null pulando o analysis_run_id embutido.
    return null;
  }

  const { data, error } = await supabase
    .from("analysis_runs")
    .insert({
      workspace_id: params.workspaceId,
      project_id: params.projectId,
      environment_id: params.environmentId,
      created_by: params.createdBy,
      source_filename: params.sourceFilename ?? null,
      input_hash: params.inputHash ?? null,
      analysis_id: (typeof params.result.analysis_id === "string" && params.result.analysis_id.trim()) ? params.result.analysis_id.trim() : crypto.randomUUID(),
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
  return data ? withEmbeddedAnalysisRunId(data) : data;
}

function applyScopeFilters<T>(query: T, scope: AnalysisScope) {
  return (query as any)
    .eq("workspace_id", scope.workspaceId)
    .eq("project_id", scope.projectId)
    .eq("environment_id", scope.environmentId) as T;
}

export async function getLatestAnalysisRun(
  workspaceId: string,
  projectId: string,
  environmentId: string,
) {
  if (getAuthClient().provider === "keycloak") {
    const row = await gwLatestAnalysisRun(workspaceId, projectId, environmentId);
    return row ? withEmbeddedAnalysisRunId(row as any) : null;
  }
  const scoped = applyScopeFilters(
    supabase.from("analysis_runs").select("*"),
    { workspaceId, projectId, environmentId },
  );

  const { data, error } = await (scoped as any)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? withEmbeddedAnalysisRunId(data) : data;
}

export async function getAnalysisRunById(
  runId: string,
  scope?: { workspaceId?: string | null; projectId?: string | null; environmentId?: string | null },
) {
  if (getAuthClient().provider === "keycloak") {
    if (!scope?.workspaceId) throw new Error("workspace scope required to fetch a run.");
    const row = await gwAnalysisRunById(runId, scope.workspaceId);
    return row ? withEmbeddedAnalysisRunId(row as any) : null;
  }
  let query = supabase.from("analysis_runs").select("*").eq("id", runId);
  if (scope?.workspaceId) query = query.eq("workspace_id", scope.workspaceId);
  if (scope?.projectId) query = query.eq("project_id", scope.projectId);
  if (scope?.environmentId) query = query.eq("environment_id", scope.environmentId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? withEmbeddedAnalysisRunId(data) : data;
}

export async function listAnalysisRuns(
  workspaceId: string,
  projectId: string,
  environmentId: string,
  limit = 6,
) {
  if (getAuthClient().provider === "keycloak") {
    const rows = await gwListAnalysisRuns(workspaceId, projectId, environmentId, limit);
    return rows.map((run) => withEmbeddedAnalysisRunId(run as any)) as AnalysisRunSummary[];
  }
  const scoped = applyScopeFilters(
    supabase
      .from("analysis_runs")
      .select(
        "id, workspace_id, project_id, environment_id, created_at, engine_version, risk_level, n_conversations, n_intents, raw_result",
      ),
    { workspaceId, projectId, environmentId },
  );

  const { data, error } = await (scoped as any)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (Array.isArray(data) ? data.map((run) => withEmbeddedAnalysisRunId(run)) : []) as AnalysisRunSummary[];
}

export async function hasUserAnalysisRuns(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("id")
    .eq("created_by", userId)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}
