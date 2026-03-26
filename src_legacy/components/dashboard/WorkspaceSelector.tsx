import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface WorkspaceSelectorProps {
  managePath?: string;
  compact?: boolean;
  showManageLink?: boolean;
}

interface SelectorFieldProps {
  label: string;
  value: string;
  disabled: boolean;
  options: Array<{ id: string; label: string }>;
  onChange: (nextId: string) => Promise<void>;
  compact: boolean;
}

function SelectorField({
  label,
  value,
  disabled,
  options,
  onChange,
  compact,
}: SelectorFieldProps) {
  return (
    <label className={`min-w-[140px] ${compact ? "max-w-[170px]" : ""}`}>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          const nextId = event.target.value;
          if (!nextId || nextId === value) return;
          void onChange(nextId);
        }}
        disabled={disabled}
        className={`mt-1 w-full rounded-lg border border-input/60 bg-background/60 px-2 text-foreground ${
          compact ? "h-8 text-xs" : "h-9 text-sm"
        }`}
      >
        {options.length === 0 ? (
          <option value="">Unavailable</option>
        ) : (
          options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

export default function WorkspaceSelector({
  managePath = "/workspaces",
  compact = false,
  showManageLink = true,
}: WorkspaceSelectorProps) {
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
  } = useAuth();
  const { toast } = useToast();

  const disabled = workspaceLoading || contextLoading;
  const workspaceOptions = useMemo(
    () => workspaces.map((item) => ({ id: item.id, label: item.name })),
    [workspaces],
  );
  const projectOptions = useMemo(
    () => projects.map((item) => ({ id: item.id, label: item.name })),
    [projects],
  );
  const environmentOptions = useMemo(
    () => environments.map((item) => ({ id: item.id, label: item.name })),
    [environments],
  );

  async function guardedSwitch(
    operation: () => Promise<void>,
    failureTitle: string,
    failureMessage: string,
  ) {
    try {
      await operation();
    } catch (error) {
      toast({
        title: failureTitle,
        description: error instanceof Error ? error.message : failureMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <div className={`flex min-w-0 flex-wrap items-end gap-2 ${compact ? "gap-y-1" : ""}`}>
      <SelectorField
        label="Workspace"
        value={workspace?.id ?? ""}
        disabled={disabled || workspaceOptions.length === 0}
        options={workspaceOptions}
        onChange={(nextId) =>
          guardedSwitch(
            () => switchWorkspace(nextId),
            "Failed to switch workspace",
            "Unknown workspace switch error.",
          )
        }
        compact={compact}
      />
      <SelectorField
        label="System"
        value={project?.id ?? ""}
        disabled={disabled || projectOptions.length === 0}
        options={projectOptions}
        onChange={(nextId) =>
          guardedSwitch(
            () => switchProject(nextId),
            "Failed to switch system",
            "Unknown system switch error.",
          )
        }
        compact={compact}
      />
      <SelectorField
        label="Environment"
        value={environment?.id ?? ""}
        disabled={disabled || environmentOptions.length === 0}
        options={environmentOptions}
        onChange={(nextId) =>
          guardedSwitch(
            () => switchEnvironment(nextId),
            "Failed to switch environment",
            "Unknown environment switch error.",
          )
        }
        compact={compact}
      />

      {showManageLink ? (
        <Button asChild variant="ghost" size={compact ? "sm" : "default"}>
          <Link to={managePath}>Manage Context</Link>
        </Button>
      ) : null}
    </div>
  );
}
