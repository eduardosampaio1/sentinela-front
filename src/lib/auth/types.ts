export type AuthProviderName = "supabase" | "keycloak";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

/** Costura de auth provider-neutra. Duas implementações: supabase (atual) e keycloak (OIDC). */
export interface AuthClient {
  provider: AuthProviderName;
  getSession(): Promise<AuthSession | null>;
  getAccessToken(): Promise<string | null>;
  /** Assina mudanças de sessão; devolve unsubscribe. */
  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void;
  signOut(): Promise<void>;
  // modelo redirect (keycloak) — no supabase, as telas de formulário chamam lib/auth.ts
  startLogin(nextPath?: string): Promise<void>;
  startRegister(nextPath?: string): Promise<void>;
  startPasswordReset(): Promise<void>;
  completeLoginCallback(): Promise<AuthSession | null>;
  /** Console de conta do provider (Keycloak Account) ou null (supabase usa telas próprias). */
  accountManagementUrl(): string | null;
  /** true = login/registro/reset por formulário na SPA (supabase); false = redirect (keycloak). */
  supportsPasswordForms(): boolean;
}
