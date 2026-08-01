/**
 * Adapter da linha do tempo — o que ele aceita, o que recusa e o que NÃO inventa.
 */

import { describe, expect, it } from 'vitest';

import { adaptTimeline, TimelineInvalida } from '../../features/canonical-analysis/timeline/adapter';
import { TIMELINE_EVENT_SCHEMA } from '../../features/canonical-analysis/timeline/timelineSchema';

const ANALISE = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

function evento(
  tipo: string,
  sequence: number,
  occurredAt: string,
  data: Record<string, unknown> = {},
) {
  return {
    event_id: `evt-${sequence}`,
    event_type: tipo,
    event_schema_version: TIMELINE_EVENT_SCHEMA,
    analysis_id: ANALISE,
    workspace_id: 'ws-alpha',
    sequence,
    occurred_at: occurredAt,
    data,
  };
}

const JORNADA = {
  analysis_id: ANALISE,
  events: [
    evento('analysis.queued', 1, '2026-08-01T12:00:00Z'),
    evento('analysis.started', 2, '2026-08-01T12:00:10Z'),
    evento('analysis.recovering', 3, '2026-08-01T12:00:40Z', { reason: 'interrupted' }),
    evento('analysis.started', 4, '2026-08-01T12:01:00Z'),
    evento('analysis.completed', 5, '2026-08-01T12:02:00Z', { result_available: true }),
    evento('result.available', 6, '2026-08-01T12:02:00Z'),
  ],
};

describe('linha do tempo pública', () => {
  it('preserva a ordem que o backend mandou', () => {
    const view = adaptTimeline(JORNADA);
    expect(view.itens.map((i) => i.eventType)).toEqual([
      'analysis.queued',
      'analysis.started',
      'analysis.recovering',
      'analysis.started',
      'analysis.completed',
      'result.available',
    ]);
  });

  it('traduz cada evento para o estado público que a API já expõe', () => {
    const view = adaptTimeline(JORNADA);
    expect(view.itens.map((i) => i.publicState)).toEqual([
      'queued',
      'running',
      'recovering',
      'running',
      'completed',
      'completed',
    ]);
  });

  it('mede o intervalo entre eventos a partir dos carimbos, sem inventar nada', () => {
    const view = adaptTimeline(JORNADA);
    expect(view.itens[0].segundosDesdeAnterior).toBeNull();
    expect(view.itens[1].segundosDesdeAnterior).toBe(10);
    expect(view.itens[2].segundosDesdeAnterior).toBe(30);
    expect(view.duracaoTotalSegundos).toBe(120);
  });

  it('o primeiro item tem null, não zero', () => {
    // Zero seria uma AFIRMAÇÃO ("aconteceu no mesmo instante que o anterior"), e não
    // existe anterior. `null` é a ausência honesta.
    const view = adaptTimeline(JORNADA);
    expect(view.itens[0].segundosDesdeAnterior).not.toBe(0);
  });

  it('a análise que foi, voltou e foi de novo aparece INTEIRA', () => {
    // É o caso em que remontar a história a partir do estado atual mentiria: hoje ela
    // está `completed`, e uma reconstrução mostraria uma linha reta.
    const view = adaptTimeline(JORNADA);
    expect(view.itens.filter((i) => i.eventType === 'analysis.started')).toHaveLength(2);
    expect(view.itens.find((i) => i.eventType === 'analysis.recovering')?.detalhe).toBe(
      'interrupted',
    );
  });

  it('transporta o motivo do payload, não o infere', () => {
    const view = adaptTimeline({
      analysis_id: ANALISE,
      events: [evento('analysis.failed', 1, '2026-08-01T12:00:00Z', { failure_stage: 'input' })],
    });
    expect(view.itens[0].detalhe).toBe('input');
  });

  it('duração total é null com menos de dois eventos', () => {
    const view = adaptTimeline({
      analysis_id: ANALISE,
      events: [evento('analysis.queued', 1, '2026-08-01T12:00:00Z')],
    });
    expect(view.duracaoTotalSegundos).toBeNull();
  });

  it('lista vazia é uma linha do tempo válida e vazia — não erro', () => {
    const view = adaptTimeline({ analysis_id: ANALISE, events: [] });
    expect(view.itens).toEqual([]);
    expect(view.duracaoTotalSegundos).toBeNull();
  });

  // ── recusas ──────────────────────────────────────────────────────────────

  it('recusa versão de schema desconhecida', () => {
    const ruim = { ...JORNADA, events: [{ ...JORNADA.events[0], event_schema_version: 'v9' }] };
    expect(() => adaptTimeline(ruim)).toThrow(TimelineInvalida);
  });

  it('recusa tipo de evento desconhecido', () => {
    const ruim = { ...JORNADA, events: [{ ...JORNADA.events[0], event_type: 'analysis.teleported' }] };
    expect(() => adaptTimeline(ruim)).toThrow(/desconhecido/);
  });

  it('recusa campo interno no envelope', () => {
    const ruim = { ...JORNADA, events: [{ ...JORNADA.events[0], job_id: 'j-1' }] };
    expect(() => adaptTimeline(ruim)).toThrow(/campo interno/);
  });

  it('recusa campo interno dentro de data', () => {
    const ruim = {
      ...JORNADA,
      events: [{ ...JORNADA.events[0], data: { worker_id: 'w-1' } }],
    };
    expect(() => adaptTimeline(ruim)).toThrow(/campo interno em data/);
  });

  it('recusa occurred_at inválido', () => {
    const ruim = { ...JORNADA, events: [{ ...JORNADA.events[0], occurred_at: 'ontem' }] };
    expect(() => adaptTimeline(ruim)).toThrow(/occurred_at/);
  });

  it('recusa sequence zero', () => {
    const ruim = { ...JORNADA, events: [{ ...JORNADA.events[0], sequence: 0 }] };
    expect(() => adaptTimeline(ruim)).toThrow(/sequence/);
  });

  it('recusa corpo sem analysis_id', () => {
    expect(() => adaptTimeline({ events: [] })).toThrow(/analysis_id/);
  });

  // ── o que a linha do tempo NÃO tem ───────────────────────────────────────

  it('nenhum item carrega percentual', () => {
    // Não existe fonte confiável para "37%". Um teste que procura a palavra é o que
    // impede alguém de adicionar um campo `progress` "só para a barra ficar bonita".
    const view = adaptTimeline(JORNADA);
    const serializado = JSON.stringify(view);
    expect(serializado).not.toMatch(/percent|progress|"pct"/i);
  });

  it('nenhum item carrega estágio interno', () => {
    const serializado = JSON.stringify(adaptTimeline(JORNADA)).toLowerCase();
    for (const proibido of ['worker', 'engine', 'lease', 'heartbeat', 'attempt']) {
      expect(serializado).not.toContain(proibido);
    }
  });
});
