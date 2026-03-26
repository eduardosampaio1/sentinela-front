// ============================================================
// Domain: Workspace Types
// ============================================================

export interface DomainWorkspace {
  id: string;
  name: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DomainProject {
  id: string;
  workspaceId: string;
  name: string;
  systemType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DomainEnvironment {
  id: string;
  projectId: string;
  name: string;
  environmentType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceContext {
  workspace: DomainWorkspace | null;
  project: DomainProject | null;
  environment: DomainEnvironment | null;
}

export interface WorkspaceHierarchy {
  workspace: DomainWorkspace;
  projects: Array<{
    project: DomainProject;
    environments: DomainEnvironment[];
  }>;
}

export type WorkspaceOperationStatus = "idle" | "loading" | "success" | "error";

export interface AnalysisRunSummary {
  id: string;
  workspaceId: string;
  projectId: string;
  environmentId: string;
  createdAt: string;
  nConversations?: number;
  nIntents?: number;
  riskLevel?: string;
  engineVersion?: string;
  status?: string;
  sourceFilename?: string;
}
