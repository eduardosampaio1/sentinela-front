// application/problem+json (RFC 7807) — TRANSPORTE. As 9 categorias públicas congeladas.
//
// Separação deliberada: este módulo só entende o ENVELOPE (parse/normalização segura). A tradução
// para experiência (mensagem + ação) vive em `problemMessages.ts`. NUNCA comparar mensagem textual
// do backend; NUNCA exibir `detail`/host/exceção/corpo bruto sem tradução.

import type { Problem, ProblemCode } from "./contract/public-v1.types";

export const PROBLEM_MEDIA_TYPE = "application/problem+json";
const PREFIXO_TIPO = "urn:sentinela:error:";

/** code → (status canônico, retryable, title padrão). Espelha o `_CATALOGO` do Gateway. */
export const PROBLEM_CATALOG: Record<ProblemCode, { status: number; retryable: boolean; title: string }> = {
  invalid_input: { status: 400, retryable: false, title: "Entrada inválida" },
  authentication_required: { status: 401, retryable: false, title: "Autenticação necessária" },
  forbidden_or_not_found: { status: 404, retryable: false, title: "Não encontrado" },
  idempotency_conflict: { status: 409, retryable: false, title: "Conflito de idempotência" },
  analysis_not_ready: { status: 409, retryable: false, title: "Análise ainda não pronta" },
  result_not_available: { status: 404, retryable: false, title: "Resultado indisponível" },
  capacity_wait: { status: 503, retryable: true, title: "Sem capacidade no momento" },
  temporarily_unavailable: { status: 503, retryable: true, title: "Temporariamente indisponível" },
  non_retryable_failure: { status: 422, retryable: false, title: "Falha não recuperável" },
};

export const PROBLEM_CODES = Object.keys(PROBLEM_CATALOG) as ProblemCode[];

function ehProblemCode(x: unknown): x is ProblemCode {
  return typeof x === "string" && x in PROBLEM_CATALOG;
}

/** É um envelope problem+json reconhecível? (checa o shape mínimo, sem confiar no corpo bruto). */
export function isProblem(x: unknown): x is Problem {
  return (
    typeof x === "object" &&
    x !== null &&
    ehProblemCode((x as { code?: unknown }).code) &&
    typeof (x as { type?: unknown }).type === "string"
  );
}

/** `detail` seguro: só aceitamos um token curto/estável (o Gateway já manda o CÓDIGO, nunca a
 *  mensagem crua). Qualquer coisa que pareça URL/host/SQL/trace vira o próprio código. */
function detalheSeguro(detail: unknown, code: ProblemCode): string {
  if (typeof detail !== "string") return code;
  const suspeito = /https?:\/\/|[/\\]|@|\s|::|select |from |traceback|exception|0x/i.test(detail);
  if (suspeito || detail.length > 64) return code;
  return detail;
}

/**
 * Normaliza QUALQUER resposta de erro do `/v1` num `Problem` estável e SEGURO.
 * Nunca confia no corpo bruto: deriva `code` (do corpo se válido, senão do status HTTP), aplica o
 * catálogo canônico (status/retryable/title) e sanea o `detail`. `instance` = correlation id.
 */
export function normalizeProblem(
  body: unknown,
  httpStatus: number,
  correlationId: string,
): Problem {
  const bruto = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const code: ProblemCode = ehProblemCode(bruto.code)
    ? bruto.code
    : codeDoStatus(httpStatus);
  const cat = PROBLEM_CATALOG[code];
  return {
    type: typeof bruto.type === "string" && bruto.type.startsWith(PREFIXO_TIPO)
      ? bruto.type
      : `${PREFIXO_TIPO}${code}`,
    title: cat.title,
    status: cat.status,
    code,
    detail: detalheSeguro(bruto.detail, code),
    instance: typeof bruto.instance === "string" ? bruto.instance : correlationId,
    retryable: cat.retryable,
  };
}

/** Fallback: mapeia o status HTTP para um código público (quando o corpo não é problem+json). */
function codeDoStatus(status: number): ProblemCode {
  if (status === 401) return "authentication_required";
  if (status === 403 || status === 404) return "forbidden_or_not_found";
  if (status === 400) return "invalid_input";
  if (status === 409) return "idempotency_conflict";
  if (status >= 500) return "temporarily_unavailable";
  return "non_retryable_failure";
}

/** Erro tipado da camada canônica: carrega o `Problem` normalizado. `message` = só o código
 *  (nunca a mensagem crua do backend), para não vazar em stack/log. */
export class ProblemError extends Error {
  readonly problem: Problem;
  constructor(problem: Problem) {
    super(problem.code);
    this.name = "ProblemError";
    this.problem = problem;
  }
}

/**
 * A requisição não chegou a ter resposta — M33.
 *
 * O cliente colapsava TRÊS coisas em `temporarily_unavailable`: rejeição do `fetch`, `200` sem
 * JSON e JSON malformado. Nas duas últimas o servidor **respondeu**, e "temporariamente
 * indisponível" descreve o que houve. Na primeira não houve resposta nenhuma — e afirmar que o
 * serviço está indisponível é dizer o que o navegador não tem como saber: pode ser a rede local,
 * o DNS, o TLS, ou a resposta que se perdeu depois de o pedido chegar.
 *
 * A captura da AN-01 mostrou o custo: uma queda de rede durante o upload aparecia como
 * *"O serviço está temporariamente indisponível"* — importando o vocabulário de ERR-503 para uma
 * situação em que o dado **pode ter sido recebido**.
 *
 * O `code` público continua `temporarily_unavailable`: quem só conhece os nove códigos do contrato
 * não muda de comportamento, e nada novo é publicado. O que a subclasse acrescenta é a distinção
 * que a superfície precisa para não afirmar o que não sabe.
 */
export class TransportError extends ProblemError {
  constructor(problem: Problem) {
    super(problem);
    this.name = "TransportError";
  }
}
