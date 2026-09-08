import type {
  MappingConfirmedView, MappingView, OutcomeMappingInput, ModelUsageMappingInput,
  AnalysisHandle, AnalysisListPage, AnalysisAnalyticsView, AnalyticsQueryInput,
  AnalyticsQueryResultView, SavedAnalyticsView, SavedAnalyticsViewList,
  AnalysisExportDownloadView, AnalysisProgressView, AnalysisResultView,
  AnalysisStatusView, AnalysisTimelineView, CanonicalScope, PrepareParams,
  InstanceListPage, BaselineView, InstanceListParams, InstanceView, WorkspaceView,
  ListParams, MeView, EffectiveLanguage, LanguagePreferenceView,
  CreateSubscriptionInput, SubscriptionDisabledView, SubscriptionListPage,
  SubscriptionSecretView, RenameAnalysisView, DeleteAnalysisView, AnalysisContextView,
  ContextDraftInput, ContextSuggestionView, ReviewArtifactView, ReviewRequestView,
  AskAnalysisInput, AskConversationView, AskTurnView, ReviewActionListView,
  ReviewActionRecordView, AcceptReviewActionInput, TransitionReviewActionInput,
  ReviewFeedbackView, SubmitReviewFeedbackInput, EconomicsScenarioScale,
  SavedEconomicsScenarioView, SavedEconomicsScenarioListView,
  EconomicsReconciliationView, EconomicsReconciliationListView,
  PricingRegistryStatusView, LongitudinalComparisonView,
} from "./contract/public-v1.types";
import type { RequestOptions, UploadAbertoView, UploadParteView } from "./client";

export interface V1Client {
  /** Sessão e workspaces permitidos. Única operação SEM escopo de tenant, por definição. */
  me(opts?: RequestOptions): Promise<MeView>;
  /**
   * A preferência de idioma da CONTA (BD11). Sub-recurso de `/v1/me`, e **não** parte dela: a
   * identidade é projeção de claims e não faz I/O, enquanto esta atravessa até o `sentinela-account`.
   * Compor as duas faria a identidade passar a falhar quando o Account cair.
   *
   * Sem escopo de tenant, e isso é decisão de produto congelada: a preferência é **global por
   * usuário**, e mandar `workspace_id` sugeriria uma partição que trocaria o idioma ao trocar de
   * Workspace.
   */
  meLanguage(opts?: RequestOptions): Promise<LanguagePreferenceView>;
  /** Persiste a escolha. Aceita exclusivamente `en` e `pt`; não existe operação de limpar. */
  setMeLanguage(
    language: EffectiveLanguage,
    opts?: RequestOptions,
  ): Promise<LanguagePreferenceView>;
  /**
   * Reserva a análise. `params.instanceId` viaja como query OPCIONAL — nunca no corpo, que é onde
   * o Gateway real NÃO lê. `CanonicalScope` continua satisfazendo `PrepareParams` por estrutura,
   * então o chamador da jornada geral não muda.
   */
  prepare(
    params: PrepareParams,
    opts?: RequestOptions,
  ): Promise<AnalysisHandle>;
  /**
   * Progresso por EIXO. Devolve os eixos como o backend os manda — sem agregar, sem ordenar,
   * sem completar os que faltarem. Ausência de um eixo é ausência, não `pending`.
   */
  getProgress(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisProgressView>;
  /**
   * Projeção analítica pública. Entrega o documento como veio — `withheld` NÃO vira erro, e
   * `partial` NÃO vira `failed`: as três situações são distintas e a tela precisa distingui-las.
   */
  getAnalytics(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisAnalyticsView>;
  getAnalysisContext(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisContextView>;
  putAnalysisContext(
    analysisId: string,
    scope: CanonicalScope,
    input: ContextDraftInput,
    opts?: RequestOptions,
  ): Promise<AnalysisContextView>;
  suggestAnalysisContext(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<ContextSuggestionView>;
  sealAnalysisContext(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisContextView>;
  getReview(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<ReviewArtifactView>;
  requestReview(
    analysisId: string,
    scope: CanonicalScope,
    language: "pt" | "en",
    opts?: RequestOptions,
  ): Promise<ReviewRequestView>;
  getAskConversation(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AskConversationView>;
  askAnalysis(
    analysisId: string,
    scope: CanonicalScope,
    input: AskAnalysisInput,
    opts?: RequestOptions,
  ): Promise<AskTurnView>;
  downloadReview(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<Blob>;
  getReviewActions(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<ReviewActionListView>;
  acceptReviewAction(
    analysisId: string,
    scope: CanonicalScope,
    input: AcceptReviewActionInput,
    opts?: RequestOptions,
  ): Promise<ReviewActionRecordView>;
  transitionReviewAction(
    analysisId: string,
    actionRecordId: string,
    scope: CanonicalScope,
    input: TransitionReviewActionInput,
    opts?: RequestOptions,
  ): Promise<ReviewActionRecordView>;
  getReviewFeedback(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<ReviewFeedbackView>;
  submitReviewFeedback(
    analysisId: string,
    scope: CanonicalScope,
    input: SubmitReviewFeedbackInput,
    opts?: RequestOptions,
  ): Promise<ReviewFeedbackView>;
  queryAnalytics(
    analysisId: string,
    scope: CanonicalScope,
    query: AnalyticsQueryInput,
    opts?: RequestOptions,
  ): Promise<AnalyticsQueryResultView>;
  listAnalyticsViews(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<SavedAnalyticsViewList>;
  getAnalyticsView(
    analysisId: string,
    viewId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<SavedAnalyticsView>;
  saveAnalyticsView(
    analysisId: string,
    scope: CanonicalScope,
    name: string,
    query: AnalyticsQueryInput,
    opts?: RequestOptions,
  ): Promise<SavedAnalyticsView>;
  exportAnalyticsView(
    analysisId: string,
    viewId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<Blob>;
  /**
   * Capability de download do pacote de export. **Uma chamada por intenção**, nunca especulativa:
   * a URL devolvida é assinada e curta, e pedi-la "por via das dúvidas" gastaria a validade antes
   * de existir alguém querendo baixar.
   *
   * Quem diz SE há o que baixar é o eixo `export` de `getProgress` — usar a tentativa de download
   * para DESCOBRIR o estado trataria a resposta de erro como oráculo, e o produtor colapsa quatro
   * causas distintas (inexistente, de outro workspace, expirado, purgado) no mesmo
   * `forbidden_or_not_found` exatamente para impedir isso.
   */
  getExportDownload(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisExportDownloadView>;
  /**
   * Eventos duráveis desta análise, na ordem em que o produtor os entrega. **Lido, nunca
   * remontado**: o front não deriva evento do estado atual, não completa lacuna e não ordena —
   * ordenar aqui seria o cliente opinando sobre a história que o backend gravou.
   */
  getTimeline(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisTimelineView>;
  uploadData(
    analysisId: string,
    scope: CanonicalScope,
    body: BodyInit,
    opts?: RequestOptions,
  ): Promise<AnalysisStatusView>;
  openDataUpload(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<UploadAbertoView>;
  uploadDataPart(
    analysisId: string,
    scope: CanonicalScope,
    uploadSessionId: string,
    partNumber: number,
    body: BodyInit,
    opts?: RequestOptions,
  ): Promise<UploadParteView>;
  completeDataUpload(
    analysisId: string,
    scope: CanonicalScope,
    uploadSessionId: string,
    parts: Array<{ part_number: number; etag: string }>,
    opts?: RequestOptions,
  ): Promise<AnalysisStatusView>;
  submit(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisHandle>;
  getStatus(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisStatusView>;
  renameAnalysis(
    analysisId: string,
    scope: CanonicalScope,
    name: string,
    opts?: RequestOptions,
  ): Promise<RenameAnalysisView>;
  deleteFailedAnalysis(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<DeleteAnalysisView>;
  /**
   * O resultado canônico. **Quem escolhe a versão é quem pede.**
   *
   * `resultSchemaVersion` é OPCIONAL e viaja como `?result_schema_version=`, exatamente como o
   * manifesto público a declara. Omitir preserva o comportamento histórico byte a byte — o loop
   * de query descarta vazios, então a requisição de quem não negocia é idêntica à de antes.
   *
   * O produtor **não** cai de v3 para v1 em silêncio: pedir uma versão que esta análise não tem
   * devolve problema explícito. Quem chama trata a ausência; ninguém a disfarça.
   */
  getResult(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
    resultSchemaVersion?: string,
  ): Promise<AnalysisResultView>;
  getLongitudinalComparison(
    currentAnalysisId: string,
    baselineAnalysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<LongitudinalComparisonView>;
  listEconomicsScenarios(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<SavedEconomicsScenarioListView>;
  saveEconomicsScenario(
    analysisId: string,
    scope: CanonicalScope,
    input: { name: string; route_id: string; scale: EconomicsScenarioScale },
    opts?: RequestOptions,
  ): Promise<SavedEconomicsScenarioView>;
  listEconomicsReconciliations(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<EconomicsReconciliationListView>;
  saveEconomicsReconciliation(
    analysisId: string,
    scope: CanonicalScope,
    input: {
      source_kind: "invoice" | "billing_export" | "manual";
      currency: string;
      observed_total_cost: number;
      source_reference?: string;
    },
    opts?: RequestOptions,
  ): Promise<EconomicsReconciliationView>;
  getPricingRegistryStatus(
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<PricingRegistryStatusView>;
  list(params: ListParams, opts?: RequestOptions): Promise<AnalysisListPage>;
  reprocess(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisHandle>;
  /** Alias contratual legado. Também cria nova Analysis; não reabre a anterior. */
  retry(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<AnalysisHandle>;
  /**
   * As Instances do workspace (BD02). Lista vazia é sucesso, não erro: workspace autorizado
   * ainda sem Instance nenhuma é estado legítimo, e o produtor devolve
   * `{"items": [], "next_cursor": null}`.
   */
  listInstances(
    params: InstanceListParams,
    opts?: RequestOptions,
  ): Promise<InstanceListPage>;
  /**
   * BD10 — o ponteiro de baseline da Instance.
   *
   * Sem régua, o produtor devolve **200** com as duas chaves `null`. Isso NÃO é 404: o recurso
   * pedido é *a configuração de baseline desta Instance*, e ela sempre existe — o que varia é o
   * VALOR. O 404 desta fronteira significa outra coisa (Instance inexistente ou de outro
   * workspace), e tratá-los igual faria o cliente confundir "não é sua" com "não tem".
   */
  getBaseline(
    instanceId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<BaselineView>;
  /**
   * Elege a Analysis como referência. Idempotente; a troca A→B é **atômica** — o cliente NUNCA
   * chama `clearBaseline` antes, porque isso abriria uma janela sem régua que o contrato não tem.
   *
   * Sem `Idempotency-Key`, e de propósito: o cabeçalho existe para tornar segura a repetição de
   * uma CRIAÇÃO não idempotente, e o `SET` é idempotente por natureza. Exigi-lo aqui sugeriria
   * que repetir sem ele é perigoso.
   */
  setBaseline(
    instanceId: string,
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<BaselineView>;
  /** Remove a régua. Idempotente: sem baseline, continua `NO_BASELINE` — e é 200. Nunca escolhe
   *  substituto e nunca alcança a Analysis. */
  clearBaseline(
    instanceId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<BaselineView>;
  /**
   * Uma Instance pela identidade durável.
   *
   * NÃO depende de `listInstances` ter sido chamada antes — é essa independência que sustenta
   * deep link, refresh e carga fria, em que a tela chega sabendo apenas o `instance_id`.
   * Instance de outro workspace e inexistente colapsam no mesmo `forbidden_or_not_found`; o
   * Front não distingue o que o contrato deliberadamente não distingue.
   */
  getInstance(
    instanceId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<InstanceView>;

  /**
   * Cria uma Instance no workspace do escopo.
   *
   * **Idempotente por `Idempotency-Key`**, e o Gateway a EXIGE: sem o cabeçalho ele responde
   * `invalid_input`. A chave é gerada por chamada; reenviar a mesma com o mesmo `name` devolve a
   * mesma Instance em vez de criar uma segunda, que é o que protege contra o duplo clique e
   * contra o retry de rede.
   *
   * **Não há unicidade de nome.** Duas Instances podem chamar-se "Produção" no mesmo workspace —
   * identidade é `instance_id`, e recusar o nome repetido inventaria uma regra que o contrato não
   * tem.
   */
  createInstance(
    scope: CanonicalScope,
    name: string,
    opts?: RequestOptions,
  ): Promise<InstanceView>;

  /**
   * M42 · CFG-04 — renomear a Instance. `name` é o ÚNICO atributo configurável dela na V1.
   *
   * `PATCH` e não `PUT`: a atualização é PARCIAL. O recurso tem identidade, carimbo e ponteiro de
   * baseline que esta operação não toca, e um `PUT` prometeria substituir o recurso inteiro.
   *
   * Não há sub-recurso `/rename` nem `/settings`: ele seria a casa esperando o próximo campo
   * entrar sem decisão. E **não existe unicidade** — renomear para um nome que já convive no
   * mesmo workspace é sucesso.
   */
  renameInstance(
    instanceId: string,
    scope: CanonicalScope,
    name: string,
    opts?: RequestOptions,
  ): Promise<InstanceView>;

  /**
   * O que o serviço entendeu do arquivo, e o que ele não conseguiu decidir sozinho.
   *
   * Só faz sentido quando a análise está em `needs_mapping` — antes do upload não há ingestão
   * vinculada, e o Gateway responde `forbidden_or_not_found` para essa ordem.
   */
  getAnalysisMapping(
    analysisId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<MappingView>;

  /**
   * Confirma o mapeamento. Depois disto a ingestão anda sozinha.
   *
   * **`confirmed_by` NÃO viaja daqui.** Quem confirmou é fato de autenticação, e o Gateway o
   * preenche com a identidade do chamador — mandá-lo do navegador deixaria o cliente assinar a
   * decisão com o nome de outra pessoa, num campo que vai para o manifesto da ingestão.
   *
   * `rules` mapeia campo canônico → coluna de origem. A fronteira pública aceita só `source`:
   * `transform` e `constant` existem no contrato interno e não têm superfície que os peça.
   */
  confirmAnalysisMapping(
    analysisId: string,
    scope: CanonicalScope,
    rules: Record<string, { source: string }>,
    /**
     * Por quais campos canônicos agrupar. Só os NOMES — a declaração inteira é constante por
     * campo e o Gateway a anexa.
     *
     * Lista vazia viaja de propósito: ela AFIRMA "ninguém quis agrupar", que é diferente de a
     * chave não existir. A Ingestão distingue os dois.
     */
    groupBy: string[],
    /**
     * Quantos registros invalidos o conjunto tolera antes de ser recusado inteiro, em [0,1].
     *
     * `undefined` omite o campo e mantem o comportamento anterior byte a byte: quem decide o
     * default e a Ingestao, e mandar o valor dela daqui criaria uma segunda fonte para a mesma
     * decisao.
     *
     * `1` significa "so aceito se 100% forem validos" — a regra estrita, que o Gateway traduz
     * de volta para a politica nomeada em vez de registrar como excecao tolerando zero perda.
     */
    minValidRatio: number | undefined,
    catalogOptOut?: {
      disabledMeasureIds: string[];
      disabledDimensionIds: string[];
    },
    outcome?: OutcomeMappingInput,
    modelUsage?: ModelUsageMappingInput,
    opts?: RequestOptions,
  ): Promise<MappingConfirmedView>;

  /**
   * M42 · CFG-03 — o Workspace, pela fronteira pública. **A autoridade do nome do espaço.**
   *
   * `workspace_id` viaja no CAMINHO e **não** na query: o recurso É o workspace, e pedi-lo duas
   * vezes abriria a porta para o caminho discordar do parâmetro. Ele também não é prova de
   * autorização — quem autoriza são as claims, antes de qualquer transporte.
   *
   * Esta é a leitura que vence a claim. `MeView.workspaces[].name` continua existindo como
   * projeção de bootstrap e pode ficar velho após um rename.
   */
  getWorkspace(
    workspaceId: string,
    opts?: RequestOptions,
  ): Promise<WorkspaceView>;

  /**
   * Cria um Workspace e torna quem pediu o dono dele.
   *
   * **A ÚNICA operação de recurso sem escopo de tenant**, e por definição: o espaço não existe
   * ainda, então não há `workspace_id` para mandar nem membership contra a qual autorizar. Usa
   * `enviar`, não `pedir` — `pedir` exige o escopo e recusaria a chamada localmente, que é o
   * comportamento certo dele e o errado para esta.
   *
   * O identificador **não** vai no corpo: ele nasce no Gateway, que é quem o correlaciona com a
   * concessão de acesso no provedor de identidade.
   *
   * ⚠️ **O token em mãos não enxerga o espaço recém-criado.** O acesso é gravado no provedor de
   * identidade, e a claim só entra num token novo — quem chamar precisa renovar a sessão antes de
   * navegar para dentro dele.
   */
  createWorkspace(name: string, opts?: RequestOptions): Promise<WorkspaceView>;

  /** M42 · CFG-03 — renomear. Corpo com UM campo; o Gateway recusa campo a mais. */
  renameWorkspace(
    workspaceId: string,
    name: string,
    opts?: RequestOptions,
  ): Promise<WorkspaceView>;

  // ── M44 · BD14 — a comunicação autorizada do Workspace ──────────────────────
  //
  // QUATRO operações, e só elas. O contrato vivo não publica `get_subscription`,
  // `update_subscription`, `verify_subscription` nem `enable_subscription`, e declarar aqui um
  // método que a fronteira não tem faria a tela nascer sabendo pedir o que ninguém atende.
  //
  // Todas levam `workspace_id` na QUERY — diferente de Workspace, onde ele é o caminho.

  /** As assinaturas DESTE workspace. Lista vazia é ausência legítima, nunca erro. */
  listSubscriptions(
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<SubscriptionListPage>;

  /** Cria. Ação EXPLÍCITA — nada aqui nasce de login nem de primeiro acesso. */
  createSubscription(
    scope: CanonicalScope,
    input: CreateSubscriptionInput,
    opts?: RequestOptions,
  ): Promise<SubscriptionSecretView>;

  /**
   * **Desativa.** O verbo HTTP é `DELETE` e a operação chama-se `disable_subscription`: o dono
   * marca `active = false` e a linha PERMANECE, porque o histórico de entregas a referencia.
   * Quem chamar isto esperando remoção vai encontrar a assinatura na próxima listagem.
   */
  disableSubscription(
    subscriptionId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<SubscriptionDisabledView>;

  /** Novo segredo, versão +1, **mesma identidade**. Não é apagar e recriar. */
  rotateSubscriptionSecret(
    subscriptionId: string,
    scope: CanonicalScope,
    opts?: RequestOptions,
  ): Promise<SubscriptionSecretView>;
}


