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
import { ensureUserWorkspace, type Workspace } from "@/lib/workspaces";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  workspace: Workspace | null;
  loading: boolean;
  workspaceLoading: boolean;
  refreshWorkspace: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const refreshWorkspace = useCallback(async () => {
    if (!user) {
      setWorkspace(null);
      return;
    }

    setWorkspaceLoading(true);
    try {
      const ensuredWorkspace = await ensureUserWorkspace(user.id, user.email);
      setWorkspace(ensuredWorkspace);
    } catch (error) {
      console.error(error);
      setWorkspace(null);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const handleAuthChange = async (currSession: Session | null) => {
      const currUser = currSession?.user ?? null;

      if (mounted) {
        setSession(currSession);
        setUser(currUser);
      }

      if (currUser) {
        if (mounted) setWorkspaceLoading(true);
        try {
          const ensuredWorkspace = await ensureUserWorkspace(
            currUser.id,
            currUser.email
          );
          if (mounted) setWorkspace(ensuredWorkspace);
        } catch (error) {
          console.error(error);
          if (mounted) setWorkspace(null);
        } finally {
          if (mounted) {
            setWorkspaceLoading(false);
            setLoading(false);
          }
        }
      } else {
        if (mounted) {
          setWorkspace(null);
          setWorkspaceLoading(false);
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
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      workspace,
      loading,
      workspaceLoading,
      refreshWorkspace,
    }),
    [user, session, workspace, loading, workspaceLoading, refreshWorkspace]
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