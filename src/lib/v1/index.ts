// Superfície PÚBLICA da fronteira canônica `/v1` (Onda 6 E1).
// A jornada canônica do frontend importa SÓ daqui — nunca de `lib/api`/`lib/supabase` legados.

export * from "./contract/public-v1.types";
export {
  PROBLEM_CATALOG,
  PROBLEM_CODES,
  PROBLEM_MEDIA_TYPE,
  ProblemError,
  TransportError,
  isProblem,
  normalizeProblem,
} from "./problem";
export { problemToExperience } from "./problemMessages";
export type { ProblemAction, ProblemExperience } from "./problemMessages";
export { createV1Client } from "./client";
export type { RequestOptions, V1Client, V1ClientConfig } from "./client";
export { CanonicalQueryProvider } from "./CanonicalQueryProvider";
export type { CanonicalQueryProviderProps } from "./CanonicalQueryProvider";
// `defaultClient` (getV1Client/resolveGatewayBaseUrl) NÃO é re-exportado aqui de PROPÓSITO:
// ele importa o seam de auth (`@/lib/auth`), que constrói o cliente Supabase legado no import
// (efeito colateral + env guard). Re-exportá-lo faria QUALQUER `import from "@/lib/v1"` — mesmo
// só p/ `problem`/`queryKeys` — carregar auth/Supabase (ruim p/ keycloak/testes isolados). Quem
// precisa do singleton fiado importa direto de "@/lib/v1/defaultClient". (Codex E1 R1, achado 2.)
export { accountKeys, workspaceKeys } from "./queryKeys";
export {
  clearCanonicalCache,
  createCanonicalQueryClient,
  onWorkspaceSwitch,
} from "./queryClient";
export type { QueryClientOptions } from "./queryClient";
export { redactForLog, redactHeader } from "./redact";
