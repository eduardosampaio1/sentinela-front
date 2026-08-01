/**
 * Linha do tempo pública — leitura dos eventos duráveis.
 *
 * Três coisas que este módulo NÃO faz, e cada uma é uma decisão registrada:
 *
 * 1. **não calcula percentual.** Não existe fonte confiável para "37%", e um número
 *    inventado é a forma mais rápida de o usuário perder a confiança no resto da tela;
 * 2. **não remonta a história a partir do estado atual.** Ele lê os eventos que foram
 *    gravados na transação autoritativa. Remontar produziria uma história plausível em
 *    vez da que aconteceu — e as duas divergem exatamente no caso interessante: a
 *    análise que foi, voltou e foi de novo;
 * 3. **não conhece estágio interno.** Worker, Engine, lease, heartbeat e fila não
 *    existem neste vocabulário.
 *
 * Só declarações de tipo e leitura. Nada aqui decide.
 */

/** Versão do contrato de eventos que este frontend sabe ler. */
export const TIMELINE_EVENT_SCHEMA = 'public-events-v1';

/** O vocabulário PÚBLICO, na ordem em que a jornada acontece. */
export const TIMELINE_EVENT_TYPES = [
  'analysis.created',
  'analysis.data_received',
  'analysis.queued',
  'analysis.started',
  'analysis.recovering',
  'analysis.completed',
  'analysis.failed',
  'result.available',
] as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

/** Envelope público — os oito campos, e só eles. */
export interface TimelineEvent {
  event_id: string;
  event_type: TimelineEventType;
  event_schema_version: string;
  analysis_id: string;
  workspace_id: string;
  sequence: number;
  occurred_at: string;
  data: Record<string, unknown>;
}

export interface TimelineResponse {
  analysis_id: string;
  events: TimelineEvent[];
}

/**
 * Campos que NUNCA podem chegar aqui. Se um deles aparecer, o backend regrediu — e o
 * frontend recusa em vez de renderizar. É a mesma postura fail-closed do Dispatcher:
 * exibir dado interno é tão ruim quanto entregá-lo por webhook.
 */
export const CAMPOS_INTERNOS_PROIBIDOS = [
  'job_id',
  'attempt_id',
  'assignment_id',
  'worker_id',
  'engine_id',
  'lease_expires_at',
  'correlation_id',
  'claimed_by',
  'claim_token',
  'dispatched_at',
] as const;
