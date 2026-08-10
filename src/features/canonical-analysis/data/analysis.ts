// Hooks de dados da jornada canônica (Onda 6 E2/E3). Consomem SÓ `@/lib/v1` — nada de legado.
// Sem cálculo analítico, sem estado interno, sem progresso inventado: só as operações públicas.

import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import {
  workspaceKeys,
  type AnalysisHandle,
  type AnalysisExportDownloadView,
  type AnalysisProgressView,
  type AnalysisResultView,
  type AnalysisStatus,
  type AnalysisStatusView,
  type AnalysisTimelineView,
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
    case "needs_mapping":
      // NÃO é terminal, mas também não muda sozinho: depende de uma pessoa confirmar como os
      // campos devem ser interpretados. Continuar consultando seria bater no backend para
      // sempre por uma resposta que não muda — e, pior, contar ao usuário (pelo indicador de
      // atividade) que algo está em curso. A tela é revalidada pela AÇÃO, não pelo relógio.
      return false;
    default:
      return POLL_MODERADO;
  }
}

/** Polling considerando o resultado (E6 item 23): concluída SEM resultado disponível ainda NÃO é
 *  terminal — segue checando (moderado) até `result_available` virar true. */
export function proximoPolling(
  status: AnalysisStatus | undefined,
  resultAvailable?: boolean,
): number | false {
  if (status === "completed" && resultAvailable === false) return POLL_MODERADO;
  return intervaloDePolling(status);
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

// ── retry público (POST /{id}/retry). Mesma análise; nunca prepare/data. Idempotency-Key da intenção. ──
export function useRetryAnalysis(): UseMutationResult<
  AnalysisHandle,
  unknown,
  { analysisId: string; scope: CanonicalScope; idempotencyKey?: string }
> {
  const client = useV1Client();
  return useMutation({
    retry: false,
    mutationFn: ({ analysisId, scope, idempotencyKey }) =>
      client.retry(analysisId, scope, idempotencyKey ? { idempotencyKey } : undefined),
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
    refetchInterval: (query) => proximoPolling(query.state.data?.status, query.state.data?.result_available),
    // não consulta em background (aba invisível) — pausa por padrão do React Query
    refetchIntervalInBackground: false,
  });
}

/**
 * Progresso por EIXO (`GET /{id}/progress`) — M20.
 *
 * Devolve os eixos como chegam. Nenhuma agregação: um percentual único inventaria uma média entre
 * eixos que medem coisas incomparáveis, e a pessoa leria como medida o que seria opinião do front.
 * O plano põe isso fora de escopo, e a Constituição já dizia que eixo nunca vira barra única.
 */
export function useAnalysisProgress(
  scope: CanonicalScope | null,
  analysisId: string | null,
  habilitado = true,
): UseQueryResult<AnalysisProgressView> {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && analysisId ? workspaceKeys.progress(scope.workspaceId, analysisId) : IDLE_KEY,
    enabled: Boolean(scope && analysisId) && habilitado,
    queryFn: ({ signal }) =>
      client.getProgress(analysisId as string, scope as CanonicalScope, { signal }),
  });
}

/**
 * Linha do tempo (`GET /{id}/timeline`) — M23.
 *
 * Devolve os eventos **como chegam**. Nada de ordenar, agrupar, deduplicar, preencher lacuna ou
 * derivar evento do estado atual: a linha do tempo é LIDA dos eventos duráveis, e remontá-la
 * produziria uma história plausível em vez da que aconteceu — as duas divergem justamente no
 * caso interessante, a análise que foi e voltou.
 *
 * **Sem percentual**, aqui e em qualquer lugar: não existe fonte confiável para "37%".
 *
 * `useQuery`, e desta vez está certo: o que se guarda são eventos duráveis, não a credencial
 * curta da M22.
 */
export function useAnalysisTimeline(
  scope: CanonicalScope | null,
  analysisId: string | null,
  habilitado = true,
): UseQueryResult<AnalysisTimelineView> {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && analysisId ? workspaceKeys.timeline(scope.workspaceId, analysisId) : IDLE_KEY,
    enabled: Boolean(scope && analysisId) && habilitado,
    queryFn: ({ signal }) => client.getTimeline(analysisId as string, scope as CanonicalScope, { signal }),
  });
}

/**
 * Capability de download do export (`GET /{id}/analytics/export/download`) — M22.
 *
 * **Mutation, e não query — de propósito.** A resposta carrega uma URL assinada com TTL de 5
 * minutos. Uma `useQuery` a guardaria em cache e a revalidaria por conta própria; o usuário
 * clicaria num link já expirado e leria isso como defeito do Sentinela. Aqui a chamada acontece
 * quando alguém pede: uma por intenção, nada em cache, nada em background.
 *
 * **Quem autoriza oferecer o download é o eixo `export` de `useAnalysisProgress`**, não este
 * hook. Product Freeze D16: com `export = ready`, download; nos demais estados a tela representa
 * o estado vindo de `/progress`. Chamar para descobrir o estado usaria a resposta de erro como
 * oráculo — e o produtor colapsa quatro causas no mesmo `forbidden_or_not_found` justamente para
 * fechar esse oráculo.
 *
 * Não gera export, não monta pacote, não escreve arquivo: a exportação é UMA só, e é o artefato
 * do backend.
 */
export function useExportDownload(): UseMutationResult<
  AnalysisExportDownloadView,
  unknown,
  { analysisId: string; scope: CanonicalScope; signal?: AbortSignal }
> {
  const client = useV1Client();
  return useMutation({
    mutationFn: ({ analysisId, scope, signal }) =>
      client.getExportDownload(analysisId, scope, { signal }),
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
