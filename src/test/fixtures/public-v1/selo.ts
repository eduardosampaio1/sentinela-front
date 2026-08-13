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
 * Atualizado pela **Two-View Recovery (F0)**, depois da Manifest Sync do produtor. O que mudou
 * no contrato: `result_document_schemas` passou a declarar `analysis-result-v3`, entrou o bloco
 * `result_negotiation`, e cada operação passou a declarar sua `optional_query` — 12 das 15
 * aceitam alguma, e o manifesto não declarava nenhuma.
 *
 * **A reconferência foi feita, e por medição:** os 19 eixos de que as fixtures dependem
 * (`*_read_model_fields`, `list_item_fields`, `public_states`, `progress_axes`,
 * `problem_codes`, `nunca_publicos`, `timeline_event_*`, `me_*`, `instance_*`) foram comparados
 * entre o contrato selado e o novo, e **nenhum** mudou. A evolução foi de negociação e
 * declaração de documento, não de read-model — por isso nenhuma amostra precisou de edição.
 *
 * Um detalhe que custou um vermelho e vale o registro: o digest é dos **bytes do disco**. A
 * primeira regeneração gravou CRLF no Windows, e o digest deixou de bater com o do git sem que
 * uma linha de conteúdo tivesse mudado. O produtor agora grava LF explicitamente
 * (`sentinela-facts/tests/test_5_5_public_contract_congelado.py`); um sentinela por bytes
 * precisa dos mesmos bytes em toda plataforma.
 *
 * Antes da F0: `98506592e3b913f2445134f82cb949df054c8b33c0ad0815ed99677bcd2d117d` (BD02).
 *
 * Histórico da BD02, que publicou a Instance: tres operacoes novas
 * (`create_instance`/`list_instances`/`get_instance`, 12 -> 15) e `instance_id` nas projecoes de
 * Analysis. As fixtures foram RECONFERIDAS antes deste selo — as 12 amostras de status e de
 * listagem passaram a declarar `instance_id: null`, tornando explicita a ausencia que ja era
 * verdade nelas.
 *
 * Origem usada: `SENTINELA_CONTRACT_ORIGIN=../sentinela-facts/docs/contracts` (develop @
 * ac81633). A declaracao foi necessaria porque existem DOIS worktrees do mesmo repo logico com
 * contratos diferentes nesta maquina, e o resolver recusa escolher em silencio — corretamente.
 *
 * Antes da BD02: `37b2c019382133750c347a7e59f0c414ec14b1f5839bb6a85c19cb879c5216ce` (BD07,
 * 12 operacoes).
 *
 * **Como atualizar:** não edite este valor para "consertar" um gate vermelho. O vermelho diz que
 * o contrato mudou; o trabalho é reconferir as fixtures contra a mudança e só então trazer o
 * digest novo — no mesmo commit.
 */
export const DIGEST_DO_CONTRATO_DERIVADO =
  "005a0874ec1433888ad6cb7dfb1eb6d481208af7b5408270872c0238f7283b96";

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
