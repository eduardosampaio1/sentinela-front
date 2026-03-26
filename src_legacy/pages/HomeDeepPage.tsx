import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, LogOut } from "lucide-react";
import AnalysisIngestionCard from "@/components/dashboard/AnalysisIngestionCard";
import AnalysisLoadingOverlay from "@/components/dashboard/AnalysisLoadingOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  createSystemEnvironment,
  createSystemProject,
  listProjectEnvironments,
  listWorkspaceProjects,
  renameSystemEnvironment,
  renameSystemProject,
} from "@/lib/systemRegistry";

const ENVIRONMENT_CHOICES = [
  { value: "production", label: "Production" },
  { value: "development", label: "Development" },
  { value: "homologation", label: "Homologation" },
  { value: "custom", label: "Custom" },
] as const;

type EnvironmentChoice = (typeof ENVIRONMENT_CHOICES)[number]["value"];

function environmentLabelFromChoice(choice: EnvironmentChoice): string {
  if (choice === "production") return "Production";
  if (choice === "development") return "Development";
  if (choice === "homologation") return "Homologation";
  return "Custom";
}

export default function HomeDeepPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    createWorkspace,
    refreshContext,
    switchWorkspace,
    switchProject,
    switchEnvironment,
    signOut,
  } = useAuth();
  const {
    loading,
    loadingMessage,
    loadingProgress,
    result,
    handleFileUpload,
    handlePasteAnalysis,
    importAnalysisResult,
  } = useAnalysis();

  const [projectName, setProjectName] = useState("Sentinela");
  const [systemName, setSystemName] = useState("Call Center Support");
  const [environmentChoice, setEnvironmentChoice] = useState<EnvironmentChoice>("production");
  const [customEnvironmentName, setCustomEnvironmentName] = useState("");
  const [settingContext, setSettingContext] = useState(false);
  const [contextCreated, setContextCreated] = useState(false);
  const [openComposerSignal, setOpenComposerSignal] = useState(0);
  const [pendingDashboardRedirect, setPendingDashboardRedirect] = useState(false);
  const [createdContextSummary, setCreatedContextSummary] = useState<{
    project: string;
    system: string;
    environment: string;
  } | null>(null);

  const environmentName = useMemo(() => {
    if (environmentChoice === "custom") {
      return customEnvironmentName.trim();
    }
    return environmentLabelFromChoice(environmentChoice);
  }, [customEnvironmentName, environmentChoice]);

  const canSubmit =
    projectName.trim().length > 1 &&
    systemName.trim().length > 1 &&
    environmentName.trim().length > 1 &&
    !settingContext;

  useEffect(() => {
    if (!pendingDashboardRedirect) return;
    if (loading) return;
    if (!result) return;

    setPendingDashboardRedirect(false);
    navigate("/dashboard");
  }, [loading, navigate, pendingDashboardRedirect, result]);

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function handleCreateContext() {
    if (!canSubmit) {
      toast({
        title: "Complete all required fields",
        description: "Project, system, and environment are required before analysis.",
        variant: "destructive",
      });
      return;
    }

    setSettingContext(true);
    try {
      const workspaceName = projectName.trim();
      const desiredSystemName = systemName.trim();
      const desiredEnvironmentName = environmentName.trim();

      const workspace = await createWorkspace(workspaceName);
      if (!workspace?.id) {
        throw new Error("Could not create project workspace.");
      }

      await switchWorkspace(workspace.id);

      let workspaceProjects = await listWorkspaceProjects(workspace.id);
      let targetProject = workspaceProjects[0] ?? null;

      if (!targetProject) {
        targetProject = await createSystemProject({
          workspaceId: workspace.id,
          name: desiredSystemName,
        });
      } else if (targetProject.name !== desiredSystemName) {
        await renameSystemProject(targetProject.id, desiredSystemName);
        workspaceProjects = await listWorkspaceProjects(workspace.id);
        targetProject =
          workspaceProjects.find((item) => item.id === targetProject?.id) ??
          workspaceProjects[0] ??
          targetProject;
      }

      if (!targetProject) {
        throw new Error("Could not configure system.");
      }

      await switchProject(targetProject.id);

      let environments = await listProjectEnvironments(targetProject.id);
      let targetEnvironment = environments[0] ?? null;

      if (!targetEnvironment) {
        targetEnvironment = await createSystemEnvironment({
          projectId: targetProject.id,
          name: desiredEnvironmentName,
          environmentType:
            environmentChoice === "custom" ? "custom" : environmentChoice,
        });
      } else if (targetEnvironment.name !== desiredEnvironmentName) {
        await renameSystemEnvironment(targetEnvironment.id, desiredEnvironmentName);
        environments = await listProjectEnvironments(targetProject.id);
        targetEnvironment =
          environments.find((item) => item.id === targetEnvironment?.id) ??
          environments[0] ??
          targetEnvironment;
      }

      if (!targetEnvironment) {
        throw new Error("Could not configure environment.");
      }

      await switchEnvironment(targetEnvironment.id);
      await refreshContext();

      setCreatedContextSummary({
        project: workspaceName,
        system: desiredSystemName,
        environment: desiredEnvironmentName,
      });
      setContextCreated(true);
      setOpenComposerSignal((current) => current + 1);

      toast({
        title: "Context created",
        description: "Upload or paste your dataset to run the first deep analysis.",
      });
    } catch (error) {
      toast({
        title: "Context setup failed",
        description: error instanceof Error ? error.message : "Could not create analysis context.",
        variant: "destructive",
      });
    } finally {
      setSettingContext(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AnalysisLoadingOverlay open={loading} message={loadingMessage} progress={loadingProgress} />

      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => navigate("/home/welcome")} className="px-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </header>

        <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-foreground">Deep Analysis Setup</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Define project, system, and environment before uploading your dataset.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Sentinela"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-name">System name</Label>
              <Input
                id="system-name"
                value={systemName}
                onChange={(event) => setSystemName(event.target.value)}
                placeholder="Call Center Support"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment-choice">Environment</Label>
              <select
                id="environment-choice"
                value={environmentChoice}
                onChange={(event) => setEnvironmentChoice(event.target.value as EnvironmentChoice)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {ENVIRONMENT_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </div>

            {environmentChoice === "custom" ? (
              <div className="space-y-2">
                <Label htmlFor="custom-environment">Custom environment name</Label>
                <Input
                  id="custom-environment"
                  value={customEnvironmentName}
                  onChange={(event) => setCustomEnvironmentName(event.target.value)}
                  placeholder="Prompt-v2 test"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <Button onClick={() => void handleCreateContext()} disabled={!canSubmit}>
              {settingContext ? "Creating context..." : "Create context and continue"}
            </Button>
          </div>
        </section>

        {contextCreated ? (
          <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-2 text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              <div className="text-sm">
                Context created: {createdContextSummary?.project} / {createdContextSummary?.system} /{" "}
                {createdContextSummary?.environment}
              </div>
            </div>
          </section>
        ) : null}

        {contextCreated ? (
          <AnalysisIngestionCard
            loading={loading}
            hasResult={Boolean(result)}
            openComposerSignal={openComposerSignal}
            onFileUpload={(file) => {
              setPendingDashboardRedirect(true);
              handleFileUpload(file);
            }}
            onRunFromPaste={(text) => {
              setPendingDashboardRedirect(true);
              handlePasteAnalysis(text);
            }}
            onImportResult={(text) => {
              setPendingDashboardRedirect(true);
              importAnalysisResult(text);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
