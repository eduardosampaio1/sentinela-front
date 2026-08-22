// Fixtures derivadas do contrato `public-v1` (Onda 6 E1). SÓ conceitos públicos — nenhum campo
// interno (job/worker/engine/lease/attempt/execution_profile/presigned/upload_id/object key).

import type {
  AnalysisHandle,
  AnalysisListPage,
  AnalysisResultView,
  AnalysisStatus,
  AnalysisStatusView,
  Problem,
  ProblemCode,
} from "@/lib/v1";
import { PROBLEM_CATALOG } from "@/lib/v1";

export const HANDLE: AnalysisHandle = { analysis_id: "an-abc", status: "preparing" };

/** Um status view por estado público (os 7). */
export function statusView(status: AnalysisStatus, over: Partial<AnalysisStatusView> = {}): AnalysisStatusView {
  return {
    analysis_id: "an-abc",
    status,
    record_count: status === "preparing" || status === "receiving" ? null : 1240,
    result_available: status === "completed",
    retry_allowed: status === "failed" || status === "recovering",
    created_at: "2026-07-31T10:00:00Z",
    updated_at: "2026-07-31T10:01:00Z",
    // BD02: estas amostras são análises SEM Instance, e agora dizem isso em voz alta. `null` e
    // chave AUSENTE são estados diferentes — o contrato só aceita o primeiro, e omitir aqui
    // faria a fixture treinar o Front a ler um payload que o backend não emite.
    // Quem quiser uma amostra associada passa `instance_id` em `over`.
    instance_id: null,
    ...over,
  };
}

export const STATUS_VIEWS: Record<AnalysisStatus, AnalysisStatusView> = {
  preparing: statusView("preparing"),
  receiving: statusView("receiving"),
  queued: statusView("queued"),
  running: statusView("running"),
  recovering: statusView("recovering"),
  // Entrou com o estado novo. O `Record<AnalysisStatus, ...>` é EXAUSTIVO de propósito:
  // é ele que obriga a fixture a acompanhar a união, e foi ele que cobrou esta linha.
  needs_mapping: statusView("needs_mapping"),
  // Mesma cobrança, mesmo motivo: o estado em que a análise está pronta e falta submeter.
  ready_to_submit: statusView("ready_to_submit"),
  completed: statusView("completed"),
  failed: statusView("failed"),
};

/** Envelope do contrato público. O DOCUMENTO dentro dele é deliberadamente mínimo aqui: esta
 *  fixture serve aos testes do CLIENTE (transporte, cabeçalhos, erros), que não abrem o
 *  documento. Quem exercita o conteúdo canônico usa `fixtures/canonical-result/massas.ts`,
 *  cujos documentos são a saída real do backend. */
export const RESULT_VIEW: AnalysisResultView = {
  analysis_id: "an-abc",
  result_schema_version: "analysis-result-v1",
  indicator_registry_version: "indicator-registry-1.0",
  result: { summary: { records: 1240 } },
};

export const LIST_PAGE_1: AnalysisListPage = {
  items: [
    { analysis_id: "an-abc", status: "completed", record_count: 1240, result_available: true, created_at: "2026-07-31T10:00:00Z", instance_id: null },
    { analysis_id: "an-def", status: "running", record_count: 300, result_available: false, created_at: "2026-07-31T09:00:00Z", instance_id: null },
  ],
  next_cursor: "cursor-2",
};

export const LIST_PAGE_2: AnalysisListPage = {
  items: [
    { analysis_id: "an-ghi", status: "failed", record_count: 50, result_available: false, created_at: "2026-07-31T08:00:00Z", instance_id: null },
  ],
  next_cursor: null,
};

/** Um envelope problem+json canônico por categoria (as 9). */
export function problem(code: ProblemCode, over: Partial<Problem> = {}): Problem {
  const cat = PROBLEM_CATALOG[code];
  return {
    type: `urn:sentinela:error:${code}`,
    title: cat.title,
    status: cat.status,
    code,
    detail: code,
    instance: "corr-fixture",
    retryable: cat.retryable,
    ...over,
  };
}
