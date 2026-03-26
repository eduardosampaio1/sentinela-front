import { supabase } from "./supabase";

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  owner_user_id: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

type WorkspaceRow = Partial<Workspace> & Record<string, unknown>;
type SupabaseError = { code?: string; message?: string } | null;

const WORKSPACE_SELECTION_KEY = "sentinela:selected_workspace_id";
const WORKSPACE_SELECT_VARIANTS = [
  "id,name,slug,owner_user_id,created_at,updated_at,deleted_at",
  "id,name,slug,owner_user_id,created_at,deleted_at",
  "id,name,slug,owner_user_id,created_at",
  "id,name,owner_user_id,created_at",
];
const MEMBERSHIP_SELECT_VARIANTS = [
  `
    workspace_id,
    role,
    workspaces (
      id,
      name,
      slug,
      owner_user_id,
      created_at,
      updated_at,
      deleted_at
    )
  `,
  `
    workspace_id,
    role,
    workspaces (
      id,
      name,
      slug,
      owner_user_id,
      created_at
    )
  `,
];

function isSchemaError(error: SupabaseError) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "42P01" ||
    message.includes("column") ||
    message.includes("relation") ||
    message.includes("does not exist")
  );
}

function isMissingRelation(error: SupabaseError) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return error.code === "42P01" || message.includes("relation") || message.includes("does not exist");
}

function normalizeWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "Workspace"),
    slug: row.slug == null ? null : String(row.slug),
    owner_user_id: String(row.owner_user_id ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: row.updated_at == null ? null : String(row.updated_at),
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at),
  };
}

function uniqueById(items: Workspace[]) {
  const seen = new Set<string>();
  const unique: Workspace[] = [];
  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function sortWorkspaces(items: Workspace[]) {
  return [...items].sort((left, right) =>
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}

async function listWorkspacesByMembership(userId: string): Promise<Workspace[]> {
  let lastError: SupabaseError = null;

  for (const variant of MEMBERSHIP_SELECT_VARIANTS) {
    const { data, error } = await supabase
      .from("workspace_members")
      .select(variant)
      .eq("user_id", userId);

    if (!error) {
      const rows = Array.isArray(data) ? data : [];
      const parsed = rows
        .map((row) => {
          const workspaceValue = (row as Record<string, unknown>).workspaces;
          if (Array.isArray(workspaceValue)) return workspaceValue[0] as WorkspaceRow;
          return workspaceValue as WorkspaceRow;
        })
        .filter(Boolean)
        .map(normalizeWorkspace)
        .filter((workspace) => !workspace.deleted_at);
      return sortWorkspaces(uniqueById(parsed));
    }

    if (!isSchemaError(error)) {
      throw error;
    }
    lastError = error;
  }

  if (lastError && !isMissingRelation(lastError)) {
    throw lastError;
  }
  return [];
}

async function listWorkspacesByOwner(userId: string): Promise<Workspace[]> {
  let lastError: SupabaseError = null;

  for (const variant of WORKSPACE_SELECT_VARIANTS) {
    let query = supabase
      .from("workspaces")
      .select(variant)
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true });

    if (variant.includes("deleted_at")) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;

    if (!error) {
      const rows = Array.isArray(data) ? (data as WorkspaceRow[]) : [];
      return sortWorkspaces(
        uniqueById(rows.map(normalizeWorkspace).filter((workspace) => !workspace.deleted_at))
      );
    }

    if (!isSchemaError(error)) {
      throw error;
    }
    lastError = error;
  }

  if (lastError) throw lastError;
  return [];
}

export async function listUserWorkspaces(userId: string) {
  const fromMembership = await listWorkspacesByMembership(userId);
  if (fromMembership.length > 0) return fromMembership;
  return listWorkspacesByOwner(userId);
}

export function getStoredWorkspaceId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(WORKSPACE_SELECTION_KEY);
}

export function setStoredWorkspaceId(workspaceId: string | null) {
  if (typeof window === "undefined") return;
  if (!workspaceId) {
    window.localStorage.removeItem(WORKSPACE_SELECTION_KEY);
    return;
  }
  window.localStorage.setItem(WORKSPACE_SELECTION_KEY, workspaceId);
}

export async function getMyWorkspace(userId: string, preferredWorkspaceId?: string | null) {
  const all = await listUserWorkspaces(userId);
  if (!all.length) return null;
  if (preferredWorkspaceId) {
    const preferred = all.find((workspace) => workspace.id === preferredWorkspaceId);
    if (preferred) return preferred;
  }
  return all[0];
}

export async function createWorkspace(params: {
  userId: string;
  name: string;
  email?: string | null;
}) {
  const normalizedName = params.name.trim();
  if (!normalizedName) {
    throw new Error("Workspace name cannot be empty.");
  }

  const slugSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const payloadCandidates: Array<Record<string, string>> = [
    {
      name: normalizedName,
      slug: `stl-${slugSuffix}`,
      owner_user_id: params.userId,
    },
    {
      name: normalizedName,
      owner_user_id: params.userId,
    },
  ];

  let created: WorkspaceRow | null = null;
  let insertError: SupabaseError = null;

  for (const payload of payloadCandidates) {
    const { data, error } = await supabase
      .from("workspaces")
      .insert(payload)
      .select()
      .single();

    if (!error) {
      created = data as WorkspaceRow;
      break;
    }

    if (!isSchemaError(error)) {
      throw error;
    }
    insertError = error;
  }

  if (!created) {
    if (insertError) throw insertError;
    throw new Error("Failed to create workspace.");
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: created.id,
      user_id: params.userId,
      role: "owner",
    });

  if (memberError && !isMissingRelation(memberError) && memberError.code !== "23505") {
    throw memberError;
  }

  return normalizeWorkspace(created);
}

export async function createDefaultWorkspace(userId: string, email?: string | null) {
  const defaultName = "Workspace 1";
  return createWorkspace({ userId, name: defaultName, email });
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Workspace name cannot be empty.");
  }

  const payload = {
    name: normalizedName,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from("workspaces")
    .update(payload)
    .eq("id", workspaceId)
    .is("deleted_at", null);

  if (error && isSchemaError(error)) {
    const fallback = await supabase
      .from("workspaces")
      .update({ name: normalizedName })
      .eq("id", workspaceId);
    error = fallback.error;
  }

  if (error) throw error;

  const confirmation = await supabase
    .from("workspaces")
    .select("id,name")
    .eq("id", workspaceId)
    .maybeSingle();

  if (confirmation.error) throw confirmation.error;
  if (!confirmation.data || String(confirmation.data.name ?? "").trim() !== normalizedName) {
    throw new Error(
      "Workspace rename was not persisted. Ensure update policy is enabled for workspace owners.",
    );
  }
}

export async function softDeleteWorkspace(workspaceId: string) {
  const { error } = await supabase
    .from("workspaces")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId)
    .is("deleted_at", null);

  if (error && isSchemaError(error)) {
    const fallback = await supabase.from("workspaces").delete().eq("id", workspaceId);
    if (fallback.error) throw fallback.error;
    return;
  }
  if (error) throw error;

  const confirmation = await supabase
    .from("workspaces")
    .select("id,deleted_at")
    .eq("id", workspaceId)
    .maybeSingle();
  if (confirmation.error) throw confirmation.error;
  if (!confirmation.data || !confirmation.data.deleted_at) {
    throw new Error(
      "Workspace delete was not persisted. Ensure update policy is enabled for workspace owners.",
    );
  }
}

export async function ensureUserWorkspace(
  userId: string,
  email?: string | null,
  preferredWorkspaceId?: string | null,
) {
  const existing = await getMyWorkspace(userId, preferredWorkspaceId);
  if (existing) return existing;

  const created = await createDefaultWorkspace(userId, email);
  setStoredWorkspaceId(created.id);
  return created;
}
