/**
 * Adapter da linha do tempo — valida, ordena e formata. Não decide nada.
 *
 * O backend já mandou a ordem certa (por `sequence`). Reordenar aqui seria assumir que
 * ele erra, e quando o cliente e o servidor discordam sobre a ordem dos fatos, quem
 * ganha tem de ser um só. O que este adapter faz é **conferir** e recusar alto.
 */

import {
  CAMPOS_INTERNOS_PROIBIDOS,
  TIMELINE_EVENT_SCHEMA,
  TIMELINE_EVENT_TYPES,
  type TimelineEvent,
  type TimelineEventType,
} from './timelineSchema';

export class TimelineInvalida extends Error {}

/** Estado público que cada evento representa. Espelha o contrato do backend. */
const ESTADO_POR_EVENTO: Record<TimelineEventType, string> = {
  'analysis.created': 'preparing',
  'analysis.data_received': 'preparing',
  'analysis.queued': 'queued',
  'analysis.started': 'running',
  'analysis.recovering': 'recovering',
  'analysis.completed': 'completed',
  'analysis.failed': 'failed',
  'result.available': 'completed',
};

export interface TimelineItemView {
  eventId: string;
  eventType: TimelineEventType;
  publicState: string;
  occurredAt: Date;
  sequence: number;
  /**
   * Segundos desde o evento ANTERIOR. `null` no primeiro — e `null` é diferente de
   * zero: zero significaria "aconteceu no mesmo instante", que é uma afirmação.
   */
  segundosDesdeAnterior: number | null;
  /** Motivo/categoria, quando o evento carrega um. Vem do payload, não é inferido. */
  detalhe: string | null;
}

export interface TimelineView {
  analysisId: string;
  itens: TimelineItemView[];
  /** Duração total observada, em segundos. `null` com menos de dois eventos. */
  duracaoTotalSegundos: number | null;
}

function conferirSemCampoInterno(evento: Record<string, unknown>): void {
  for (const proibido of CAMPOS_INTERNOS_PROIBIDOS) {
    if (proibido in evento) {
      throw new TimelineInvalida(
        `campo interno na linha do tempo: ${proibido}. O backend regrediu — exibir ` +
          `dado interno é tão ruim quanto entregá-lo por webhook.`,
      );
    }
  }
  const dados = evento.data;
  if (dados && typeof dados === 'object') {
    for (const proibido of CAMPOS_INTERNOS_PROIBIDOS) {
      if (proibido in (dados as Record<string, unknown>)) {
        throw new TimelineInvalida(`campo interno em data: ${proibido}`);
      }
    }
  }
}

/**
 * De qual tipo cada campo de detalhe é público, segundo o contrato.
 *
 * A versão anterior lia `reason` e depois `failure_stage` de QUALQUER evento conhecido.
 * O contrato declara `reason` só para `analysis.recovering` e `failure_stage` só para
 * `analysis.failed` — então, se o backend regredisse e mandasse
 * `{event_type: "analysis.completed", data: {reason: "..."}}`, a tela renderizaria um
 * campo que aquele tipo não tem.
 *
 * Isso importa mais aqui do que pareceria: o adapter já recusa campo INTERNO, mas
 * `reason` não é interno — é público no tipo errado. A defesa contra vazamento não
 * pegaria, e o cliente veria um texto explicativo pendurado num evento de sucesso.
 */
const CAMPO_DE_DETALHE: Readonly<Record<string, 'reason' | 'failure_stage'>> = {
  'analysis.recovering': 'reason',
  'analysis.failed': 'failure_stage',
};

function detalheDe(evento: TimelineEvent): string | null {
  const campo = CAMPO_DE_DETALHE[evento.event_type];
  if (!campo) return null;
  const valor = evento.data?.[campo];
  return typeof valor === 'string' ? valor : null;
}

export function adaptTimeline(bruto: unknown): TimelineView {
  if (!bruto || typeof bruto !== 'object') {
    throw new TimelineInvalida('resposta vazia ou não-objeto');
  }
  const corpo = bruto as { analysis_id?: unknown; events?: unknown };
  if (typeof corpo.analysis_id !== 'string' || !corpo.analysis_id) {
    throw new TimelineInvalida('analysis_id ausente');
  }
  if (!Array.isArray(corpo.events)) {
    throw new TimelineInvalida('events ausente ou não é lista');
  }

  const itens: TimelineItemView[] = [];
  let anterior: Date | null = null;

  for (const cru of corpo.events) {
    if (!cru || typeof cru !== 'object') {
      throw new TimelineInvalida('evento não-objeto na lista');
    }
    const evento = cru as Record<string, unknown>;
    conferirSemCampoInterno(evento);

    if (evento.event_schema_version !== TIMELINE_EVENT_SCHEMA) {
      // Fail-closed, igual ao Dispatcher: renderizar um schema que não conhecemos é
      // como um campo novo vira rótulo errado na tela do cliente.
      throw new TimelineInvalida(
        `versão de schema desconhecida: ${String(evento.event_schema_version)}`,
      );
    }
    const tipo = evento.event_type as TimelineEventType;
    if (!TIMELINE_EVENT_TYPES.includes(tipo)) {
      throw new TimelineInvalida(`tipo de evento desconhecido: ${String(tipo)}`);
    }
    const quando = new Date(String(evento.occurred_at));
    if (Number.isNaN(quando.getTime())) {
      throw new TimelineInvalida(`occurred_at inválido em ${tipo}`);
    }
    const sequencia = Number(evento.sequence);
    if (!Number.isInteger(sequencia) || sequencia < 1) {
      throw new TimelineInvalida(`sequence inválida em ${tipo}`);
    }

    itens.push({
      eventId: String(evento.event_id),
      eventType: tipo,
      publicState: ESTADO_POR_EVENTO[tipo],
      occurredAt: quando,
      sequence: sequencia,
      segundosDesdeAnterior:
        anterior === null ? null : (quando.getTime() - anterior.getTime()) / 1000,
      detalhe: detalheDe(evento as unknown as TimelineEvent),
    });
    anterior = quando;
  }

  const total =
    itens.length >= 2
      ? (itens[itens.length - 1].occurredAt.getTime() - itens[0].occurredAt.getTime()) / 1000
      : null;

  return { analysisId: corpo.analysis_id, itens, duracaoTotalSegundos: total };
}
