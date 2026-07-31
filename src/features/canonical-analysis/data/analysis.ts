// Hooks de dados da jornada canônica (Onda 6 E2/E3). Consomem SÓ `@/lib/v1` — nada de legado.
// Sem cálculo analítico, sem estado interno, sem progresso inventado: só as operações públicas.

import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import {
  workspaceKeys,
  type AnalysisHandle,
  type AnalysisResultView,
  type AnalysisStatus,
  type AnalysisStatusView,
  type CanonicalScope,
} from "@/lib/v1";
import { useV1Client } from "./client";

// ── Polling por estado (E3, item 13). Encerra em terminal; ativo em fila/execução/recuperação. ──
const POLL_ATIVO = 2500;
const POLL_MODERADO = 4000;

export function intervaloDePolling(status: AnalysisStatus | undefined): number | false {
  switch (status) {
    case "queued":
    case "running":
    case "recovering":
      return POLL_ATIVO;
    case "preparing":
    case "receiving":
      return POLL_MODERADO;
    case "completed":
    case "failed":
      return false; // terminal: para de consultar
    default:
      return POLL_MODERADO;
  }
}

// ── prepare (POST /v1/analyses). Idempotency-Key vem da INTENÇÃO (chamador). ──
export function useCreateAnalysis(): UseMutationResult<
  AnalysisHandle,
  unknown,
  { scope: CanonicalScope; idempotencyKey: string }
> {
  const client = useV1Client();
  return useMutation({
    mutationFn: ({ scope, idempotencyKey }) => client.prepare(scope, { idempotencyKey }),
  });
}

// ── upload (POST /{id}/data). File/Blob DIRETO; SEM retry automático (efeitos parciais/ARGOS-062-R). ──
export function useUploadData(): UseMutationResult<
  AnalysisStatusView,
  unknown,
  { analysisId: string; scope: CanonicalScope; body: BodyInit; signal?: AbortSignal }
> {
  const client = useV1Client();
  return useMutation({
    retry: false,
    mutationFn: ({ analysisId, scope, body, signal }) =>
      client.uploadData(analysisId, scope, body, { signal }),
  });
}

// ── submit (POST /{id}/submit). Reusa analysis_id; NÃO reproduz o dataset. ──
export function useSubmitAnalysis(): UseMutationResult<
  AnalysisHandle,
  unknown,
  { analysisId: string; scope: CanonicalScope; idempotencyKey?: string }
> {
  const client = useV1Client();
  return useMutation({
    retry: false,
    mutationFn: ({ analysisId, scope, idempotencyKey }) =>
      client.submit(analysisId, scope, idempotencyKey ? { idempotencyKey } : undefined),
  });
}

// ── retry público (POST /{id}/retry). Mesma análise; nunca prepare/data. ──
export function useRetryAnalysis(): UseMutationResult<
  AnalysisHandle,
  unknown,
  { analysisId: string; scope: CanonicalScope }
> {
  const client = useV1Client();
  return useMutation({
    retry: false,
    mutationFn: ({ analysisId, scope }) => client.retry(analysisId, scope),
  });
}

// ── status (GET /{id}). Identidade = analysis_id; retomável por deep link. Polling por estado. ──
const IDLE_KEY = ["canonical-analysis", "idle"] as const;

export function useAnalysisStatus(
  scope: CanonicalScope | null,
  analysisId: string | null,
): UseQueryResult<AnalysisStatusView> {
  const client = useV1Client();
  const habilitado = Boolean(scope && analysisId);
  return useQuery({
    queryKey: scope && analysisId ? workspaceKeys.status(scope.workspaceId, analysisId) : IDLE_KEY,
    enabled: habilitado,
    queryFn: ({ signal }) => client.getStatus(analysisId as string, scope as CanonicalScope, { signal }),
    refetchInterval: (query) => intervaloDePolling(query.state.data?.status),
    // não consulta em background (aba invisível) — pausa por padrão do React Query
    refetchIntervalInBackground: false,
  });
}

// ── resultado (GET /{id}/result). E3: NÃO renderiza; só o mínimo p/ habilitar ação futura. ──
export function useAnalysisResult(
  scope: CanonicalScope | null,
  analysisId: string | null,
  habilitado: boolean,
): UseQueryResult<AnalysisResultView> {
  const client = useV1Client();
  return useQuery({
    queryKey: scope && analysisId ? workspaceKeys.result(scope.workspaceId, analysisId) : IDLE_KEY,
    enabled: Boolean(scope && analysisId) && habilitado,
    queryFn: ({ signal }) => client.getResult(analysisId as string, scope as CanonicalScope, { signal }),
  });
}
