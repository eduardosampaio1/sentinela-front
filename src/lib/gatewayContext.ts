// Cliente do gateway para tenant/contexto (modo keycloak). Substitui as leituras diretas
// ao Supabase por chamadas autenticadas ao gateway (Bearer do Keycloak).
import { getAuthClient } from "@/lib/auth/index";

const API_BASE = String(import.meta.env.VITE_SENTINELA_API_URL ?? "").replace(/\/+$/, "");

async function gwSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getAuthClient().getAccessToken();
  if (!token) throw new Error("User session expired. Please sign in again.");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

function gwGet<T>(path: string): Promise<T> {
  return gwSend<T>("GET", path);
}

export function gwListWorkspaces(): Promise<Record<string, unknown>[]> {
  return gwGet("/workspaces");
}
export function gwListProjects(workspaceId: string): Promise<Record<string, unknown>[]> {
  return gwGet(`/workspaces/${encodeURIComponent(workspaceId)}/projects`);
}
export function gwListEnvironments(projectId: string): Promise<Record<string, unknown>[]> {
  return gwGet(`/projects/${encodeURIComponent(projectId)}/environments`);
}

// ── escrita ───────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;
const enc = encodeURIComponent;

export function gwCreateWorkspace(name: string): Promise<Row> {
  return gwSend("POST", "/workspaces", { name });
}
export function gwRenameWorkspace(id: string, name: string): Promise<void> {
  return gwSend("PATCH", `/workspaces/${enc(id)}`, { name });
}
export function gwDeleteWorkspace(id: string): Promise<void> {
  return gwSend("DELETE", `/workspaces/${enc(id)}`);
}

export function gwCreateProject(workspaceId: string, body: Row): Promise<Row> {
  return gwSend("POST", `/workspaces/${enc(workspaceId)}/projects`, body);
}
export function gwRenameProject(id: string, name: string): Promise<void> {
  return gwSend("PATCH", `/projects/${enc(id)}`, { name });
}
export function gwDeleteProject(id: string): Promise<void> {
  return gwSend("DELETE", `/projects/${enc(id)}`);
}

export function gwCreateEnvironment(projectId: string, body: Row): Promise<Row> {
  return gwSend("POST", `/projects/${enc(projectId)}/environments`, body);
}
export function gwRenameEnvironment(id: string, name: string): Promise<void> {
  return gwSend("PATCH", `/environments/${enc(id)}`, { name });
}
export function gwDeleteEnvironment(id: string): Promise<void> {
  return gwSend("DELETE", `/environments/${enc(id)}`);
}

// ── análises (Histórico) ────────────────────────────────────────────────────────
export function gwListAnalysisRuns(
  workspaceId: string, projectId: string, environmentId: string, limit = 6,
): Promise<Row[]> {
  const q = `workspace_id=${enc(workspaceId)}&project_id=${enc(projectId)}&environment_id=${enc(environmentId)}&limit=${limit}`;
  return gwGet(`/analysis-runs?${q}`);
}
export function gwLatestAnalysisRun(
  workspaceId: string, projectId: string, environmentId: string,
): Promise<Row | null> {
  const q = `workspace_id=${enc(workspaceId)}&project_id=${enc(projectId)}&environment_id=${enc(environmentId)}`;
  return gwGet(`/analysis-runs/latest?${q}`);
}
export function gwAnalysisRunById(runId: string, workspaceId: string): Promise<Row | null> {
  return gwGet(`/analysis-runs/${enc(runId)}?workspace_id=${enc(workspaceId)}`);
}
