// Matriz de APRESENTAÇÃO dos erros públicos (Onda 6 E6). PURA. Decide a UI SÓ pelo código público
// (ou ausência = falha de rede) — NUNCA por `title`/`detail`/texto do backend. Congela: mensagem
// (i18n por código), ação sugerida, se limpa sessão, e se uma LEITURA pode re-tentar (mutation
// nunca re-tenta automaticamente). `tone: "wait"` = espera neutra (capacity/not_ready/…), jamais erro.

import type { ProblemCode } from "@/lib/v1";

export type ProblemUiAction = "retry" | "new_analysis" | "sign_in" | "back" | "wait" | "none";

export interface ProblemUi {
  /** Código público (ou `network` para falha sem envelope). */
  code: ProblemCode | "network";
  /** Chave i18n canonicalAnalysis.problem.<code> — nunca detail cru. */
  messageKey: string;
  action: ProblemUiAction;
  /** authentication_required → limpar cache canônico + ir p/ sessão expirada. */
  clearSession: boolean;
  /** GET/leitura pode re-tentar (limitado); mutations nunca re-tentam automaticamente. */
  readRetryable: boolean;
  /** "wait" = apresentação neutra de espera (não é falha); "error" = falha. */
  tone: "wait" | "error";
}

const MSG = (code: string) => `canonicalAnalysis.problem.${code}`;

const TABELA: Record<ProblemCode, Omit<ProblemUi, "code" | "messageKey">> = {
  authentication_required: { action: "sign_in", clearSession: true, readRetryable: false, tone: "error" },
  forbidden_or_not_found: { action: "back", clearSession: false, readRetryable: false, tone: "error" },
  invalid_input: { action: "new_analysis", clearSession: false, readRetryable: false, tone: "error" },
  idempotency_conflict: { action: "none", clearSession: false, readRetryable: false, tone: "error" },
  analysis_not_ready: { action: "wait", clearSession: false, readRetryable: true, tone: "wait" },
  result_not_available: { action: "none", clearSession: false, readRetryable: false, tone: "wait" },
  capacity_wait: { action: "wait", clearSession: false, readRetryable: true, tone: "wait" },
  temporarily_unavailable: { action: "retry", clearSession: false, readRetryable: true, tone: "error" },
  non_retryable_failure: { action: "none", clearSession: false, readRetryable: false, tone: "error" },
};

/** `code` = problem code público, ou `null` para falha de rede/erro sem envelope. */
export function describeProblem(code: string | null): ProblemUi {
  if (code === null || !(code in TABELA)) {
    // Falha de rede (ou código desconhecido): leitura re-tentável, mensagem segura genérica.
    return {
      code: "network",
      messageKey: MSG("temporarily_unavailable"),
      action: "retry",
      clearSession: false,
      readRetryable: true,
      tone: "error",
    };
  }
  const known = code as ProblemCode;
  return { code: known, messageKey: MSG(known), ...TABELA[known] };
}
