import type { AuthProviderName } from "./types";

/**
 * Resolve o provider de auth a partir de `VITE_AUTH_PROVIDER`.
 *
 * Depois da M02 existe **um** provider. A função continua existindo, e continua fail-closed,
 * porque a variável ainda pode chegar preenchida de um ambiente provisionado antes da erradicação
 * — e cair em silêncio num valor que não existe mais seria pior do que reclamar.
 *
 * `supabase` ganha mensagem PRÓPRIA: quem apontar para lá está com configuração antiga e merece
 * saber disso, em vez de ler "valor inválido" e procurar erro de digitação.
 */
export function resolveProvider(raw: string | undefined | null): AuthProviderName {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "" || value === "keycloak") return "keycloak";
  if (value === "supabase") {
    throw new Error(
      "VITE_AUTH_PROVIDER=supabase não existe mais: o Supabase Auth foi erradicado na M02. " +
        'Use "keycloak", ou deixe a variável vazia.',
    );
  }
  throw new Error(`VITE_AUTH_PROVIDER inválido: "${raw}". Use "keycloak" (default).`);
}
