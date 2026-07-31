import { describe, expect, it } from "vitest";
import { describeProblem } from "./errorView";

describe("describeProblem — matriz dos 9 erros públicos (decisão SÓ pelo código)", () => {
  it("authentication_required → sign_in, limpa sessão, sem auto-retry", () => {
    const p = describeProblem("authentication_required");
    expect(p).toMatchObject({ action: "sign_in", clearSession: true, readRetryable: false, tone: "error" });
  });

  it("forbidden_or_not_found → voltar, resposta não reveladora", () => {
    expect(describeProblem("forbidden_or_not_found")).toMatchObject({ action: "back", tone: "error", readRetryable: false });
  });

  it("invalid_input → nova análise (corrigir entrada), sem auto-retry", () => {
    expect(describeProblem("invalid_input")).toMatchObject({ action: "new_analysis", readRetryable: false });
  });

  it("idempotency_conflict → none (usa a existente), NUNCA nova chave/retry automático", () => {
    expect(describeProblem("idempotency_conflict")).toMatchObject({ action: "none", readRetryable: false });
  });

  it("analysis_not_ready → wait (continua acompanhando), tom neutro", () => {
    expect(describeProblem("analysis_not_ready")).toMatchObject({ action: "wait", tone: "wait" });
  });

  it("result_not_available → none, tom neutro (em preparação, não falha analítica)", () => {
    expect(describeProblem("result_not_available")).toMatchObject({ action: "none", tone: "wait" });
  });

  it("capacity_wait → wait, tom neutro (queued, NÃO é falha terminal)", () => {
    const p = describeProblem("capacity_wait");
    expect(p).toMatchObject({ action: "wait", tone: "wait" });
    expect(p.tone).not.toBe("error"); // nunca erro vermelho
  });

  it("temporarily_unavailable → retry, leitura re-tentável (limitada)", () => {
    expect(describeProblem("temporarily_unavailable")).toMatchObject({ action: "retry", readRetryable: true, tone: "error" });
  });

  it("non_retryable_failure → none, definitiva, sem retry", () => {
    expect(describeProblem("non_retryable_failure")).toMatchObject({ action: "none", readRetryable: false, tone: "error" });
  });

  it("falha de rede (código null) → retry, leitura re-tentável, mensagem segura genérica", () => {
    const p = describeProblem(null);
    expect(p).toMatchObject({ code: "network", action: "retry", readRetryable: true });
    expect(p.messageKey).toBe("canonicalAnalysis.problem.temporarily_unavailable");
  });

  it("toda mensagem sai do namespace i18n problem.<code> (nunca title/detail cru)", () => {
    for (const c of [
      "authentication_required",
      "forbidden_or_not_found",
      "invalid_input",
      "idempotency_conflict",
      "analysis_not_ready",
      "result_not_available",
      "capacity_wait",
      "temporarily_unavailable",
      "non_retryable_failure",
    ]) {
      expect(describeProblem(c).messageKey).toBe(`canonicalAnalysis.problem.${c}`);
    }
  });
});
