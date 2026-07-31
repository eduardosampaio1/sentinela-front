// Superfície PÚBLICA da fronteira canônica `/v1` (Onda 6 E1).
// A jornada canônica do frontend importa SÓ daqui — nunca de `lib/api`/`lib/supabase` legados.

export * from "./contract/public-v1.types";
export {
  PROBLEM_CATALOG,
  PROBLEM_CODES,
  PROBLEM_MEDIA_TYPE,
  ProblemError,
  isProblem,
  normalizeProblem,
} from "./problem";
export { problemToExperience } from "./problemMessages";
export type { ProblemAction, ProblemExperience } from "./problemMessages";
export { createV1Client } from "./client";
export type { RequestOptions, V1Client, V1ClientConfig } from "./client";
export { CanonicalQueryProvider } from "./CanonicalQueryProvider";
export type { CanonicalQueryProviderProps } from "./CanonicalQueryProvider";
export { getV1Client, resolveGatewayBaseUrl } from "./defaultClient";
export { workspaceKeys } from "./queryKeys";
export {
  clearCanonicalCache,
  createCanonicalQueryClient,
  onWorkspaceSwitch,
} from "./queryClient";
export type { QueryClientOptions } from "./queryClient";
export { redactForLog, redactHeader } from "./redact";
