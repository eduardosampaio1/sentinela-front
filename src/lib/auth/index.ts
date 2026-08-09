import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import type { AuthClient } from "./types";
import { resolveProvider } from "./resolveProvider";
import { createKeycloakAuthClient } from "./keycloakAuthClient";
import { createE2EAuthClient, readE2EInjection } from "./e2eBridge";

export type { AuthClient, AuthSession, AuthUser, AuthProviderName } from "./types";

let cached: AuthClient | null = null;

/** Cliente de auth. Keycloak é o único provider desde a M02. Singleton por processo. */
export function getAuthClient(): AuthClient {
  if (!cached) cached = build();
  return cached;
}

function build(): AuthClient {
  // CADEADO fail-closed: só em DEV. `import.meta.env.DEV` é literal `false` em build de produção,
  // então este ramo é eliminado do bundle (dead-code) e nunca substitui o provider real.
  if (import.meta.env.DEV) {
    const injected = readE2EInjection();
    if (injected) return createE2EAuthClient(injected.session);
  }
  // Valida a variável mesmo havendo um provider só: configuração antiga apontando para
  // `supabase` precisa falhar alto em vez de ser ignorada.
  resolveProvider(import.meta.env.VITE_AUTH_PROVIDER);
  {
    const issuer = String(import.meta.env.VITE_KEYCLOAK_ISSUER ?? "");
    const clientId = String(import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "sentinela-front");
    const origin = window.location.origin;
    const userManager = new UserManager({
      authority: issuer,
      client_id: clientId,
      redirect_uri: `${origin}/auth/callback`,
      post_logout_redirect_uri: `${origin}/login`,
      response_type: "code",
      scope: "openid profile email",
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      automaticSilentRenew: true,
    });
    return createKeycloakAuthClient({ userManager, issuer });
  }
}
