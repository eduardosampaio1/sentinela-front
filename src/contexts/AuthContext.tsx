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

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  workspaceLoading: boolean;
  refreshWorkspace: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

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
          return;
        }

        const selectedWorkspace =
          (preferredId ? listed.find((item) => item.id === preferredId) : null) ??
          listed[0];

        setWorkspaces(listed);
        setWorkspace(selectedWorkspace);
        setStoredWorkspaceId(selectedWorkspace.id);
      } catch (error) {
        console.error(error);
        setWorkspace(null);
        setWorkspaces([]);
      } finally {
        setWorkspaceLoading(false);
      }
    },
    []
  );

  const refreshWorkspace = useCallback(async () => {
    if (!user) {
      setWorkspace(null);
      setWorkspaces([]);
      return;
    }
    await syncWorkspaceState(user);
  }, [syncWorkspaceState, user]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;
      const existing = workspaces.find((item) => item.id === workspaceId);
      if (existing) {
        setWorkspace(existing);
        setStoredWorkspaceId(existing.id);
        return;
      }
      await syncWorkspaceState(user, workspaceId);
    },
    [syncWorkspaceState, user, workspaces]
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
    [syncWorkspaceState, user]
  );

  const renameWorkspace = useCallback(
    async (workspaceId: string, name: string) => {
      if (!user) return;
      await renameWorkspaceRecord(workspaceId, name);
      await syncWorkspaceState(user, workspaceId);
    },
    [syncWorkspaceState, user]
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;
      await softDeleteWorkspace(workspaceId);

      const fallbackWorkspace =
        workspace?.id === workspaceId
          ? workspaces.find((item) => item.id !== workspaceId)?.id ?? null
          : workspace?.id ?? null;

      await syncWorkspaceState(user, fallbackWorkspace);
    },
    [syncWorkspaceState, user, workspace?.id, workspaces]
  );

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
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        if (mounted) {
          setWorkspace(null);
          setWorkspaces([]);
          setWorkspaceLoading(false);
          setStoredWorkspaceId(null);
          setLoading(false);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted) {
        handleAuthChange(initialSession);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      handleAuthChange(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncWorkspaceState]);

  const value = useMemo(
    () => ({
      user,
      session,
      workspace,
      workspaces,
      loading,
      workspaceLoading,
      refreshWorkspace,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
    }),
    [
      user,
      session,
      workspace,
      workspaces,
      loading,
      workspaceLoading,
      refreshWorkspace,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
    ]
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
