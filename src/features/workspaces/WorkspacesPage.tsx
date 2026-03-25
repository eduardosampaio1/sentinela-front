import { useState } from "react";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { ConfirmDialog } from "@/shared/feedback/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/workspaces";
import type { SystemProject, SystemEnvironment } from "@/lib/systemRegistry";

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder: string;
  onConfirm: (name: string) => Promise<void>;
}

function CreateDialog({ open, onOpenChange, title, placeholder, onConfirm }: CreateDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(name.trim());
      setName("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setName(""); }}>
      <DialogContent className="bg-[#0D1525] border-[rgba(255,255,255,0.08)] rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#F1F5F9]">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="bg-[#111D30] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] rounded-xl"
          />
          {error && <p className="text-xs text-[#F87171]">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl text-[#94A3B8]">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl bg-[#22D3EE] text-[#070C18]">
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceCard({ workspace, isActive, onSelect, onRename, onDelete }: {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5 flex items-center justify-between gap-3 transition-all",
        isActive
          ? "bg-[rgba(34,211,238,0.06)] border-[rgba(34,211,238,0.15)]"
          : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)]"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] flex-shrink-0" />}
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold truncate", isActive ? "text-[#22D3EE]" : "text-[#F1F5F9]")}>
            {workspace.name}
          </p>
          <p className="text-xs text-[#2D3748] font-mono truncate">{workspace.id.slice(0, 12)}…</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {!isActive && (
          <Button size="sm" variant="ghost" onClick={onSelect} className="rounded-lg text-xs text-[#475569] hover:text-[#94A3B8]">
            Select
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onRename} className="rounded-lg text-xs text-[#475569] hover:text-[#94A3B8]">
          Rename
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="rounded-lg text-xs text-[#F87171] hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.08)]">
          Delete
        </Button>
      </div>
    </div>
  );
}

export function WorkspacesPage() {
  const {
    workspace, workspaces,
    project, projects,
    environment, environments,
    switchWorkspace, createWorkspace, renameWorkspace, deleteWorkspace,
    switchProject, createProject, renameProject, deleteProject,
    switchEnvironment, createEnvironment, renameEnvironment, deleteEnvironment,
  } = useAuth();

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateEnvironment, setShowCreateEnvironment] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ type: "workspace" | "project" | "env"; id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      if (confirmDelete.type === "workspace") await deleteWorkspace(confirmDelete.id);
      else if (confirmDelete.type === "project") await deleteProject(confirmDelete.id);
      else await deleteEnvironment(confirmDelete.id);
      setConfirmDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <AppShell topBarTitle="Workspaces">
      <PageFrame maxWidth="xl">
        <PageHeader
          title="Workspaces"
          description="Organize your analysis context by workspace, project, and environment."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workspaces column */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Workspaces</p>
              <Button size="sm" onClick={() => setShowCreateWorkspace(true)} className="rounded-lg bg-[rgba(34,211,238,0.1)] text-[#22D3EE] border border-[rgba(34,211,238,0.15)] hover:bg-[rgba(34,211,238,0.18)] text-xs h-7">
                + New
              </Button>
            </div>
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  isActive={ws.id === workspace?.id}
                  onSelect={() => switchWorkspace(ws.id)}
                  onRename={() => {
                    const name = window.prompt("New workspace name:", ws.name);
                    if (name?.trim()) void renameWorkspace(ws.id, name.trim());
                  }}
                  onDelete={() => setConfirmDelete({ type: "workspace", id: ws.id, name: ws.name })}
                />
              ))}
              {workspaces.length === 0 && (
                <p className="text-sm text-[#475569] text-center py-4">No workspaces yet</p>
              )}
            </div>
          </div>

          {/* Projects column */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Systems</p>
              <Button
                size="sm"
                onClick={() => setShowCreateProject(true)}
                disabled={!workspace}
                className="rounded-lg bg-[rgba(34,211,238,0.1)] text-[#22D3EE] border border-[rgba(34,211,238,0.15)] hover:bg-[rgba(34,211,238,0.18)] text-xs h-7 disabled:opacity-40"
              >
                + New
              </Button>
            </div>
            <div className="space-y-2">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-all",
                    proj.id === project?.id
                      ? "bg-[rgba(34,211,238,0.06)] border-[rgba(34,211,238,0.15)]"
                      : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)]"
                  )}
                  onClick={() => switchProject(proj.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {proj.id === project?.id && <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />}
                    <p className={cn("text-sm truncate", proj.id === project?.id ? "text-[#22D3EE] font-semibold" : "text-[#94A3B8]")}>
                      {proj.name}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const name = window.prompt("New name:", proj.name);
                        if (name?.trim()) void renameProject(proj.id, name.trim());
                      }}
                      className="text-[10px] text-[#475569] hover:text-[#94A3B8] px-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: "project", id: proj.id, name: proj.name }); }}
                      className="text-[10px] text-[#F87171] hover:text-[#F87171] px-1"
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-[#475569] text-center py-4">
                  {workspace ? "No systems in this workspace" : "Select a workspace first"}
                </p>
              )}
            </div>
          </div>

          {/* Environments column */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Environments</p>
              <Button
                size="sm"
                onClick={() => setShowCreateEnvironment(true)}
                disabled={!project}
                className="rounded-lg bg-[rgba(34,211,238,0.1)] text-[#22D3EE] border border-[rgba(34,211,238,0.15)] hover:bg-[rgba(34,211,238,0.18)] text-xs h-7 disabled:opacity-40"
              >
                + New
              </Button>
            </div>
            <div className="space-y-2">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-all",
                    env.id === environment?.id
                      ? "bg-[rgba(34,211,238,0.06)] border-[rgba(34,211,238,0.15)]"
                      : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)]"
                  )}
                  onClick={() => switchEnvironment(env.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {env.id === environment?.id && <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />}
                    <p className={cn("text-sm truncate", env.id === environment?.id ? "text-[#22D3EE] font-semibold" : "text-[#94A3B8]")}>
                      {env.name}
                    </p>
                    {env.environmentType && (
                      <span className="text-[10px] text-[#2D3748] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                        {env.environmentType}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const name = window.prompt("New name:", env.name);
                        if (name?.trim()) void renameEnvironment(env.id, name.trim());
                      }}
                      className="text-[10px] text-[#475569] hover:text-[#94A3B8] px-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: "env", id: env.id, name: env.name }); }}
                      className="text-[10px] text-[#F87171] px-1"
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
              {environments.length === 0 && (
                <p className="text-sm text-[#475569] text-center py-4">
                  {project ? "No environments in this system" : "Select a system first"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <CreateDialog
          open={showCreateWorkspace}
          onOpenChange={setShowCreateWorkspace}
          title="Create workspace"
          placeholder="My Organization"
          onConfirm={async (name) => { await createWorkspace(name); }}
        />

        <CreateDialog
          open={showCreateProject}
          onOpenChange={setShowCreateProject}
          title="Create system"
          placeholder="Customer Support Bot"
          onConfirm={async (name) => { await createProject(name); }}
        />

        <CreateDialog
          open={showCreateEnvironment}
          onOpenChange={setShowCreateEnvironment}
          title="Create environment"
          placeholder="Production"
          onConfirm={async (name) => { await createEnvironment(name); }}
        />

        <ConfirmDialog
          open={!!confirmDelete}
          onOpenChange={(open) => !open && setConfirmDelete(null)}
          title={`Delete ${confirmDelete?.name ?? "item"}?`}
          description="This action cannot be undone. All associated data will be removed."
          confirmLabel="Delete"
          variant="destructive"
          loading={deleteLoading}
          onConfirm={handleDelete}
        />
      </PageFrame>
    </AppShell>
  );
}
