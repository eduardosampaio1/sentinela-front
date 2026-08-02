// Forma ESTRUTURAL minima. `@/lib/workspaces` foi removido: era a camada Supabase de
// membership, e membership agora vem projetada por /v1/me. So o `slug` interessa ao
// roteamento, entao declarar aqui evita ressuscitar o modulo por causa de um tipo.
type Workspace = { slug: string | null };

function slugify(raw: string): string {
  const normalized = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "workspace";
}

export function projectsSlugFromEmail(email?: string | null): string {
  const local = String(email || "").split("@")[0] || "workspace";
  return `${slugify(local)}-projects`;
}

export function workspaceSlug(workspace?: Pick<Workspace, "slug" | "name"> | null): string {
  if (!workspace) return "workspace";
  if (workspace.name && workspace.name.trim()) return slugify(workspace.name);
  if (workspace.slug && workspace.slug.trim()) return slugify(workspace.slug);
  return "workspace";
}

export function buildWorkspaceHomePath(params: {
  email?: string | null;
  workspace?: Pick<Workspace, "slug" | "name"> | null;
}): string {
  return `/${projectsSlugFromEmail(params.email)}/${workspaceSlug(params.workspace)}`;
}
