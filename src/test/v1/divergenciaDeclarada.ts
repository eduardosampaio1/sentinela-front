// WS-A2/A4 — a DÍVIDA DECLARADA entre contrato, produtor e cliente.
//
// Um gate que só imprime a divergência não é gate: ninguém lê saída de suíte verde. Um gate que
// falha em qualquer divergência também não serve, porque a divergência de hoje é conhecida,
// aceita e tem missão própria.
//
// A saída é declarar. O gate compara a divergência REAL com estas listas. Um item novo fica
// vermelho; um item resolvido também — a lista precisa encolher junto com a dívida, senão vira
// folclore.

/**
 * Operação contratada que ainda não tem cliente no frontend. Era o blocker **B1** (missão WS-C).
 *
 * **VAZIA desde a M23 — B1 FECHADO.** As quatro saíram na Fase 3, uma por missão: `/progress`
 * (M20), `/analytics` (M21), `/analytics/export/download` (M22) e `/timeline` (M23). Todas as 12
 * operações de `operations[]` têm cliente, e `missing_in_front` está vazio.
 *
 * A lista fica aqui, vazia, em vez de sumir — mesmo mecanismo de `SEM_ENTRADA_NO_CONTRATO`: uma
 * operação nova sem cliente acusa vermelho contra `[]`, e ninguém precisa lembrar de recriar a
 * declaração. Apagá-la devolveria o problema que a WS-A2 existe para impedir: contrato crescendo
 * sem consumidor, com a suíte verde.
 *
 * **REABERTO PELA BD02.** Ela publicou três operações de Instance, e o Front ainda não as
 * consome. O gate acusou exatamente o que existe para acusar — a lista vazia fez o trabalho dela.
 *
 * **`create_instance` NÃO TEM MISSÃO DONA, e isto foi MEDIDO.** A trajetória que este comentário
 * declarava — *"após M37: 0, B1 fecha"* — era inferência NOSSA, repetida até parecer autoridade.
 * O preflight da M37 leu o PLAN: o escopo literal dela é *"pré-preencher escopo; configuração
 * contextual"*, e as superfícies são INST-04 (nova ANÁLISE a partir da Instância) e INST-07
 * (configuração). Nenhuma das duas é criar Instância, e o Blueprint não tem superfície de
 * criação — zero ocorrências nas sete INST.
 *
 * O Discovery §9.1 tem o nó *"Criar primeira Instância"*, então a NECESSIDADE existe. O que não
 * existe é superfície, missão e scenario. Owner semântico: **Produto/Arquitetura de Instância**.
 *
 * Reentrada, nesta ordem: produto define a superfície → Blueprint a incorpora → PLAN atribui
 * missão → scenario oficial → client/UX → só então B1 pode fechar.
 *
 * Estado, SEM data de fechamento:
 *
 *     BD02       3 divergências   B1 reaberto
 *     M36        1 (`create_instance`)
 *     após M37   1                B1 CONTINUA aberto — a M37 é INST-04, não criação
 *
 * Sobre `{analysis_id}` numa rota de Instance: não é engano. `operationInventory` normaliza
 * QUALQUER parâmetro de caminho para esse literal — token escolhido quando toda rota
 * parametrizada era de análise. Ele ficou enganoso com a BD02, mas continua correto porque
 * normaliza contrato e clientes do mesmo jeito. Trocá-lo é missão de harness, não daqui.
 */
export const SEM_CLIENTE_NO_FRONT: readonly string[] = [
  // A M36 entregou `listInstances` e `getInstance`, e as duas SAÍRAM daqui. A lista encolhe
  // junto com a dívida — se ficasse, viraria folclore, que é o que esta declaração existe para
  // impedir.
  "POST /v1/instances", // create_instance — SEM missão dona; owner: Produto/Arquitetura de Instância
] as const;

/**
 * Operação que o cliente chama e o array `operations[]` do contrato não lista.
 *
 * **VAZIA desde a BD07.** Era o conflito C2: o contrato congelava `me_read_model_fields`,
 * `me_user_fields`, `me_workspace_fields` e `me_capabilities`, declarava em `me_nota` que
 * *"GET /v1/me é a ÚNICA autoridade de membership do cliente"* e o Gateway implementava a rota
 * (`api/routes/me_v1.py`) — só a entrada em `operations[]` faltava. O WS-A3 classificou isso como
 * defeito do manifesto, não semântica intencional, e a BD07 o corrigiu: `get_me` entrou no
 * authoritative e o mirror foi alinhado byte a byte.
 *
 * A lista fica aqui, vazia, em vez de sumir. É o mecanismo: uma divergência nova acusa vermelho
 * contra `[]`, e ninguém precisa lembrar de recriar a declaração.
 */
export const SEM_ENTRADA_NO_CONTRATO: readonly string[] = [] as const;

/**
 * Campos que o PRODUTOR publica no snapshot e o frontend não lê, **por projeção**.
 *
 * Foi o segundo erro da revisão: declarei que `method_id`/`method_version`/`min_group_size` "não
 * existem no contrato público". Existem — dentro de `snapshot`, que o contrato de topo declara
 * como campo e não abre. Procurar no nível errado devolveu "não existe" com a mesma confiança
 * com que devolveria "existe".
 *
 * A lista é POR TIPO de propósito. Agregar tudo num conjunto único esconde justamente o caso
 * interessante: `min_group_size` **é lido** em `ResumoDeDistribuicao` e **não é** em
 * `ResumoDeConcentracao` nem em `SerieTemporal`. Um conjunto único diria "não lido" e estaria
 * meio errado nas duas direções.
 *
 * Duas naturezas convivem aqui, e a diferença importa para o plano:
 *
 *   (a) DÍVIDA — trust e parâmetros de privacidade que a tela deveria mostrar e ainda não mostra.
 *       É delta de FRONTEND (ler o que já chega), nunca delta de backend.
 *   (b) DELIBERADO — o que a fatia decidiu não apresentar, e documentou. `flag_crosses`,
 *       `numeric_crosses`, `flag_series` e `numeric_series` são CONTADOS em
 *       `blocosNaoApresentados`; `unsupported_measure_ids` e `unauthorized_measure_ids` são
 *       contados e nunca nomeados, porque `measure_id` é chave de saída e a MF5 congelou que
 *       chave de saída não atravessa a fronteira pública.
 */
export const PUBLICADO_E_NAO_LIDO: Readonly<Record<string, readonly string[]>> = {
  /**
   * (b) DELIBERADO — o que a fatia decidiu não apresentar, e documentou.
   *
   * `flag_crosses`, `numeric_crosses`, `flag_series` e `numeric_series` são CONTADOS em
   * `blocosNaoApresentados`; `unsupported_measure_ids` e `unauthorized_measure_ids` são contados e
   * nunca nomeados, porque `measure_id` é chave de saída e a MF5 congelou que chave de saída não
   * atravessa a fronteira pública. `plan_digest`, `plan_contract_version` e `input_artifact_id`
   * são procedência do PLANO, não da medida — outra superfície, outra missão.
   *
   * As quatro projeções saíram desta lista na M21: seus campos de trust passaram a ser LIDOS.
   * Restam só os deliberados, que é o que o DoD pedia.
   */
  SnapshotAnalitico: [
    "flag_crosses",
    "flag_series",
    "input_artifact_id",
    "numeric_crosses",
    "numeric_series",
    "plan_contract_version",
    "plan_digest",
    "unauthorized_measure_ids",
    "unsupported_measure_ids",
  ],
} as const;

/**
 * Campos do view model que NÃO vêm do fio.
 *
 * `analyticsProjection.ts` é híbrido de propósito: transporta a forma publicada em `snake_case` e
 * acrescenta contadores derivados em `camelCase`. Os derivados não são invenção — são o que a
 * tela precisa para dizer "recebi mais do que mostro" e "recebi algo que não soube ler". Ficam
 * declarados para que o gate consiga separar derivação legítima de campo inventado.
 */
export const DERIVADOS_DO_VIEW_MODEL: readonly string[] = [
  "blocosIlegiveis",
  // M21 — `procedencia` AGRUPA campos que o produtor publica soltos (o quarteto do método e os
  // parâmetros de privacidade). Não é campo do fio nem invenção: é a mesma informação, reunida
  // sob um nome, para que a tela peça "a procedência desta projeção" em vez de onze campos.
  "blocosNaoApresentados",
  "medidasNaoAutorizadas",
  "medidasNaoResumidas",
] as const;
