// Cliente do gateway para tenant/contexto (modo keycloak). Substitui as leituras diretas
// ao Supabase por chamadas autenticadas ao gateway (Bearer do Keycloak).
import { getAuthClient } from "@/lib/auth/index";

const API_BASE = String(import.meta.env.VITE_SENTINELA_API_URL ?? "").replace(/\/+$/, "");

async function gwGet<T>(path: string): Promise<T> {
  const token = await getAuthClient().getAccessToken();
  if (!token) throw new Error("User session expired. Please sign in again.");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
  }
  return (await res.json()) as T;
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
