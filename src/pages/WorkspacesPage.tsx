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

export default function WorkspacesPage() {
  const {
    workspace,
    workspaces,
    workspaceLoading,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  } = useAuth();
  const { toast } = useToast();

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [actioningWorkspaceId, setActioningWorkspaceId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const canCreate = useMemo(() => newWorkspaceName.trim().length > 1, [newWorkspaceName]);

  async function handleCreateWorkspace() {
    if (!canCreate) return;
    const workspaceName = newWorkspaceName.trim();
    setActioningWorkspaceId("create");
    try {
      await createWorkspace(workspaceName);
      setNewWorkspaceName("");
      toast({
        title: "Workspace created",
        description: `${workspaceName} is now available.`,
      });
    } catch (error) {
      toast({
        title: "Failed to create workspace",
        description: error instanceof Error ? error.message : "Unknown workspace creation error.",
        variant: "destructive",
      });
    } finally {
      setActioningWorkspaceId(null);
    }
  }

  function beginRename(workspaceId: string, currentName: string) {
    setEditingWorkspaceId(workspaceId);
    setEditingWorkspaceName(currentName);
  }

  async function confirmRename(workspaceId: string) {
    const name = editingWorkspaceName.trim();
    if (!name) {
      toast({
        title: "Workspace name required",
        variant: "destructive",
      });
      return;
    }

    setActioningWorkspaceId(workspaceId);
    try {
      await renameWorkspace(workspaceId, name);
      setEditingWorkspaceId(null);
      setEditingWorkspaceName("");
      toast({
        title: "Workspace renamed",
      });
    } catch (error) {
      toast({
        title: "Failed to rename workspace",
        description: error instanceof Error ? error.message : "Unknown workspace rename error.",
        variant: "destructive",
      });
    } finally {
      setActioningWorkspaceId(null);
    }
  }

  async function handleDeleteWorkspace() {
    if (!deleteTarget) return;
    setActioningWorkspaceId(deleteTarget.id);
    try {
      await deleteWorkspace(deleteTarget.id);
      toast({
        title: "Workspace archived",
        description: `${deleteTarget.name} was soft deleted.`,
      });
      setDeleteTarget(null);
      setDeleteConfirmationText("");
    } catch (error) {
      toast({
        title: "Failed to delete workspace",
        description: error instanceof Error ? error.message : "Unknown workspace delete error.",
        variant: "destructive",
      });
    } finally {
      setActioningWorkspaceId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage analysis contexts for different products, assistants, and teams.
        </p>
      </header>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Create Workspace</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newWorkspaceName}
            onChange={(event) => setNewWorkspaceName(event.target.value)}
            placeholder="Sales Copilot"
            className="sm:max-w-md"
          />
          <Button
            onClick={() => void handleCreateWorkspace()}
            disabled={!canCreate || actioningWorkspaceId === "create"}
          >
            {actioningWorkspaceId === "create" ? "Creating..." : "Create Workspace"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Workspace List</h2>
        {workspaceLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading workspaces...</p>
        ) : null}

        {!workspaceLoading && workspaces.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No workspaces found. Create one to start organizing analyses.
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {workspaces.map((item) => {
            const isActive = workspace?.id === item.id;
            const isActioning = actioningWorkspaceId === item.id;
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
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
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
                        disabled={isActioning}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Switch
                      </Button>
                    ) : null}

                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void confirmRename(item.id)}
                          disabled={isActioning}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingWorkspaceId(null);
                            setEditingWorkspaceName("");
                          }}
                          disabled={isActioning}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => beginRename(item.id, item.name)}
                        disabled={isActioning}
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
                        setDeleteTarget({ id: item.id, name: item.name });
                        setDeleteConfirmationText("");
                      }}
                      disabled={isActioning}
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
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This is a soft delete and removes the workspace from active lists.
              To confirm, type the exact phrase below.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Required phrase:{" "}
                <span className="font-mono text-foreground">
                  delete workspace {deleteTarget.name}
                </span>
              </p>
              <Input
                value={deleteConfirmationText}
                onChange={(event) => setDeleteConfirmationText(event.target.value)}
                placeholder={`delete workspace ${deleteTarget.name}`}
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
              disabled={Boolean(actioningWorkspaceId)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteWorkspace()}
              disabled={
                !deleteTarget ||
                deleteConfirmationText !== `delete workspace ${deleteTarget.name}` ||
                actioningWorkspaceId === deleteTarget.id
              }
            >
              {actioningWorkspaceId === deleteTarget?.id ? "Deleting..." : "Delete Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
