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
 * Atualizado pela **M40 · INST-05**, depois da **BD10**. O que mudou no contrato: 15 → 18
 * operações (`get`/`set`/`clear_instance_baseline`, sub-recurso da Instance), `baseline_eligible`
 * entrou na `optional_query` de `list_analyses`, e nasceu o bloco declarativo
 * `baseline_reference`.
 *
 * **A reconferência foi refeita, e por medição:** os mesmos **19 eixos** foram comparados entre o
 * contrato selado e o novo, campo a campo — **nenhum mudou**. Em particular
 * `instance_read_model_fields` continua sendo exatamente `["instance_id", "name", "created_at"]`,
 * porque a BD10 recusou embutir o ponteiro na `InstanceView`: baseline é sub-recurso, com leitura
 * própria. Nenhuma amostra precisou de edição.
 *
 * Atualizado pela **BD11 · Account language preference** (2026-08-13). O que mudou no contrato:
 * 18 → 20 operações (`get_me_language`/`set_me_language`, sub-recurso de `/v1/me`) e nasceu o
 * bloco declarativo `account_language_preference`.
 *
 * **A reconferência foi refeita, e desta vez sobre o contrato INTEIRO, não só sobre as famílias
 * de eixos.** Das **30 chaves de topo em comum**, uma única mudou de valor — `operations` —, e a
 * mudança é **puramente aditiva**: nenhuma operação existente foi alterada, nenhuma foi removida.
 * Nenhum `*_read_model_fields`, `list_item_fields`, `public_states`, `progress_axes`,
 * `problem_codes`, `nunca_publicos`, `timeline_event_*`, `me_*` nem `instance_*` mudou. Nenhuma
 * amostra precisou de edição.
 *
 * (Registro de instrumento: as notas anteriores falam em "19 eixos". Filtrando o contrato por
 * essas famílias hoje encontram-se **17** chaves. Não achei o critério que produzia 19, então
 * troquei a contagem pela comparação total — 30 de 30 — que é mais forte e não depende de acertar
 * a lista. Repetir "19" sem conseguir reproduzi-lo seria citar folclore como medição.)
 *
 * Antes da BD11: `07de1d3c98c27347f5884d80f20fd63adb53db5236c53927f89b40e36d290b62` (M40/BD10,
 * 18 operacoes) — conferido: o contrato em `9e252f0^` do `sentinela-facts` produz exatamente esse
 * digest, o que prova o instrumento antes de mover o selo.
 *
 * Antes da M40: `005a0874ec1433888ad6cb7dfb1eb6d481208af7b5408270872c0238f7283b96` (Two-View, 15
 * operacoes).
 *
 * **A reconferência anterior (Two-View F0), preservada:** os 19 eixos de que as fixtures dependem
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
/*
 * Atualizado pela **M42 · CFG-03/CFG-04** (2026-08-14), depois de **BD12**, **BD13** e **BD14**.
 * O gate estava VERMELHO no `develop` desde então — medido antes de qualquer alteração desta
 * missão, com `git stash`, e não deduzido. O contrato foi de 23 para 27 operações e o selo ficou
 * para trás; a suíte seguia acusando, e a acusação estava certa.
 *
 * O que mudou no contrato: entraram `get_workspace`/`rename_workspace` (BD12),
 * `rename_instance` (BD13) e as quatro de Subscription (BD14), mais os blocos declarativos
 * `workspace`, `instance_rename` e `subscription`.
 *
 * **A reconferência foi refeita, e por medição, não por confiança.** Todos os eixos que as
 * fixtures consomem foram comparados com o contrato vigente:
 *
 *     instance_read_model_fields   ["instance_id", "name", "created_at"]        inalterado
 *     me_read_model_fields         ["user", "workspaces", "capabilities"]        inalterado
 *     me_user_fields               ["id", "email", "name"]                       inalterado
 *     me_workspace_fields          ["id", "name", "role"]                        inalterado
 *     list_item_fields             7 campos                                      inalterado
 *     status_read_model_fields     8 campos                                      inalterado
 *     result_read_model_fields     4 campos                                      inalterado
 *     analytics_read_model_fields  —                                             inalterado
 *     timeline_event_fields        8 campos · schema `public-events-v1`          inalterado
 *     public_states · progress_axes · progress_states · problem_codes            inalterados
 *     result_document_schemas      v1 · v2 · v3                                  inalterado
 *
 * A mudança é **puramente aditiva**: nenhuma operação existente foi alterada ou removida, e
 * nenhum read-model mudou de forma. Nenhuma amostra precisou de edição — e é por isso que este
 * número pôde ser trazido, em vez de "consertado".
 *
 * Nota de instrumento, porque ela quase custou uma acusação errada: o resolvedor hasheia o
 * conteúdo **normalizado** (`\r\n` → `\n`), e a mensagem do Vitest imprime `expected <atual> to
 * be <esperado>` — o valor à esquerda é o do CONTRATO, o da direita é o SELO. Ler ao contrário
 * leva a procurar um terceiro arquivo que não existe.
 */
// Reselado ao publicar `create_workspace` (POST /v1/workspaces) no contrato.
//
// A mudanca e ADITIVA -- uma operacao a mais em `operations[]`, nenhuma alterada nem
// removida -- e por isso nenhuma fixture de read-model foi afetada. A reconferencia que o
// teste exige nao foi presumida: as demais asercoes de `fixtures-presas-ao-schema` rodaram
// verdes na mesma passagem, e sao elas que comparam fixture contra schema.
// Selo anterior: 1f1480c5347bd5839e53e2cb94e214a5507ede623f77332696fa207bb6b1218b
export const DIGEST_DO_CONTRATO_DERIVADO =
  "e8976632c587b177e0e87ef154bbaecc3e1291c34b6ce3593300d21518ac9d31";

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
