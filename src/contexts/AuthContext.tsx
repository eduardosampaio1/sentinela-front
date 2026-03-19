import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  createWorkspace as createWorkspaceRecord,
  getStoredWorkspaceId,
  listUserWorkspaces,
  renameWorkspace as renameWorkspaceRecord,
  setStoredWorkspaceId,
  softDeleteWorkspace,
  type Workspace,
} from "@/lib/workspaces";
import {
  createSystemEnvironment,
  createSystemProject,
  getStoredEnvironmentId,
  getStoredProjectId,
  listProjectEnvironments,
  listWorkspaceProjects,
  renameSystemEnvironment,
  renameSystemProject,
  setStoredEnvironmentId,
  setStoredProjectId,
  softDeleteSystemEnvironment,
  softDeleteSystemProject,
  type SystemEnvironment,
  type SystemProject,
} from "@/lib/systemRegistry";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  project: SystemProject | null;
  projects: SystemProject[];
  environment: SystemEnvironment | null;
  environments: SystemEnvironment[];
  loading: boolean;
  workspaceLoading: boolean;
  contextLoading: boolean;
  refreshWorkspace: () => Promise<void>;
  refreshContext: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  switchEnvironment: (environmentId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  createProject: (name: string) => Promise<SystemProject | null>;
  renameProject: (projectId: string, name: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createEnvironment: (name: string) => Promise<SystemEnvironment | null>;
  renameEnvironment: (environmentId: string, name: string) => Promise<void>;
  deleteEnvironment: (environmentId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function pickFirst<T>(items: T[]): T | null {
  return items.length > 0 ? items[0] : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [project, setProject] = useState<SystemProject | null>(null);
  const [projects, setProjects] = useState<SystemProject[]>([]);
  const [environment, setEnvironment] = useState<SystemEnvironment | null>(null);
  const [environments, setEnvironments] = useState<SystemEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);

  const clearContext = useCallback(() => {
    setProject(null);
    setProjects([]);
    setEnvironment(null);
    setEnvironments([]);
  }, []);

  const syncProjectEnvironment = useCallback(
    async (
      currentWorkspace: Workspace | null,
      options?: {
        preferredProjectId?: string | null;
        preferredEnvironmentId?: string | null;
        autoCreateDefaults?: boolean;
      },
    ) => {
      if (!currentWorkspace?.id) {
        clearContext();
        return;
      }

      const autoCreateDefaults = options?.autoCreateDefaults ?? true;
      setContextLoading(true);

      try {
        let listedProjects = await listWorkspaceProjects(currentWorkspace.id);
        if (listedProjects.length === 0 && autoCreateDefaults) {
          const createdDefaultProject = await createSystemProject({
            workspaceId: currentWorkspace.id,
            name: "System 1",
            systemType: "other",
          });
          listedProjects = [createdDefaultProject];
        }

        if (listedProjects.length === 0) {
          clearContext();
          setStoredProjectId(currentWorkspace.id, null);
          return;
        }

        const preferredProjectId =
          options?.preferredProjectId ?? getStoredProjectId(currentWorkspace.id);
        const selectedProject =
          (preferredProjectId
            ? listedProjects.find((item) => item.id === preferredProjectId)
            : null) ?? pickFirst(listedProjects);

        if (!selectedProject) {
          clearContext();
          setStoredProjectId(currentWorkspace.id, null);
          return;
        }

        setProjects(listedProjects);
        setProject(selectedProject);
        setStoredProjectId(currentWorkspace.id, selectedProject.id);

        let listedEnvironments = await listProjectEnvironments(selectedProject.id);
        if (listedEnvironments.length === 0 && autoCreateDefaults) {
          const createdDefaultEnvironment = await createSystemEnvironment({
            projectId: selectedProject.id,
            name: "Production",
            environmentType: "production",
          });
          listedEnvironments = [createdDefaultEnvironment];
        }

        if (listedEnvironments.length === 0) {
          setEnvironments([]);
          setEnvironment(null);
          setStoredEnvironmentId(selectedProject.id, null);
          return;
        }

        const preferredEnvironmentId =
          options?.preferredEnvironmentId ?? getStoredEnvironmentId(selectedProject.id);
        const selectedEnvironment =
          (preferredEnvironmentId
            ? listedEnvironments.find((item) => item.id === preferredEnvironmentId)
            : null) ?? pickFirst(listedEnvironments);

        setEnvironments(listedEnvironments);
        setEnvironment(selectedEnvironment);
        if (selectedEnvironment) {
          setStoredEnvironmentId(selectedProject.id, selectedEnvironment.id);
        }
      } finally {
        setContextLoading(false);
      }
    },
    [clearContext],
  );

  const syncWorkspaceState = useCallback(
    async (currUser: User, preferredWorkspaceId?: string | null) => {
      setWorkspaceLoading(true);
      try {
        const preferredId = preferredWorkspaceId ?? getStoredWorkspaceId();
        const listed = await listUserWorkspaces(currUser.id);

        if (listed.length === 0) {
          setWorkspaces([]);
          setWorkspace(null);
          setStoredWorkspaceId(null);
          clearContext();
          return;
        }

        const selectedWorkspace =
          (preferredId ? listed.find((item) => item.id === preferredId) : null) ?? listed[0];

        setWorkspaces(listed);
        setWorkspace(selectedWorkspace);
        setStoredWorkspaceId(selectedWorkspace.id);
        await syncProjectEnvironment(selectedWorkspace);
      } catch (error) {
        console.error(error);
        setWorkspace(null);
        setWorkspaces([]);
        clearContext();
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [clearContext, syncProjectEnvironment],
  );

  const refreshWorkspace = useCallback(async () => {
    if (!user) {
      setWorkspace(null);
      setWorkspaces([]);
      clearContext();
      return;
    }
    await syncWorkspaceState(user);
  }, [clearContext, syncWorkspaceState, user]);

  const refreshContext = useCallback(async () => {
    if (!workspace?.id) {
      clearContext();
      return;
    }
    await syncProjectEnvironment(workspace, { autoCreateDefaults: true });
  }, [clearContext, syncProjectEnvironment, workspace]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;
      const existing = workspaces.find((item) => item.id === workspaceId);
      if (existing) {
        setWorkspace(existing);
        setStoredWorkspaceId(existing.id);
        await syncProjectEnvironment(existing, { autoCreateDefaults: true });
        return;
      }
      await syncWorkspaceState(user, workspaceId);
    },
    [syncProjectEnvironment, syncWorkspaceState, user, workspaces],
  );

  const switchProject = useCallback(
    async (projectId: string) => {
      if (!workspace?.id) return;
      const existing = projects.find((item) => item.id === projectId);
      if (!existing) {
        await syncProjectEnvironment(workspace, {
          preferredProjectId: projectId,
          autoCreateDefaults: true,
        });
        return;
      }
      setProject(existing);
      setStoredProjectId(workspace.id, existing.id);
      await syncProjectEnvironment(workspace, {
        preferredProjectId: existing.id,
        autoCreateDefaults: true,
      });
    },
    [projects, syncProjectEnvironment, workspace],
  );

  const switchEnvironment = useCallback(
    async (environmentId: string) => {
      if (!workspace?.id || !project?.id) return;
      const existing = environments.find((item) => item.id === environmentId);
      if (!existing) {
        await syncProjectEnvironment(workspace, {
          preferredProjectId: project.id,
          preferredEnvironmentId: environmentId,
          autoCreateDefaults: true,
        });
        return;
      }
      setEnvironment(existing);
      setStoredEnvironmentId(project.id, existing.id);
    },
    [environments, project?.id, syncProjectEnvironment, workspace],
  );

  const createWorkspace = useCallback(
    async (name: string) => {
      if (!user) return null;
      const created = await createWorkspaceRecord({
        userId: user.id,
        name,
        email: user.email,
      });
      await syncWorkspaceState(user, created.id);
      return created;
    },
    [syncWorkspaceState, user],
  );

  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      if (!user) return;
      await renameWorkspaceRecord(workspaceId, name);
      await syncWorkspaceState(user, workspaceId);
    },
    [syncWorkspaceState, user],
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;
      await softDeleteWorkspace(workspaceId);

      const fallbackWorkspaceId =
        workspace?.id === workspaceId
          ? workspaces.find((item) => item.id !== workspaceId)?.id ?? null
          : workspace?.id ?? null;

      await syncWorkspaceState(user, fallbackWorkspaceId);
    },
    [syncWorkspaceState, user, workspace?.id, workspaces],
  );

  const createProject = useCallback(
    async (name: string) => {
      if (!workspace?.id) return null;
      const created = await createSystemProject({
        workspaceId: workspace.id,
        name,
      });
      await syncProjectEnvironment(workspace, {
        preferredProjectId: created.id,
        autoCreateDefaults: true,
      });
      return created;
    },
    [syncProjectEnvironment, workspace],
  );

  const renameProject = useCallback(
    async (projectId: string, name: string) => {
      if (!workspace?.id) return;
      await renameSystemProject(projectId, name);
      await syncProjectEnvironment(workspace, {
        preferredProjectId: project?.id === projectId ? projectId : undefined,
        preferredEnvironmentId: environment?.id,
        autoCreateDefaults: true,
      });
    },
    [environment?.id, project?.id, syncProjectEnvironment, workspace],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!workspace?.id) return;
      await softDeleteSystemProject(projectId);
      await syncProjectEnvironment(workspace, { autoCreateDefaults: true });
    },
    [syncProjectEnvironment, workspace],
  );

  const createEnvironment = useCallback(
    async (name: string) => {
      if (!workspace?.id || !project?.id) return null;
      const created = await createSystemEnvironment({
        projectId: project.id,
        name,
      });
      await syncProjectEnvironment(workspace, {
        preferredProjectId: project.id,
        preferredEnvironmentId: created.id,
        autoCreateDefaults: true,
      });
      return created;
    },
    [project?.id, syncProjectEnvironment, workspace],
  );

  const renameEnvironment = useCallback(
    async (environmentId: string, name: string) => {
      if (!workspace?.id || !project?.id) return;
      await renameSystemEnvironment(environmentId, name);
      await syncProjectEnvironment(workspace, {
        preferredProjectId: project.id,
        preferredEnvironmentId: environment?.id === environmentId ? environmentId : undefined,
        autoCreateDefaults: true,
      });
    },
    [environment?.id, project?.id, syncProjectEnvironment, workspace],
  );

  const deleteEnvironment = useCallback(
    async (environmentId: string) => {
      if (!workspace?.id || !project?.id) return;
      await softDeleteSystemEnvironment(environmentId);
      await syncProjectEnvironment(workspace, {
        preferredProjectId: project.id,
        autoCreateDefaults: true,
      });
    },
    [project?.id, syncProjectEnvironment, workspace],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setWorkspace(null);
    setWorkspaces([]);
    clearContext();
    setStoredWorkspaceId(null);
  }, [clearContext]);

  useEffect(() => {
    let mounted = true;

    const handleAuthChange = async (currSession: Session | null) => {
      const currUser = currSession?.user ?? null;

      if (mounted) {
        setSession(currSession);
        setUser(currUser);
      }

      if (currUser) {
        try {
          await syncWorkspaceState(currUser, getStoredWorkspaceId());
        } catch (error) {
          console.error(error);
          if (mounted) {
            setWorkspace(null);
            setWorkspaces([]);
            clearContext();
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else if (mounted) {
        setWorkspace(null);
        setWorkspaces([]);
        clearContext();
        setWorkspaceLoading(false);
        setContextLoading(false);
        setStoredWorkspaceId(null);
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted) {
        void handleAuthChange(initialSession);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      void handleAuthChange(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearContext, syncWorkspaceState]);

  const value = useMemo(
    () => ({
      user,
      session,
      workspace,
      workspaces,
      project,
      projects,
      environment,
      environments,
      loading,
      workspaceLoading,
      contextLoading,
      refreshWorkspace,
      refreshContext,
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
      signOut,
    }),
    [
      user,
      session,
      workspace,
      workspaces,
      project,
      projects,
      environment,
      environments,
      loading,
      workspaceLoading,
      contextLoading,
      refreshWorkspace,
      refreshContext,
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
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
