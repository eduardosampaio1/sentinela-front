import type { AuthProviderName } from "./types";

/**
 * Resolve o provider de auth a partir do valor de `VITE_AUTH_PROVIDER`.
 * Fail-closed: default `supabase` (deploy atual intocado); valor desconhecido lança
 * (não cai silenciosamente em nenhum provider).
 */
export function resolveProvider(raw: string | undefined | null): AuthProviderName {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "" || value === "supabase") return "supabase";
  if (value === "keycloak") return "keycloak";
  throw new Error(
    `VITE_AUTH_PROVIDER inválido: "${raw}". Use "supabase" (default) ou "keycloak".`,
  );
}
