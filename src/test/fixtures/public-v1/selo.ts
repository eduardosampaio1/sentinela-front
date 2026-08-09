// M17 — o SELO das fixtures: de qual contrato elas foram derivadas.
//
// ## A barreira que mata em silêncio
//
// O contrato evolui, a fixture não, e a suíte segue verde — porque ela testa a fixture contra ela
// mesma. É o pior modo de falha de uma suíte: ela não fica vermelha, ela fica **irrelevante**.
// O front continua provando que sabe ler um formato que o backend parou de mandar.
//
// O selo quebra isso. Ele registra o digest do contrato vigente quando as fixtures foram
// conferidas. No dia em que o contrato mudar, o gate fica vermelho e exige que alguém **olhe** —
// não que alguém lembre.
//
// ## Por que um digest, e não uma data ou um número de versão
//
// `version` é `public-v1` desde sempre e continuou sendo `public-v1` depois da BD07, que
// acrescentou uma operação e alinhou 16 chaves. Uma versão que não muda quando o conteúdo muda
// não serve de sentinela. O digest muda com qualquer byte.

/**
 * SHA-256 do contrato público do qual estas fixtures foram derivadas e conferidas.
 *
 * Atualizado pela **BD07**, que acrescentou `get_me` a `operations[]` e alinhou o mirror byte a
 * byte ao authoritative.
 *
 * **Como atualizar:** não edite este valor para "consertar" um gate vermelho. O vermelho diz que
 * o contrato mudou; o trabalho é reconferir as fixtures contra a mudança e só então trazer o
 * digest novo — no mesmo commit.
 */
export const DIGEST_DO_CONTRATO_DERIVADO =
  "37b2c019382133750c347a7e59f0c414ec14b1f5839bb6a85c19cb879c5216ce";

/**
 * Campos que o contrato publica e que NENHUMA fixture exercita hoje.
 *
 * Não é erro: o tipo os marca opcionais, e uma fixture não precisa cobrir tudo. Mas também não
 * pode ser silencioso — "a fixture não exercita" e "o campo não existe" são coisas diferentes, e
 * a segunda é o que a suíte acaba acreditando quando ninguém escreve a primeira.
 *
 * A lista só encolhe. Um campo novo não coberto entra aqui por decisão explícita, e o gate reprova
 * se ela sobrar depois de o campo passar a ser exercitado.
 */
export const PUBLICADO_SEM_FIXTURE: readonly string[] = [
  // `list_item_fields`. O backend materializa o resumo analítico na mesma query; `null` significa
  // ausente, nunca zero. `historicoView` já lê o campo e tem casos próprios — o que falta é a
  // fixture de LISTA exercitá-lo.
  "list_item_fields.observed_conversations",
] as const;
