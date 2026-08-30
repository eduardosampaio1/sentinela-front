// Hook de LISTAGEM da jornada canônica (Onda 6 E4). Consome SÓ `@/lib/v1` — nada de legado.
// Cursor OPACO: o frontend nunca decodifica/deriva offset; só repassa o `next_cursor` recebido.
// Query key SEMPRE workspace-scoped (isola cache por construção na troca de workspace).

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  workspaceKeys,
  type AnalysisListPage,
  type CanonicalScope,
  type DeleteAnalysisView,
} from "@/lib/v1";
import { useV1Client } from "./client";

const IDLE_KEY = ["canonical-analysis", "idle"] as const;

/** Página de análises do workspace, ancorada num cursor opaco (ou 1ª página quando ausente). */
export function useAnalysesList(
  scope: CanonicalScope | null,
  cursor?: string | null,
  /** BD02 — filtra pela Instance NO SERVIDOR. Recortar aqui quebraria o cursor e a contagem. */
  instanceId?: string,
): UseQueryResult<AnalysisListPage> {
  const client = useV1Client();
  return useQuery({
    queryKey: scope ? workspaceKeys.list(scope.workspaceId, { cursor: cursor ?? null, instanceId }) : IDLE_KEY,
    enabled: Boolean(scope),
    queryFn: ({ signal }) =>
      client.list(
        { workspaceId: (scope as CanonicalScope).workspaceId, cursor: cursor ?? undefined, instanceId },
        { signal },
      ),
  });
}

/** Exclusão canônica restrita a Analysis terminal falhada; nunca faz hide otimista local. */
export function useDeleteFailedAnalysis(): UseMutationResult<
  DeleteAnalysisView,
  unknown,
  { analysisId: string; scope: CanonicalScope }
> {
  const client = useV1Client();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: ({ analysisId, scope }) => client.deleteFailedAnalysis(analysisId, scope),
    onSuccess: async (_result, { scope }) => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.analyses(scope.workspaceId) });
    },
  });
}
