import { useMemo, useState } from "react";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString();
}

type DeleteTarget =
  | { type: "workspace"; id: string; name: string }
  | { type: "project"; id: string; name: string }
  | { type: "environment"; id: string; name: string }
  | null;

export default function WorkspacesPage() {
  const {
    workspace,
    workspaces,
    project,
    projects,
    environment,
    environments,
    workspaceLoading,
    contextLoading,
    switchWorkspace,
    switchProject,
    switchEnvironment,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    createProject,
    renameProject,
    deleteProject,
    createEnvironment,
    renameEnvironment,
    deleteEnvironment,
  } = useAuth();
  const { toast } = useToast();

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newEnvironmentName, setNewEnvironmentName] = useState("");

  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  const [editingEnvironmentName, setEditingEnvironmentName] = useState("");

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const canCreateWorkspace = useMemo(() => newWorkspaceName.trim().length > 1, [newWorkspaceName]);
  const canCreateProject = useMemo(() => newProjectName.trim().length > 1, [newProjectName]);
  const canCreateEnvironment = useMemo(
    () => newEnvironmentName.trim().length > 1,
    [newEnvironmentName],
  );

  async function handleCreateWorkspace() {
    if (!canCreateWorkspace) return;
    const name = newWorkspaceName.trim();
    setActioningId("workspace:create");
    try {
      await createWorkspace(name);
      setNewWorkspaceName("");
      toast({ title: "Workspace created", description: `${name} is now available.` });
    } catch (error) {
      toast({
        title: "Failed to create workspace",
        description: error instanceof Error ? error.message : "Unknown workspace creation error.",
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  }

  async function handleCreateProject() {
    if (!canCreateProject) return;
    const name = newProjectName.trim();
    setActioningId("project:create");
    try {
      await createProject(name);
      setNewProjectName("");
      toast({ title: "System created", description: `${name} is now available.` });
    } catch (error) {
      toast({
        title: "Failed to create system",
        description: error instanceof Error ? error.message : "Unknown system creation error.",
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  }

  async function handleCreateEnvironment() {
    if (!canCreateEnvironment) return;
    const name = newEnvironmentName.trim();
    setActioningId("environment:create");
    try {
      await createEnvironment(name);
      setNewEnvironmentName("");
      toast({ title: "Environment created", description: `${name} is now available.` });
    } catch (error) {
      toast({
        title: "Failed to create environment",
        description: error instanceof Error ? error.message : "Unknown environment creation error.",
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  }

  async function confirmWorkspaceRename(workspaceId: string) {
    const name = editingWorkspaceName.trim();
    if (!name) return;
    setActioningId(workspaceId);
    try {
      await renameWorkspace(workspaceId, name);
      setEditingWorkspaceId(null);
      setEditingWorkspaceName("");
      toast({ title: "Workspace renamed" });
    } catch (error) {
      toast({
        title: "Failed to rename workspace",
        description: error instanceof Error ? error.message : "Unknown workspace rename error.",
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  }

  async function confirmProjectRename(projectId: string) {
    const name = editingProjectName.trim();
    if (!name) return;
    setActioningId(projectId);
    try {
      await renameProject(projectId, name);
      setEditingProjectId(null);
      setEditingProjectName("");
      toast({ title: "System renamed" });
    } catch (error) {
      toast({
        title: "Failed to rename system",
        description: error instanceof Error ? error.message : "Unknown system rename error.",
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  }

  async function confirmEnvironmentRename(environmentId: string) {
    const name = editingEnvironmentName.trim();
    if (!name) return;
    setActioningId(environmentId);
    try {
      await renameEnvironment(environmentId, name);
      setEditingEnvironmentId(null);
      setEditingEnvironmentName("");
      toast({ title: "Environment renamed" });
    } catch (error) {
      toast({
        title: "Failed to rename environment",
        description: error instanceof Error ? error.message : "Unknown environment rename error.",
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  }

  async function handleDeleteTarget() {
    if (!deleteTarget) return;
    setActioningId(deleteTarget.id);
    try {
      if (deleteTarget.type === "workspace") {
        await deleteWorkspace(deleteTarget.id);
      } else if (deleteTarget.type === "project") {
        await deleteProject(deleteTarget.id);
      } else {
        await deleteEnvironment(deleteTarget.id);
      }
      toast({ title: `${deleteTarget.type} archived` });
      setDeleteTarget(null);
      setDeleteConfirmationText("");
    } catch (error) {
      toast({
        title: `Failed to delete ${deleteTarget.type}`,
        description: error instanceof Error ? error.message : "Unknown delete error.",
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  }

  const requiredDeletePhrase = deleteTarget
    ? `delete ${deleteTarget.type} ${deleteTarget.name}`
    : "";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Context Registry</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Configure strict context boundaries for Sentinela analyses:
          Workspace -&gt; System -&gt; Environment -&gt; Analyses.
        </p>
      </header>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Create Workspace</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newWorkspaceName}
            onChange={(event) => setNewWorkspaceName(event.target.value)}
            placeholder="Workspace 1"
            className="sm:max-w-md"
          />
          <Button
            onClick={() => void handleCreateWorkspace()}
            disabled={!canCreateWorkspace || actioningId === "workspace:create"}
          >
            {actioningId === "workspace:create" ? "Creating..." : "Create Workspace"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Workspaces</h2>
        {workspaceLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading...</p> : null}
        <div className="mt-4 space-y-3">
          {workspaces.map((item) => {
            const isActive = workspace?.id === item.id;
            const isEditing = editingWorkspaceId === item.id;
            return (
              <article
                key={item.id}
                className="rounded-xl border border-border/70 bg-background/40 p-3 sm:p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isEditing ? (
                        <Input
                          value={editingWorkspaceName}
                          onChange={(event) => setEditingWorkspaceName(event.target.value)}
                          className="h-8 w-full max-w-sm"
                        />
                      ) : (
                        <h3 className="truncate text-sm font-semibold text-foreground">{item.name}</h3>
                      )}
                      {isActive ? (
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Created at {formatDate(item.created_at)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isActive ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void switchWorkspace(item.id)}
                        disabled={actioningId === item.id}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Switch
                      </Button>
                    ) : null}

                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={() => void confirmWorkspaceRename(item.id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingWorkspaceId(null);
                            setEditingWorkspaceName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingWorkspaceId(item.id);
                          setEditingWorkspaceName(item.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Rename
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => {
                        setDeleteTarget({ type: "workspace", id: item.id, name: item.name });
                        setDeleteConfirmationText("");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Systems (Projects)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Workspace: {workspace?.name ?? "N/A"}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder="System 1"
            className="sm:max-w-md"
          />
          <Button
            onClick={() => void handleCreateProject()}
            disabled={!workspace?.id || !canCreateProject || actioningId === "project:create"}
          >
            {actioningId === "project:create" ? "Creating..." : "Create System"}
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {contextLoading ? <p className="text-sm text-muted-foreground">Loading systems...</p> : null}
          {projects.map((item) => {
            const isActive = project?.id === item.id;
            const isEditing = editingProjectId === item.id;
            return (
              <article key={item.id} className="rounded-xl border border-border/70 bg-background/40 p-3 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isEditing ? (
                        <Input
                          value={editingProjectName}
                          onChange={(event) => setEditingProjectName(event.target.value)}
                          className="h-8 w-full max-w-sm"
                        />
                      ) : (
                        <h3 className="truncate text-sm font-semibold text-foreground">{item.name}</h3>
                      )}
                      {isActive ? <Badge variant="outline" className="text-xs">Active</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Created at {formatDate(item.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isActive ? (
                      <Button size="sm" variant="secondary" onClick={() => void switchProject(item.id)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Switch
                      </Button>
                    ) : null}
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={() => void confirmProjectRename(item.id)}>Save</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProjectId(null);
                            setEditingProjectName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingProjectId(item.id);
                          setEditingProjectName(item.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Rename
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => {
                        setDeleteTarget({ type: "project", id: item.id, name: item.name });
                        setDeleteConfirmationText("");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Environments</h2>
        <p className="mt-1 text-xs text-muted-foreground">System: {project?.name ?? "N/A"}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newEnvironmentName}
            onChange={(event) => setNewEnvironmentName(event.target.value)}
            placeholder="Production"
            className="sm:max-w-md"
          />
          <Button
            onClick={() => void handleCreateEnvironment()}
            disabled={!project?.id || !canCreateEnvironment || actioningId === "environment:create"}
          >
            {actioningId === "environment:create" ? "Creating..." : "Create Environment"}
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {environments.map((item) => {
            const isActive = environment?.id === item.id;
            const isEditing = editingEnvironmentId === item.id;
            return (
              <article key={item.id} className="rounded-xl border border-border/70 bg-background/40 p-3 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isEditing ? (
                        <Input
                          value={editingEnvironmentName}
                          onChange={(event) => setEditingEnvironmentName(event.target.value)}
                          className="h-8 w-full max-w-sm"
                        />
                      ) : (
                        <h3 className="truncate text-sm font-semibold text-foreground">{item.name}</h3>
                      )}
                      {isActive ? <Badge variant="outline" className="text-xs">Active</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Created at {formatDate(item.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isActive ? (
                      <Button size="sm" variant="secondary" onClick={() => void switchEnvironment(item.id)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Switch
                      </Button>
                    ) : null}
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={() => void confirmEnvironmentRename(item.id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingEnvironmentId(null);
                            setEditingEnvironmentName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingEnvironmentId(item.id);
                          setEditingEnvironmentName(item.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Rename
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => {
                        setDeleteTarget({ type: "environment", id: item.id, name: item.name });
                        setDeleteConfirmationText("");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmationText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.type}</DialogTitle>
            <DialogDescription>
              This is a soft delete. To confirm, type the exact phrase below.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Required phrase:{" "}
                <span className="font-mono text-foreground">{requiredDeletePhrase}</span>
              </p>
              <Input
                value={deleteConfirmationText}
                onChange={(event) => setDeleteConfirmationText(event.target.value)}
                placeholder={requiredDeletePhrase}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmationText("");
              }}
              disabled={Boolean(actioningId)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteTarget()}
              disabled={
                !deleteTarget ||
                deleteConfirmationText !== requiredDeletePhrase ||
                actioningId === deleteTarget.id
              }
            >
              {actioningId === deleteTarget?.id ? "Deleting..." : `Delete ${deleteTarget?.type ?? ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

