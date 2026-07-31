// Redaction — nada sensível pode ir para log/erro do navegador.
//
// Regra da E1 (segurança/logs): NÃO guardar em log dataset, resultado integral, token,
// Idempotency-Key nem corpo bruto de problem+json. Este helper redige recursivamente essas
// chaves antes de qualquer `console.*`/telemetria da camada canônica.

const CHAVES_SENSIVEIS = new Set(
  [
    "authorization",
    "token",
    "access_token",
    "accesstoken",
    "idempotency-key",
    "idempotencykey",
    "idempotency_key",
    "dataset",
    "result",
    "result_json",
    "conversations",
    "cookie",
    "set-cookie",
    "password",
    "apikey",
    "api_key",
  ].map((k) => k.toLowerCase()),
);

const REDIGIDO = "[redacted]";

/** Redige recursivamente valores sensíveis por nome de chave. Trunca strings longas (datasets/
 *  resultados) para evitar despejar payload inteiro. Não lança. */
export function redactForLog(value: unknown, profundidade = 0): unknown {
  if (profundidade > 6) return REDIGIDO;
  if (value == null) return value;
  if (typeof value === "string") return value.length > 512 ? `${value.slice(0, 512)}…[+${value.length - 512}]` : value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redactForLog(v, profundidade + 1));
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    saida[k] = CHAVES_SENSIVEIS.has(k.toLowerCase()) ? REDIGIDO : redactForLog(v, profundidade + 1);
  }
  return saida;
}

/** Redige um valor de header por nome (Authorization/Idempotency-Key nunca em claro). */
export function redactHeader(nome: string, valor: string): string {
  return CHAVES_SENSIVEIS.has(nome.toLowerCase()) ? REDIGIDO : valor;
}
