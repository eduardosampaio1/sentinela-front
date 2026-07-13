import type { AuthProviderName } from "./types";

/**
 * Args para `createClient`. No modo keycloak sem env Supabase, devolve placeholders
 * não-vazios (o cliente é criado mas nunca usado — auth via Keycloak, dados via gateway),
 * evitando que `createClient("")` quebre o import. No modo supabase, passa a env real.
 */
export function supabaseClientArgs(
  provider: AuthProviderName,
  url: string,
  key: string,
): { url: string; key: string } {
  if (provider === "keycloak" && (!url || !key)) {
    return { url: "https://keycloak-mode.local", key: "keycloak-mode-unused" };
  }
  return { url, key };
}

/**
 * Preserva o guard do modo supabase (lança em PROD se faltar env). No modo keycloak,
 * Supabase é opcional: nunca lança.
 */
export function assertSupabaseEnv(
  provider: AuthProviderName,
  url: string,
  key: string,
  isProd: boolean,
): void {
  if (provider !== "supabase") return;
  if (url && key) return;
  const msg =
    "[Sentinela] Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. " +
    "Authentication will not work. Set these variables in your .env file.";
  if (isProd) {
    throw new Error(msg);
  } else {
    console.error(msg);
  }
}
