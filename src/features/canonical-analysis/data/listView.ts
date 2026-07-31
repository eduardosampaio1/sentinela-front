// Classificação de erro da LISTAGEM (Onda 6 E4). Decide a apresentação SÓ pelo código público
// (ou ausência dele = falha de rede) — nunca por `title`/`detail`/texto. Distingue os três estados
// exigidos: sessão expirada, erro recuperável (rede/temporário) e erro genérico (resposta inválida).

/** `code` = problem code público (ou `null` para falha de rede/erro sem envelope). */
export function classifyListError(code: string | null): "session" | "recoverable" | "generic" {
  if (code === "authentication_required") return "session";
  if (code === null || code === "temporarily_unavailable" || code === "capacity_wait") return "recoverable";
  return "generic";
}
