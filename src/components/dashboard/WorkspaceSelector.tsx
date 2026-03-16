import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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

export default function WorkspaceSelector() {
  const {
    workspace,
    workspaces,
    workspaceLoading,
    switchWorkspace,
    createWorkspace,
  } = useAuth();
  const { toast } = useToast();

  const [openCreate, setOpenCreate] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const workspaceOptions = useMemo(
    () =>
      workspaces.map((item) => ({
        id: item.id,
        label: item.name,
      })),
    [workspaces]
  );

  async function handleWorkspaceChange(nextWorkspaceId: string) {
    if (!nextWorkspaceId || nextWorkspaceId === workspace?.id) return;
    try {
      await switchWorkspace(nextWorkspaceId);
    } catch (error) {
      toast({
        title: "Failed to switch workspace",
        description: error instanceof Error ? error.message : "Unknown workspace switch error.",
        variant: "destructive",
      });
    }
  }

  async function handleCreateWorkspace() {
    const trimmedName = newWorkspaceName.trim();
    if (!trimmedName) {
      toast({
        title: "Workspace name required",
        description: "Provide a workspace name before creating.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createWorkspace(trimmedName);
      setNewWorkspaceName("");
      setOpenCreate(false);
      toast({
        title: "Workspace created",
        description: `${trimmedName} is ready.`,
      });
    } catch (error) {
      toast({
        title: "Failed to create workspace",
        description: error instanceof Error ? error.message : "Unknown workspace creation error.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Workspace</span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <select
          value={workspace?.id ?? ""}
          onChange={(event) => {
            void handleWorkspaceChange(event.target.value);
          }}
          disabled={workspaceLoading || workspaceOptions.length === 0}
          className="h-9 min-w-[180px] max-w-[260px] rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          {workspaceOptions.length === 0 ? (
            <option value="">Loading...</option>
          ) : (
            workspaceOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))
          )}
        </select>

        <Button size="sm" variant="outline" onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4" />
          Create
        </Button>

        <Button asChild size="sm" variant="ghost">
          <Link to="/dashboard/workspaces">Manage</Link>
        </Button>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace for a separate analysis context.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="new-workspace-name" className="text-sm text-muted-foreground">
              Workspace name
            </label>
            <Input
              id="new-workspace-name"
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder="Acme AI"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateWorkspace()} disabled={submitting}>
              {submitting ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
