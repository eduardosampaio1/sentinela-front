/** Um provider só, desde a M02. O tipo permanece para a fronteira seguir explícita. */
export type AuthProviderName = "keycloak";

export interface AuthUser {
  id: string;
  email: string | null;
  // Forma herdada, ainda consumida por Profile/Settings/Sidebar/TopBar. Preservada na M02:
  // mudá-la seria refatorar essas telas, e esta missão não altera aparência.
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

/** Costura de auth. Uma implementação: keycloak (OIDC). */
export interface AuthClient {
  provider: AuthProviderName;
  getSession(): Promise<AuthSession | null>;
  getAccessToken(): Promise<string | null>;
  /** Assina mudanças de sessão; devolve unsubscribe. */
  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void;
  signOut(): Promise<void>;
  // opts.idpHint: pula a tela do Keycloak e vai direto ao IdP (kc_idp_hint).
  startLogin(nextPath?: string, opts?: { idpHint?: "google" | "github" }): Promise<void>;
  startRegister(nextPath?: string): Promise<void>;
  startPasswordReset(): Promise<void>;
  completeLoginCallback(): Promise<AuthSession | null>;
  /** Console de conta do provider (Keycloak Account). Nunca `null` desde a M02. */
  accountManagementUrl(): string | null;
  /**
   * `false` sempre, desde a M02: a SPA nunca coleta credencial. Permanece porque é o que as telas
   * leem para escolher entre formulário e redirect — removê-lo obrigaria a mexer em seis
   * superfícies, e esta missão não redesenha nenhuma.
   */
  supportsPasswordForms(): boolean;
}
