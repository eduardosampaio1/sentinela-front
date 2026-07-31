// Fundação do TanStack Query para a jornada canônica (Onda 6 E1).
//
// Só a FUNDAÇÃO: factory do QueryClient, política de retry alinhada ao problem+json, limpeza na
// troca de workspace e tratamento de sessão expirada. NÃO migra telas — nenhuma jornada usa isto
// ainda; o provider é fornecido pronto para as etapas E2+.

import { QueryCache, QueryClient } from "@tanstack/react-query";
import { ProblemError } from "./problem";
import { workspaceKeys } from "./queryKeys";

const MAX_RETRIES_TRANSITORIO = 2;

/** Retry só de erro TRANSITÓRIO (problem retryable: capacity_wait/temporarily_unavailable), com
 *  teto. Erro público não-retryable (401/404/409/422) NUNCA é retentado. Erro desconhecido: 1×. */
function deveRetentar(failureCount: number, error: unknown): boolean {
  if (error instanceof ProblemError) {
    return error.problem.retryable && failureCount < MAX_RETRIES_TRANSITORIO;
  }
  return failureCount < 1;
}

function atrasoRetry(tentativa: number): number {
  return Math.min(1000 * 2 ** tentativa, 8000);
}

export interface QueryClientOptions {
  /** Chamado quando qualquer query falha com `authentication_required` — a app decide (signOut). */
  onAuthRequired?: () => void;
}

export function createCanonicalQueryClient(options: QueryClientOptions = {}): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof ProblemError && error.problem.code === "authentication_required") {
          options.onAuthRequired?.();
        }
      },
    }),
    defaultOptions: {
      queries: {
        retry: deveRetentar,
        retryDelay: atrasoRetry,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

/**
 * Troca de workspace: cancela requests do workspace ANTERIOR e remove o cache dele, para que uma
 * resposta tardia não contamine o novo contexto. Como toda chave começa por
 * ["workspace", id, …], isolar/cancelar por prefixo é exato.
 */
export async function onWorkspaceSwitch(
  queryClient: QueryClient,
  previousWorkspaceId: string | null | undefined,
): Promise<void> {
  if (!previousWorkspaceId) return;
  const prefixo = { queryKey: workspaceKeys.root(previousWorkspaceId) };
  await queryClient.cancelQueries(prefixo);
  queryClient.removeQueries(prefixo);
}

/** Logout: descarta TODO o estado de servidor canônico em memória. */
export function clearCanonicalCache(queryClient: QueryClient): void {
  queryClient.cancelQueries();
  queryClient.clear();
}
