// WS-A2/A4 — a DÍVIDA DECLARADA entre contrato, produtor e cliente.
//
// Um gate que só imprime a divergência não é gate: ninguém lê saída de suíte verde. Um gate que
// falha em qualquer divergência também não serve, porque a divergência de hoje é conhecida,
// aceita e tem missão própria.
//
// A saída é declarar. O gate compara a divergência REAL com estas listas. Um item novo fica
// vermelho; um item resolvido também — a lista precisa encolher junto com a dívida, senão vira
// folclore.

/** Operação contratada que ainda não tem cliente no frontend. É o blocker B1 (missão WS-C). */
export const SEM_CLIENTE_NO_FRONT: readonly string[] = [
  // Download do pacote de export (MF5.2).
  "GET /v1/analyses/{analysis_id}/analytics/export/download",
  // Linha do tempo LIDA dos eventos duráveis (Onda 7) — não remontada do estado atual.
  "GET /v1/analyses/{analysis_id}/timeline",
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
