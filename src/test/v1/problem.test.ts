import { describe, expect, it } from "vitest";
import {
  isProblem,
  normalizeProblem,
  PROBLEM_CODES,
  problemToExperience,
  ProblemError,
} from "@/lib/v1";
import { problem } from "@/test/fixtures/public-v1/analyses";

describe("problem+json — transporte", () => {
  it("normaliza cada uma das 9 categorias com status/retryable canônicos", () => {
    for (const code of PROBLEM_CODES) {
      const p = normalizeProblem(problem(code), problem(code).status, "corr");
      expect(p.code).toBe(code);
      expect(p.type).toBe(`urn:sentinela:error:${code}`);
      expect(typeof p.retryable).toBe("boolean");
    }
    expect(normalizeProblem(problem("capacity_wait"), 503, "c").retryable).toBe(true);
    expect(normalizeProblem(problem("invalid_input"), 400, "c").retryable).toBe(false);
  });

  it("deriva o código do STATUS quando o corpo não é problem+json", () => {
    expect(normalizeProblem({}, 401, "c").code).toBe("authentication_required");
    expect(normalizeProblem({}, 404, "c").code).toBe("forbidden_or_not_found");
    expect(normalizeProblem({}, 503, "c").code).toBe("temporarily_unavailable");
  });

  it("detail NUNCA vaza: URL/host/SQL/trace crus viram o código", () => {
    const vazamentos = ["https://minio:9000/bucket/key", "select * from jobs", "Traceback (most recent call last)", "/var/run/x"];
    for (const bruto of vazamentos) {
      const p = normalizeProblem({ code: "temporarily_unavailable", detail: bruto }, 503, "c");
      expect(p.detail).toBe("temporarily_unavailable");
    }
    // um detail curto e seguro (código) é preservado
    expect(normalizeProblem({ code: "idempotency_conflict", detail: "idempotency_conflict" }, 409, "c").detail).toBe("idempotency_conflict");
  });

  it("isProblem só reconhece envelope com code público + type", () => {
    expect(isProblem(problem("forbidden_or_not_found"))).toBe(true);
    expect(isProblem({ code: "job_failed", type: "x" })).toBe(false);
    expect(isProblem({})).toBe(false);
  });

  it("ProblemError.message = só o código (nunca a mensagem crua)", () => {
    const e = new ProblemError(problem("non_retryable_failure"));
    expect(e.message).toBe("non_retryable_failure");
  });
});

describe("problem+json — tradução de experiência (separada do transporte)", () => {
  it("cada código tem título/mensagem/ação estáveis", () => {
    for (const code of PROBLEM_CODES) {
      const exp = problemToExperience(problem(code));
      expect(exp.title.length).toBeGreaterThan(0);
      expect(exp.message.length).toBeGreaterThan(0);
      expect(exp.action).toBeTruthy();
    }
  });

  it("mapeia ações-chave", () => {
    expect(problemToExperience(problem("authentication_required")).action).toBe("sign_in");
    expect(problemToExperience(problem("capacity_wait")).action).toBe("wait_and_retry");
    expect(problemToExperience(problem("non_retryable_failure")).action).toBe("contact_support");
    // não compara texto do backend: a mensagem vem do código, não do detail
    const exp = problemToExperience({ ...problem("forbidden_or_not_found"), detail: "segredo-interno" });
    expect(exp.message).not.toContain("segredo");
  });
});
