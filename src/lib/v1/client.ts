// Cliente HTTP CANÔNICO da API pública `/v1/analyses` (Onda 6 E1).
//
// Fronteira canônica PARALELA ao cliente legado (`lib/api.ts`) — NÃO migra telas nesta etapa.
// Só conhece o contrato público. PROIBIDO: `/internal`, Worker/Engine, MinIO/Redis/Supabase,
// endpoints legados de análise, `tenant_id` livre, fallback multi-base. `capacity_wait` e
// `temporarily_unavailable` são ESTADO/indisponibilidade — nunca autorização para trocar de base.

import type {
  MappingConfirmedView,
  MappingView,
  AnalysisHandle,
  AnalysisListPage,
  AnalysisAnalyticsView,
  AnalyticsQueryInput,
  AnalyticsQueryResultView,
  AnalysisExportDownloadView,
  AnalysisProgressView,
  AnalysisResultView,
  AnalysisStatusView,
  AnalysisTimelineView,
  CanonicalScope,
  PrepareParams,
  InstanceListPage,
  BaselineView,
  InstanceListParams,
  InstanceView,
  WorkspaceView,
  ListParams,
  MeView,
  EffectiveLanguage,
  LanguagePreferenceView,
  CreateSubscriptionInput,
  SubscriptionDisabledView,
  SubscriptionListPage,
  SubscriptionSecretView,
  RenameAnalysisView,
  DeleteAnalysisView,
  AnalysisContextView,
  ContextDraftInput,
  ContextSuggestionView,
  ReviewArtifactView,
  ReviewRequestView,
  ReviewActionListView,
  ReviewActionRecordView,
  AcceptReviewActionInput,
  TransitionReviewActionInput,
} from "./contract/public-v1.types";
import {
  normalizeProblem,
  PROBLEM_MEDIA_TYPE,
  ProblemError,
  TransportError,
} from "./problem";

export interface V1ClientConfig {
  /** Base URL do Gateway (ex.: VITE_SENTINELA_API_URL). SEM fallback para outra base. */
  baseUrl: string;
  /** Token do contexto autenticado. `null` → authentication_required (sem chamar a rede). */
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  newCorrelationId?: () => string;
  newIdempotencyKey?: () => string;
}

export interface RequestOptions {
  signal?: AbortSignal;
  /** Chave de idempotência escolhida pelo chamador (prepare/submit/reprocess). Se ausente, o cliente
   *  gera uma — mas a MESMA chave deve ser reusada num retry de rede para não duplicar. */
  idempotencyKey?: string;
}

export interface UploadAbertoView {
  analysis_id: string;
  status: "receiving";
  upload_session_id: string;
  part_size_bytes: number;
  uploaded_parts?: Array<{ part_number: number; etag: string }>;
}

export interface UploadParteView {
  analysis_id: string;
  upload_session_id: string;
  part_number: number;
  etag: string;
}

/** Fronteira pública tipada — identidade + as 7 operações canônicas. */
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
  queryAnalytics(
    analysisId: string,
    scope: CanonicalScope,
    query: AnalyticsQueryInput,
    opts?: RequestOptions,
  ): Promise<AnalyticsQueryResultView>;
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

/**
 * Gera um id (correlation / Idempotency-Key). O fallback SEM `crypto.randomUUID` usa aleatoriedade
 * REAL (getRandomValues, senão Math.random): dois ids no MESMO milissegundo NÃO podem colidir —
 * chaves iguais colapsariam operações idempotentes distintas. `cripto` é injetável p/ teste do
 * fallback. (Codex E1 R4.)
 */
export function novoId(
  cripto: Crypto | undefined = typeof crypto !== "undefined"
    ? crypto
    : undefined,
): string {
  // O tipo `Crypto` da lib GARANTE randomUUID; na realidade de runtime (browsers antigos) ele pode
  // faltar. Modelamos como opcional p/ não colapsar o ramo getRandomValues em `never`.
  const c = cripto as
    | {
        randomUUID?: () => string;
        getRandomValues?: (a: Uint8Array) => Uint8Array;
      }
    | undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // último recurso (sem Web Crypto): 2 sorteios independentes + tempo → sem colisão no mesmo ms
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

function encodeAnalysisId(id: string): string {
  if (!id || typeof id !== "string")
    throw new ProblemError(
      normalizeProblem({ code: "invalid_input" }, 400, novoId()),
    );
  return encodeURIComponent(id);
}

export function createV1Client(config: V1ClientConfig): V1Client {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  const newCorr = config.newCorrelationId ?? novoId;
  const newIdem = config.newIdempotencyKey ?? novoId;
  const base = config.baseUrl.replace(/\/+$/, "");
  // A base pode ser ABSOLUTA (https://gw…) ou RELATIVA same-origin (ex.: "/api", como o cliente
  // legado suporta atrás de um proxy). `new URL("/api/v1/…")` sem origem lança TypeError; passar
  // uma origem de fallback resolve a relativa E é IGNORADA quando a base já é absoluta.
  const origemFallback =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : "http://localhost";

  const MALFORMADO = Symbol("malformado");
  async function corpoJsonSeguro(resposta: Response): Promise<unknown> {
    try {
      return await resposta.json();
    } catch {
      return MALFORMADO;
    }
  }

  /**
   * Transporte comum: auth, correlação, URL, fetch e normalização de erro.
   *
   * NÃO exige tenant — e não pode exigir. `/v1/me` é justamente a chamada que descobre a QUAIS
   * workspaces o usuário pertence; pedir `workspace_id` nela seria exigir a resposta como
   * pergunta. A precondição de tenant vive em `pedir`, uma camada acima, sem flag de bypass.
   */
  async function enviar<T>(
    metodo: string,
    caminho: string,
    query: Record<string, string | number | undefined | null>,
    opts: RequestOptions | undefined,
    corpo?: { body: BodyInit; contentType?: string },
    idempotente?: boolean,
    correlacao?: string,
  ): Promise<T> {
    const correlationId = correlacao ?? newCorr();
    // 1) auth ANTES da rede: sem token → authentication_required (não vaza, não chama fetch)
    const token = await config.getAccessToken();
    if (!token) {
      throw new ProblemError(
        normalizeProblem(
          { code: "authentication_required" },
          401,
          correlationId,
        ),
      );
    }
    // 2) URL + query (workspace_id é a autoridade de tenant; nunca `tenant_id`)
    const url = new URL(`${base}${caminho}`, origemFallback);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "")
        url.searchParams.set(k, String(v));
    }
    // 3) headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: `application/json, ${PROBLEM_MEDIA_TYPE}`,
      "X-Correlation-Id": correlationId,
    };
    if (idempotente)
      headers["Idempotency-Key"] = opts?.idempotencyKey ?? newIdem();
    if (corpo?.contentType) headers["Content-Type"] = corpo.contentType;

    // 4) fetch — SEM fallback de base. Erro de rede → temporarily_unavailable (seguro).
    let resposta: Response;
    try {
      resposta = await fetchImpl(url.toString(), {
        method: metodo,
        headers,
        body: corpo?.body,
        signal: opts?.signal,
      });
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError")
        throw erro; // cancelamento propaga
      // TRANSPORTE: não houve resposta. Mesmo código público, subclasse distinta — a superfície
      // precisa poder dizer "não sabemos se chegou" em vez de "o serviço está indisponível".
      throw new TransportError(
        normalizeProblem(
          { code: "temporarily_unavailable" },
          503,
          correlationId,
        ),
      );
    }

    // 5) parsing seguro + validação de content-type
    const ct = resposta.headers.get("content-type") ?? "";
    const ehJson = /application\/(problem\+)?json/i.test(ct);

    if (!resposta.ok) {
      // erro: se JSON, normaliza o corpo; senão, deriva o código do status (não confia no corpo)
      const corpoErro = ehJson ? await corpoJsonSeguro(resposta) : {};
      throw new ProblemError(
        normalizeProblem(corpoErro, resposta.status, correlationId),
      );
    }
    // sucesso: 204 = vazio; senão EXIGE JSON válido — 200 não-JSON quebra o contrato → transitório
    if (resposta.status === 204) return {} as T;
    if (!ehJson) {
      throw new ProblemError(
        normalizeProblem(
          { code: "temporarily_unavailable" },
          503,
          correlationId,
        ),
      );
    }
    const dados = await corpoJsonSeguro(resposta);
    if (dados === MALFORMADO) {
      throw new ProblemError(
        normalizeProblem(
          { code: "temporarily_unavailable" },
          503,
          correlationId,
        ),
      );
    }
    return dados as T;
  }

  /**
   * Operações de ANÁLISE: exigem tenant. A precondição é incondicional — sem parâmetro de
   * bypass, porque um booleano `exigeWorkspace` acabaria passado por engano algum dia.
   */
  async function pedir<T>(
    metodo: string,
    caminho: string,
    query: Record<string, string | number | undefined | null>,
    opts: RequestOptions | undefined,
    corpo?: { body: BodyInit; contentType?: string },
    idempotente?: boolean,
  ): Promise<T> {
    const correlationId = newCorr();
    // precondição de TENANT: workspace_id é OBRIGATÓRIO e não-vazio. Como o loop de query
    // descarta valores vazios (correto p/ opcionais como cursor/limit), um workspaceId ""
    // (estado transitório "workspace não carregado") sairia SEM escopo de tenant. Fail-closed:
    // invalid_input local, SEM tocar a rede — nunca uma requisição canônica sem workspace.
    const ws = query.workspace_id;
    if (typeof ws !== "string" || ws.trim() === "") {
      throw new ProblemError(
        normalizeProblem({ code: "invalid_input" }, 400, correlationId),
      );
    }
    return enviar<T>(
      metodo,
      caminho,
      query,
      opts,
      corpo,
      idempotente,
      correlationId,
    );
  }

  async function baixar(
    caminho: string,
    query: Record<string, string | undefined>,
    opts?: RequestOptions,
  ): Promise<Blob> {
    const correlationId = newCorr();
    const ws = query.workspace_id;
    if (!ws?.trim())
      throw new ProblemError(normalizeProblem({ code: "invalid_input" }, 400, correlationId));
    const token = await config.getAccessToken();
    if (!token)
      throw new ProblemError(normalizeProblem({ code: "authentication_required" }, 401, correlationId));
    const url = new URL(`${base}${caminho}`, origemFallback);
    Object.entries(query).forEach(([key, value]) => value && url.searchParams.set(key, value));
    const response = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "X-Correlation-Id": correlationId },
      signal: opts?.signal,
    });
    if (!response.ok)
      throw new ProblemError(normalizeProblem({}, response.status, correlationId));
    return response.blob();
  }

  return {
    /**
     * Projeção da sessão: quem sou eu e a que workspaces pertenço. Fonte ÚNICA dessa verdade —
     * o frontend não mantém lista autoritativa de membership nem a deriva de dado local antigo.
     */
    me: (opts) => enviar<MeView>("GET", "/v1/me", {}, opts),
    meLanguage: (opts) =>
      enviar<LanguagePreferenceView>("GET", "/v1/me/language", {}, opts),
    setMeLanguage: (language, opts) =>
      // Corpo com UM campo. `user_subject` não viaja: quem determina o usuário é o contexto
      // autenticado, e o Gateway recusa corpo com campo a mais.
      enviar<LanguagePreferenceView>("PUT", "/v1/me/language", {}, opts, {
        body: JSON.stringify({ language }),
        contentType: "application/json",
      }),
    prepare: (params, opts) =>
      pedir<AnalysisHandle>(
        "POST",
        "/v1/analyses",
        {
          workspace_id: params.workspaceId,
          // M37: mesmo mecanismo do filtro da listagem — o loop de query descarta vazios, então
          // omitir mantém a requisição da jornada geral byte a byte igual à de antes.
          instance_id: params.instanceId,
        },
        opts,
        undefined,
        true,
      ),
    uploadData: (analysisId, scope, body, opts) =>
      pedir<AnalysisStatusView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/data`,
        { workspace_id: scope.workspaceId },
        opts,
        { body, contentType: "application/x-ndjson" },
      ),
    openDataUpload: (analysisId, scope, opts) =>
      pedir<UploadAbertoView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/data/uploads`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    uploadDataPart: (
      analysisId,
      scope,
      uploadSessionId,
      partNumber,
      body,
      opts,
    ) =>
      pedir<UploadParteView>(
        "PUT",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/data/uploads/${encodeURIComponent(uploadSessionId)}/parts/${partNumber}`,
        { workspace_id: scope.workspaceId },
        opts,
        { body, contentType: "application/octet-stream" },
      ),
    completeDataUpload: (analysisId, scope, uploadSessionId, parts, opts) =>
      pedir<AnalysisStatusView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/data/uploads/${encodeURIComponent(uploadSessionId)}/complete`,
        { workspace_id: scope.workspaceId },
        opts,
        {
          body: JSON.stringify({ parts }),
          contentType: "application/json",
        },
      ),
    submit: (analysisId, scope, opts) =>
      pedir<AnalysisHandle>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/submit`,
        { workspace_id: scope.workspaceId },
        opts,
        undefined,
        true,
      ),
    getStatus: (analysisId, scope, opts) =>
      pedir<AnalysisStatusView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    renameAnalysis: (analysisId, scope, name, opts) =>
      pedir<RenameAnalysisView>(
        "PATCH",
        `/v1/analyses/${encodeAnalysisId(analysisId)}`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify({ name }), contentType: "application/json" },
      ),
    deleteFailedAnalysis: (analysisId, scope, opts) =>
      pedir<DeleteAnalysisView>(
        "DELETE",
        `/v1/analyses/${encodeAnalysisId(analysisId)}`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getAnalytics: (analysisId, scope, opts) =>
      pedir<AnalysisAnalyticsView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/analytics`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getAnalysisContext: (analysisId, scope, opts) =>
      pedir<AnalysisContextView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/context`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    putAnalysisContext: (analysisId, scope, input, opts) =>
      pedir<AnalysisContextView>(
        "PUT",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/context`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify(input), contentType: "application/json" },
      ),
    suggestAnalysisContext: (analysisId, scope, opts) =>
      pedir<ContextSuggestionView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/context/suggestions`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    sealAnalysisContext: (analysisId, scope, opts) =>
      pedir<AnalysisContextView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/context/seal`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getReview: (analysisId, scope, opts) =>
      pedir<ReviewArtifactView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/review`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    requestReview: (analysisId, scope, language, opts) =>
      pedir<ReviewRequestView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/review`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify({ language }), contentType: "application/json" },
      ),
    downloadReview: (analysisId, scope, opts) =>
      baixar(
        `/v1/analyses/${encodeAnalysisId(analysisId)}/review/export.xlsx`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getReviewActions: (analysisId, scope, opts) =>
      pedir<ReviewActionListView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/review/actions`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    acceptReviewAction: (analysisId, scope, input, opts) =>
      pedir<ReviewActionRecordView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/review/actions`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify(input), contentType: "application/json" },
      ),
    transitionReviewAction: (analysisId, actionRecordId, scope, input, opts) =>
      pedir<ReviewActionRecordView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/review/actions/${encodeURIComponent(actionRecordId)}/transition`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify(input), contentType: "application/json" },
      ),
    queryAnalytics: (analysisId, scope, query, opts) =>
      pedir<AnalyticsQueryResultView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/analytics/query`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify(query), contentType: "application/json" },
      ),
    getProgress: (analysisId, scope, opts) =>
      pedir<AnalysisProgressView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/progress`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getExportDownload: (analysisId, scope, opts) =>
      pedir<AnalysisExportDownloadView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/analytics/export/download`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getTimeline: (analysisId, scope, opts) =>
      pedir<AnalysisTimelineView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/timeline`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getResult: (analysisId, scope, opts, resultSchemaVersion) =>
      pedir<AnalysisResultView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/result`,
        {
          workspace_id: scope.workspaceId,
          // Só viaja quando pedido. Mandar sempre — ainda que com o valor histórico — faria o
          // CLIENTE escolher a versão em nome de quem não escolheu, que é exatamente o que a
          // decisão de negociação elimina.
          result_schema_version: resultSchemaVersion,
        },
        opts,
      ),
    list: (params, opts) =>
      pedir<AnalysisListPage>(
        "GET",
        "/v1/analyses",
        {
          workspace_id: params.workspaceId,
          limit: params.limit,
          cursor: params.cursor,
          // BD02: só viaja quando informado. O loop de query descarta vazios, então omitir mantém
          // a requisição byte a byte igual à de antes — consumidor da listagem geral não muda.
          instance_id: params.instanceId,
          // BD10: idem, e por isso `true` vira a string e `false` some. Mandar `false` sempre
          // poluiria a query de toda listagem com uma opção que ninguém escolheu.
          baseline_eligible: params.baselineEligible ? "true" : undefined,
        },
        opts,
      ),
    reprocess: (analysisId, scope, opts) =>
      pedir<AnalysisHandle>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/reprocess`,
        { workspace_id: scope.workspaceId },
        opts,
        undefined,
        true,
      ),
    retry: (analysisId, scope, opts) =>
      pedir<AnalysisHandle>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/retry`,
        { workspace_id: scope.workspaceId },
        opts,
        undefined,
        true,
      ),
    listInstances: (params, opts) =>
      pedir<InstanceListPage>(
        "GET",
        "/v1/instances",
        {
          workspace_id: params.workspaceId,
          limit: params.limit,
          cursor: params.cursor,
        },
        opts,
      ),
    getInstance: (instanceId, scope, opts) =>
      // `encodeAnalysisId` é o encoder de segmento de path deste arquivo — o nome é herança de
      // quando só havia análise. Reusá-lo é o certo: um segundo encoder divergiria no primeiro
      // caractere especial, e o nome é dívida de harness, não motivo para duplicar.
      pedir<InstanceView>(
        "GET",
        `/v1/instances/${encodeAnalysisId(instanceId)}`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getAnalysisMapping: (analysisId, scope, opts) =>
      pedir<MappingView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/mapping`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    confirmAnalysisMapping: (
      analysisId,
      scope,
      rules,
      groupBy,
      minValidRatio,
      catalogOptOut,
      opts,
    ) =>
      pedir<MappingConfirmedView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/mapping`,
        { workspace_id: scope.workspaceId },
        opts,
        {
          // A chave SO existe quando ha escolha. `min_valid_ratio: null` seria uma terceira
          // coisa para o Gateway distinguir, e omitir e o que preserva o comportamento de quem
          // nunca escolheu.
          body: JSON.stringify({
            rules,
            group_by: groupBy,
            ...(catalogOptOut === undefined
              ? {}
              : {
                  disabled_catalog_measure_ids:
                    catalogOptOut.disabledMeasureIds,
                  disabled_catalog_dimension_ids:
                    catalogOptOut.disabledDimensionIds,
                }),
            ...(minValidRatio === undefined
              ? {}
              : { min_valid_ratio: minValidRatio }),
          }),
          contentType: "application/json",
        },
      ),
    createInstance: (scope, name, opts) =>
      pedir<InstanceView>(
        "POST",
        "/v1/instances",
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify({ name }), contentType: "application/json" },
        // `true` liga o `Idempotency-Key`. O Gateway o EXIGE nesta rota — sem ele a resposta é
        // `invalid_input`, e o botão falharia sempre em vez de nunca.
        true,
      ),
    renameInstance: (instanceId, scope, name, opts) =>
      pedir<InstanceView>(
        "PATCH",
        `/v1/instances/${encodeAnalysisId(instanceId)}`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify({ name }), contentType: "application/json" },
      ),
    // `enviar` e não `pedir`: `get_workspace`/`rename_workspace` são as ÚNICAS operações de
    // recurso sem `workspace_id` na query — ele já é o caminho. `pedir` exige o escopo e
    // recusaria a chamada localmente, que é o comportamento certo dele e o errado para estas duas.
    getWorkspace: (workspaceId, opts) =>
      enviar<WorkspaceView>(
        "GET",
        `/v1/workspaces/${encodeAnalysisId(workspaceId)}`,
        {},
        opts,
      ),
    createWorkspace: (name, opts) =>
      enviar<WorkspaceView>("POST", "/v1/workspaces", {}, opts, {
        body: JSON.stringify({ name }),
        contentType: "application/json",
      }),
    renameWorkspace: (workspaceId, name, opts) =>
      enviar<WorkspaceView>(
        "PATCH",
        `/v1/workspaces/${encodeAnalysisId(workspaceId)}`,
        {},
        opts,
        {
          body: JSON.stringify({ name }),
          contentType: "application/json",
        },
      ),
    // M44 · BD14. `pedir` porque as quatro exigem `workspace_id` na QUERY — e é ele que o dono
    // usa no `where`, então omiti-lo não é economia: é pedir a assinatura de outro escopo.
    listSubscriptions: (scope, opts) =>
      pedir<SubscriptionListPage>(
        "GET",
        "/v1/subscriptions",
        { workspace_id: scope.workspaceId },
        opts,
      ),
    createSubscription: (scope, input, opts) =>
      pedir<SubscriptionSecretView>(
        "POST",
        "/v1/subscriptions",
        { workspace_id: scope.workspaceId },
        opts,
        {
          // O corpo carrega SÓ os quatro campos publicados. `workspace_id` fica de fora de
          // propósito: o Gateway o recusa (`extra="forbid"`), e mandá-lo abriria a porta para o
          // corpo discordar do escopo que já foi autorizado.
          body: JSON.stringify({
            channel: input.channel,
            destination: input.destination,
            event_types: input.event_types,
            language: input.language,
          }),
          contentType: "application/json",
        },
      ),
    disableSubscription: (subscriptionId, scope, opts) =>
      pedir<SubscriptionDisabledView>(
        "DELETE",
        `/v1/subscriptions/${encodeAnalysisId(subscriptionId)}`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    rotateSubscriptionSecret: (subscriptionId, scope, opts) =>
      pedir<SubscriptionSecretView>(
        "POST",
        `/v1/subscriptions/${encodeAnalysisId(subscriptionId)}/secret`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getBaseline: (instanceId, scope, opts) =>
      pedir<BaselineView>(
        "GET",
        `/v1/instances/${encodeAnalysisId(instanceId)}/baseline`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    setBaseline: (instanceId, analysisId, scope, opts) =>
      pedir<BaselineView>(
        "POST",
        `/v1/instances/${encodeAnalysisId(instanceId)}/baseline`,
        { workspace_id: scope.workspaceId },
        opts,
        // A identidade viaja no CORPO, que é onde o Gateway real a lê. Mandá-la na query
        // funcionaria contra um mock permissivo e falharia contra o produtor.
        {
          body: JSON.stringify({ baseline_analysis_id: analysisId }),
          contentType: "application/json",
        },
      ),
    clearBaseline: (instanceId, scope, opts) =>
      pedir<BaselineView>(
        "DELETE",
        `/v1/instances/${encodeAnalysisId(instanceId)}/baseline`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
  };
}
