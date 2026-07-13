import type { AuthClient, AuthSession } from "./types";

/** Forma estrutural mínima do User/UserManager do oidc-client-ts (injetável nos testes). */
interface OidcUserLike {
  access_token: string;
  expired?: boolean;
  profile: {
    sub: string;
    email?: string | null;
    name?: string | null;
    preferred_username?: string | null;
  };
}
interface UserManagerLike {
  getUser(): Promise<OidcUserLike | null>;
  signinRedirect(args?: { state?: unknown }): Promise<void>;
  signinRedirectCallback(): Promise<OidcUserLike | null>;
  signoutRedirect(): Promise<void>;
  events: {
    addUserLoaded(cb: (u: OidcUserLike) => void): void;
    removeUserLoaded(cb: (u: OidcUserLike) => void): void;
    addUserUnloaded(cb: () => void): void;
    removeUserUnloaded(cb: () => void): void;
  };
}

function toSession(user: OidcUserLike | null): AuthSession | null {
  if (!user || user.expired || !user.access_token) return null;
  const displayName = user.profile.name ?? user.profile.preferred_username ?? null;
  return {
    accessToken: user.access_token,
    user: {
      id: user.profile.sub,
      email: user.profile.email ?? null,
      user_metadata: { full_name: displayName, name: displayName },
      app_metadata: { provider: "keycloak" },
      created_at: null,
    },
  };
}

export function createKeycloakAuthClient(opts: {
  userManager: UserManagerLike;
  issuer: string;
}): AuthClient {
  const { userManager, issuer } = opts;
  const getSession = async () => toSession(await userManager.getUser());

  return {
    provider: "keycloak",
    getSession,
    async getAccessToken() {
      return (await getSession())?.accessToken ?? null;
    },
    onAuthStateChange(cb) {
      const onLoaded = (u: OidcUserLike) => cb(toSession(u));
      const onUnloaded = () => cb(null);
      userManager.events.addUserLoaded(onLoaded);
      userManager.events.addUserUnloaded(onUnloaded);
      return () => {
        userManager.events.removeUserLoaded(onLoaded);
        userManager.events.removeUserUnloaded(onUnloaded);
      };
    },
    async signOut() {
      await userManager.signoutRedirect();
    },
    async startLogin(nextPath?: string) {
      await userManager.signinRedirect({ state: { next: nextPath } });
    },
    // Keycloak-hosted login carrega os links de Registro/Esqueci-senha (realm com
    // registrationAllowed/resetPasswordAllowed). Redirecionamos ao mesmo fluxo.
    async startRegister(nextPath?: string) {
      await userManager.signinRedirect({ state: { next: nextPath } });
    },
    async startPasswordReset() {
      await userManager.signinRedirect({ state: { next: undefined } });
    },
    async completeLoginCallback() {
      return toSession(await userManager.signinRedirectCallback());
    },
    accountManagementUrl() {
      return `${issuer}/account`;
    },
    supportsPasswordForms() {
      return false;
    },
  };
}
