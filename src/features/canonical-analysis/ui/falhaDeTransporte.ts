// M33 — a falha de TRANSPORTE, que não é um erro do contrato.
//
// ## Por que ela precisa de um nome próprio
//
// `problemCodeOf` só reconhece `ProblemError`: um envelope que o backend produziu e que carrega um
// dos nove códigos públicos. Quando a requisição **não chega a ter resposta** — rede caiu, DNS,
// TLS, servidor mudo — não há envelope, `problemCodeOf` devolve `null`, e o `ProblemNotice`
// renderiza `null`. Medido: o upload falhava **em silêncio**, o spinner sumia e o rótulo do botão
// virava "tentar de novo" sem que uma frase dissesse por quê.
//
// É o scenario 5 (`upload-network-failure`), e o catálogo já explicava a distinção que ninguém
// tinha implementado: *"falha de TRANSPORTE, não envelope de erro: a distinção importa porque uma
// é retomável pelo mesmo caminho e a outra consumiu a operação"*.
//
// ## A distinção que a tela precisa preservar
//
// falha de transporte ≠ rejeição do conteúdo ≠ falha permanente da análise.
//
// - rejeição do conteúdo (`invalid_input`) — o backend **respondeu**: viu a base e recusou.
// - falha permanente (`non_retryable_failure`) — respondeu, e não adianta repetir.
// - transporte — **não sabemos se chegou.** Nem que chegou, nem que não chegou.
//
// E a diferença não é acadêmica: `POST /v1/analyses/{id}/data` **não exige `Idempotency-Key`** no
// contrato publicado (`required_headers: []`, contra `["Idempotency-Key"]` de `prepare` e
// `submit`). Não há garantia publicada de repetição segura. Afirmar "não foi enviado" e reenviar
// seria inventar uma semântica que o contrato não dá.

import { ProblemError } from "@/lib/v1";

/**
 * O erro é de transporte?
 *
 * `AbortError` fica de fora de propósito: aborto é decisão de quem chamou, não falha da rede — e
 * apresentá-lo como "não sabemos se chegou" seria assustar por algo que a própria tela causou.
 * (Na M33 não há mais aborto nesta jornada: cancelar está fora da V1 por D15.)
 */
export function ehFalhaDeTransporte(erro: unknown): boolean {
  if (erro == null) return false;
  if (erro instanceof ProblemError) return false;
  if (erro instanceof DOMException && erro.name === "AbortError") return false;
  return true;
}
