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
      console.error("Failed to refresh workspace", error);
      setWorkspace(null);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data.session;
        const currentUser = currentSession?.user ?? null;

        if (!mounted) return;

        setSession(currentSession);
        setUser(currentUser);

        // Libera a aplicação assim que a sessão for conhecida
        setLoading(false);

        // Workspace carrega em paralelo, sem travar a rota
        if (currentUser) {
          setWorkspaceLoading(true);
          try {
            const ensuredWorkspace = await ensureUserWorkspace(
              currentUser.id,
              currentUser.email
            );

            if (mounted) {
              setWorkspace(ensuredWorkspace);
            }
          } catch (error) {
            console.error("Failed to ensure workspace on bootstrap", error);
            if (mounted) {
              setWorkspace(null);
            }
          } finally {
            if (mounted) {
              setWorkspaceLoading(false);
            }
          }
        } else {
          setWorkspace(null);
          setWorkspaceLoading(false);
        }
      } catch (error) {
        console.error("Failed to bootstrap auth session", error);
        if (mounted) {
          setLoading(false);
          setWorkspaceLoading(false);
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);

      // sessão resolvida → não travar mais a app
      setLoading(false);

      if (nextUser) {
        setWorkspaceLoading(true);
        try {
          const ensuredWorkspace = await ensureUserWorkspace(
            nextUser.id,
            nextUser.email
          );
          setWorkspace(ensuredWorkspace);
        } catch (error) {
          console.error("Failed to ensure workspace on auth state change", error);
          setWorkspace(null);
        } finally {
          setWorkspaceLoading(false);
        }
      } else {
        setWorkspace(null);
        setWorkspaceLoading(false);
      }
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