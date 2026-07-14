import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import { supabase } from "../supabase";
import type { AuthClient } from "./types";
import { resolveProvider } from "./resolveProvider";
import { createSupabaseAuthClient } from "./supabaseAuthClient";
import { createKeycloakAuthClient } from "./keycloakAuthClient";

export type { AuthClient, AuthSession, AuthUser, AuthProviderName } from "./types";

let cached: AuthClient | null = null;

/** Cliente de auth selecionado por `VITE_AUTH_PROVIDER` (default supabase). Singleton por processo. */
export function getAuthClient(): AuthClient {
  if (!cached) cached = build();
  return cached;
}

function build(): AuthClient {
  const provider = resolveProvider(import.meta.env.VITE_AUTH_PROVIDER);
  if (provider === "keycloak") {
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
  return createSupabaseAuthClient(supabase.auth);
}
