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
    ...over,
  };
}

export const STATUS_VIEWS: Record<AnalysisStatus, AnalysisStatusView> = {
  preparing: statusView("preparing"),
  receiving: statusView("receiving"),
  queued: statusView("queued"),
  running: statusView("running"),
  recovering: statusView("recovering"),
  completed: statusView("completed"),
  failed: statusView("failed"),
};

export const RESULT_VIEW: AnalysisResultView = {
  analysis_id: "an-abc",
  result_schema_version: "analysis-result-v1",
  result: { summary: { records: 1240 } },
};

export const LIST_PAGE_1: AnalysisListPage = {
  items: [
    { analysis_id: "an-abc", status: "completed", record_count: 1240, result_available: true, created_at: "2026-07-31T10:00:00Z" },
    { analysis_id: "an-def", status: "running", record_count: 300, result_available: false, created_at: "2026-07-31T09:00:00Z" },
  ],
  next_cursor: "cursor-2",
};

export const LIST_PAGE_2: AnalysisListPage = {
  items: [
    { analysis_id: "an-ghi", status: "failed", record_count: 50, result_available: false, created_at: "2026-07-31T08:00:00Z" },
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
