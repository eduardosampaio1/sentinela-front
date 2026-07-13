import type { AuthClient, AuthSession } from "./types";

interface SupabaseSessionLike {
  access_token: string;
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
    app_metadata?: Record<string, unknown> | null;
    created_at?: string | null;
  };
}
interface SupabaseAuthLike {
  getSession(): Promise<{ data: { session: SupabaseSessionLike | null } }>;
  onAuthStateChange(
    cb: (event: string, session: SupabaseSessionLike | null) => void,
  ): { data: { subscription: { unsubscribe: () => void } } };
  signOut(): Promise<unknown>;
}

function toSession(s: SupabaseSessionLike | null): AuthSession | null {
  if (!s?.access_token) return null;
  return {
    accessToken: s.access_token,
    user: {
      id: s.user?.id ?? "",
      email: s.user?.email ?? null,
      user_metadata: s.user?.user_metadata ?? null,
      app_metadata: s.user?.app_metadata ?? null,
      created_at: s.user?.created_at ?? null,
    },
  };
}

/** Embrulha `supabase.auth` na costura neutra. Login/registro/reset seguem via formulários (lib/auth.ts). */
export function createSupabaseAuthClient(auth: SupabaseAuthLike): AuthClient {
  const rawSession = async () => (await auth.getSession()).data.session;
  const getSession = async () => toSession(await rawSession());
  const formsOnly = () =>
    Promise.reject(
      new Error("No modo supabase o login usa os formulários da SPA, não redirect."),
    );

  return {
    provider: "supabase",
    getSession,
    async getAccessToken() {
      return (await rawSession())?.access_token ?? null;
    },
    onAuthStateChange(cb) {
      const { data } = auth.onAuthStateChange((_event, session) => cb(toSession(session)));
      return () => data.subscription.unsubscribe();
    },
    async signOut() {
      await auth.signOut();
    },
    startLogin: formsOnly,
    startRegister: formsOnly,
    startPasswordReset: formsOnly,
    async completeLoginCallback() {
      return getSession();
    },
    accountManagementUrl() {
      return null;
    },
    supportsPasswordForms() {
      return true;
    },
  };
}
