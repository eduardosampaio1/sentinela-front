// Tradução de EXPERIÊNCIA do problem+json — separada do transporte (`problem.ts`).
//
// problem público (código estável) → mensagem compreensível + ação possível. NUNCA lê `detail`
// cru, host, exceção ou corpo do backend; a tradução depende SÓ do `code` estável. Chrome em EN
// (o produto é EN-only). A camada canônica não decide texto de UI comparando strings do backend.

import type { Problem, ProblemCode } from "./contract/public-v1.types";

/** Ação sugerida ao usuário para um problema (o componente decide como renderizar). */
export type ProblemAction = "sign_in" | "retry" | "wait_and_retry" | "go_back" | "contact_support" | "none";

export interface ProblemExperience {
  /** Título curto e estável. */
  title: string;
  /** Mensagem compreensível (sem jargão interno, sem detalhe cru). */
  message: string;
  /** Ação canônica sugerida. */
  action: ProblemAction;
  /** É seguro/tem sentido oferecer "tentar de novo" automaticamente? */
  retryable: boolean;
}

const MENSAGENS: Record<ProblemCode, { title: string; message: string; action: ProblemAction }> = {
  authentication_required: {
    title: "Sign in required",
    message: "Your session is no longer valid. Please sign in again to continue.",
    action: "sign_in",
  },
  forbidden_or_not_found: {
    title: "Not found",
    message: "This analysis doesn't exist or isn't available in your workspace.",
    action: "go_back",
  },
  invalid_input: {
    title: "Invalid request",
    message: "The request couldn't be processed as sent. Please review and try again.",
    action: "none",
  },
  idempotency_conflict: {
    title: "Already in progress",
    message: "This request was already submitted. We're using the existing analysis instead of creating a new one.",
    action: "none",
  },
  analysis_not_ready: {
    title: "Not ready yet",
    message: "The analysis is still being prepared or is running. The result isn't available yet.",
    action: "none",
  },
  result_not_available: {
    title: "Result unavailable",
    message: "No result is available for this analysis.",
    action: "none",
  },
  capacity_wait: {
    title: "Waiting for capacity",
    message: "The system is at capacity right now. This will proceed automatically once capacity frees up.",
    action: "wait_and_retry",
  },
  temporarily_unavailable: {
    title: "Temporarily unavailable",
    message: "The service is temporarily unavailable. Please try again in a moment.",
    action: "wait_and_retry",
  },
  non_retryable_failure: {
    title: "Something went wrong",
    message: "The request couldn't be completed. Retrying won't help — please contact support if it persists.",
    action: "contact_support",
  },
};

/** Traduz um `Problem` (transporte) para a experiência de UI. Só usa o `code` estável. */
export function problemToExperience(problem: Problem): ProblemExperience {
  const base = MENSAGENS[problem.code] ?? MENSAGENS.non_retryable_failure;
  return { ...base, retryable: problem.retryable };
}
