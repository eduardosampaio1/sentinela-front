import { supabase } from "./supabase";

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  owner_user_id: string;
  created_at: string;
}

export async function getMyWorkspace(userId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      workspace_id,
      role,
      workspaces (
        id,
        name,
        slug,
        owner_user_id,
        created_at
      )
    `)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.workspaces) return null;

  const workspace = Array.isArray(data.workspaces)
    ? data.workspaces[0]
    : data.workspaces;

  return workspace as Workspace;
}

export async function createDefaultWorkspace(userId: string, email?: string | null) {
  const baseSlug = email
    ? email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : "workspace";

  const uniqueSlug = `${baseSlug}-${userId.slice(0, 8)}`;
  const defaultName = email ? `${email.split("@")[0]}'s Workspace` : "Meu Workspace";

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name: defaultName,
      slug: uniqueSlug,
      owner_user_id: userId,
    })
    .select()
    .single();

  if (workspaceError) throw workspaceError;

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: "owner",
    });

  if (memberError) throw memberError;

  return workspace as Workspace;
}

export async function ensureUserWorkspace(userId: string, email?: string | null) {
  const existing = await getMyWorkspace(userId);
  if (existing) return existing;
  return createDefaultWorkspace(userId, email);
}