import { supabase } from "./supabase";
import { getAuthClient } from "@/lib/auth/index";
import {
  gwListProjects,
  gwListEnvironments,
  gwCreateProject,
  gwRenameProject,
  gwDeleteProject,
  gwCreateEnvironment,
  gwRenameEnvironment,
  gwDeleteEnvironment,
} from "./gatewayContext";

export type SystemType =
  | "chatbot"
  | "copilot"
  | "agent"
  | "workflow"
  | "internal_ai"
  | "other";

export interface SystemProject {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  system_type: SystemType;
  primary_model: string | null;
  ontology_version: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface SystemEnvironment {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  environment_type: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

type RegistryRow = Record<string, unknown>;
type SupabaseError = { code?: string; message?: string } | null;

const PROJECT_KEY_PREFIX = "sentinela:selected_project_id";
const ENVIRONMENT_KEY_PREFIX = "sentinela:selected_environment_id";

function slugify(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function isSchemaError(error: SupabaseError) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    message.includes("column") ||
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the table")
  );
}

function projectStorageKey(workspaceId: string) {
  return `${PROJECT_KEY_PREFIX}:${workspaceId}`;
}

function environmentStorageKey(projectId: string) {
  return `${ENVIRONMENT_KEY_PREFIX}:${projectId}`;
}

function toProject(row: RegistryRow): SystemProject {
  return {
    id: String(row.id ?? ""),
    workspace_id: String(row.workspace_id ?? ""),
    name: String(row.name ?? "System"),
    slug: String(row.slug ?? slugify(String(row.name ?? "system"))),
    description: row.description == null ? null : String(row.description),
    system_type: (String(row.system_type ?? "other") as SystemType) || "other",
    primary_model: row.primary_model == null ? null : String(row.primary_model),
    ontology_version: row.ontology_version == null ? null : String(row.ontology_version),
    notes: row.notes == null ? null : String(row.notes),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: row.updated_at == null ? null : String(row.updated_at),
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at),
  };
}

function toEnvironment(row: RegistryRow): SystemEnvironment {
  return {
    id: String(row.id ?? ""),
    project_id: String(row.project_id ?? ""),
    name: String(row.name ?? "Production"),
    slug: String(row.slug ?? slugify(String(row.name ?? "production"))),
    environment_type: String(row.environment_type ?? "production"),
    description: row.description == null ? null : String(row.description),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: row.updated_at == null ? null : String(row.updated_at),
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at),
  };
}

export function getStoredProjectId(workspaceId?: string | null) {
  if (typeof window === "undefined" || !workspaceId) return null;
  return window.localStorage.getItem(projectStorageKey(workspaceId));
}

export function setStoredProjectId(workspaceId: string, projectId: string | null) {
  if (typeof window === "undefined") return;
  const key = projectStorageKey(workspaceId);
  if (!projectId) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, projectId);
}

export function getStoredEnvironmentId(projectId?: string | null) {
  if (typeof window === "undefined" || !projectId) return null;
  return window.localStorage.getItem(environmentStorageKey(projectId));
}

export function setStoredEnvironmentId(projectId: string, environmentId: string | null) {
  if (typeof window === "undefined") return;
  const key = environmentStorageKey(projectId);
  if (!environmentId) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, environmentId);
}

export async function listWorkspaceProjects(workspaceId: string): Promise<SystemProject[]> {
  if (getAuthClient().provider === "keycloak") {
    const rows = await gwListProjects(workspaceId);
    return rows.map((r) => toProject(r as RegistryRow));
  }
  const { data, error } = await supabase
    .from("system_projects")
    .select(
      "id,workspace_id,name,slug,description,system_type,primary_model,ontology_version,notes,tags,created_at,updated_at,deleted_at",
    )
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    if (isSchemaError(error)) return [];
    throw error;
  }
  return (Array.isArray(data) ? data : []).map((row) => toProject(row as RegistryRow));
}

export async function createSystemProject(params: {
  workspaceId: string;
  name: string;
  description?: string | null;
  systemType?: SystemType;
  primaryModel?: string | null;
  ontologyVersion?: string | null;
  notes?: string | null;
  tags?: string[];
}) {
  const name = params.name.trim();
  if (!name) throw new Error("System name cannot be empty.");
  if (getAuthClient().provider === "keycloak") {
    const row = await gwCreateProject(params.workspaceId, {
      name,
      description: params.description ?? null,
      system_type: params.systemType ?? "other",
      primary_model: params.primaryModel ?? null,
      ontology_version: params.ontologyVersion ?? null,
      notes: params.notes ?? null,
      tags: params.tags ?? [],
    });
    return toProject(row as RegistryRow);
  }
  const payload = {
    workspace_id: params.workspaceId,
    name,
    slug: slugify(name),
    description: params.description ?? null,
    system_type: params.systemType ?? "other",
    primary_model: params.primaryModel ?? null,
    ontology_version: params.ontologyVersion ?? null,
    notes: params.notes ?? null,
    tags: params.tags ?? [],
  };
  const { data, error } = await supabase
    .from("system_projects")
    .insert(payload)
    .select()
    .single();
  if (error) {
    if (isSchemaError(error)) {
      throw new Error("System registry schema is not available yet. Run the context migration first.");
    }
    throw error;
  }
  return toProject((data ?? {}) as RegistryRow);
}

export async function renameSystemProject(projectId: string, name: string) {
  const nextName = name.trim();
  if (!nextName) throw new Error("System name cannot be empty.");
  if (getAuthClient().provider === "keycloak") {
    await gwRenameProject(projectId, nextName);
    return;
  }
  const payload = {
    name: nextName,
    slug: slugify(nextName),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("system_projects")
    .update(payload)
    .eq("id", projectId)
    .is("deleted_at", null);
  if (error) throw error;
}

export async function softDeleteSystemProject(projectId: string) {
  if (getAuthClient().provider === "keycloak") {
    await gwDeleteProject(projectId);
    return;
  }
  const { error } = await supabase
    .from("system_projects")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .is("deleted_at", null);
  if (error) throw error;
}

export async function listProjectEnvironments(projectId: string): Promise<SystemEnvironment[]> {
  if (getAuthClient().provider === "keycloak") {
    const rows = await gwListEnvironments(projectId);
    return rows.map((r) => toEnvironment(r as RegistryRow));
  }
  const { data, error } = await supabase
    .from("system_environments")
    .select("id,project_id,name,slug,environment_type,description,created_at,updated_at,deleted_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    if (isSchemaError(error)) return [];
    throw error;
  }
  return (Array.isArray(data) ? data : []).map((row) => toEnvironment(row as RegistryRow));
}

export async function createSystemEnvironment(params: {
  projectId: string;
  name: string;
  environmentType?: string;
  description?: string | null;
}) {
  const name = params.name.trim();
  if (!name) throw new Error("Environment name cannot be empty.");
  if (getAuthClient().provider === "keycloak") {
    const row = await gwCreateEnvironment(params.projectId, {
      name,
      environment_type: params.environmentType ?? "production",
      description: params.description ?? null,
    });
    return toEnvironment(row as RegistryRow);
  }
  const payload = {
    project_id: params.projectId,
    name,
    slug: slugify(name),
    environment_type: params.environmentType ?? "production",
    description: params.description ?? null,
  };
  const { data, error } = await supabase
    .from("system_environments")
    .insert(payload)
    .select()
    .single();
  if (error) {
    if (isSchemaError(error)) {
      throw new Error("System registry schema is not available yet. Run the context migration first.");
    }
    throw error;
  }
  return toEnvironment((data ?? {}) as RegistryRow);
}

export async function renameSystemEnvironment(environmentId: string, name: string) {
  const nextName = name.trim();
  if (!nextName) throw new Error("Environment name cannot be empty.");
  if (getAuthClient().provider === "keycloak") {
    await gwRenameEnvironment(environmentId, nextName);
    return;
  }
  const payload = {
    name: nextName,
    slug: slugify(nextName),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("system_environments")
    .update(payload)
    .eq("id", environmentId)
    .is("deleted_at", null);
  if (error) throw error;
}

export async function softDeleteSystemEnvironment(environmentId: string) {
  if (getAuthClient().provider === "keycloak") {
    await gwDeleteEnvironment(environmentId);
    return;
  }
  const { error } = await supabase
    .from("system_environments")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", environmentId)
    .is("deleted_at", null);
  if (error) throw error;
}
