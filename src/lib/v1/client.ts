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
  AnalyticsQueryResultView,
  SavedAnalyticsView,
  SavedAnalyticsViewList,
  AnalysisExportDownloadView,
  AnalysisProgressView,
  AnalysisResultView,
  AnalysisStatusView,
  AnalysisTimelineView,
  InstanceListPage,
  BaselineView,
  InstanceView,
  WorkspaceView,
  MeView,
  LanguagePreferenceView,
  SubscriptionDisabledView,
  SubscriptionListPage,
  SubscriptionSecretView,
  RenameAnalysisView,
  DeleteAnalysisView,
  AnalysisContextView,
  ContextSuggestionView,
  ReviewArtifactView,
  ReviewRequestView,
  AskConversationView,
  AskTurnView,
  ReviewActionListView,
  ReviewActionRecordView,
  ReviewFeedbackView,
  SavedEconomicsScenarioView,
  SavedEconomicsScenarioListView,
  EconomicsReconciliationView,
  EconomicsReconciliationListView,
  PricingRegistryStatusView,
  LongitudinalComparisonView,
} from "./contract/public-v1.types";
import {
  normalizeProblem,
  PROBLEM_MEDIA_TYPE,
  ProblemError,
  TransportError,
} from "./problem";
import type { V1Client } from "./client.types";
export type { V1Client } from "./client.types";

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
    getAskConversation: (analysisId, scope, opts) =>
      pedir<AskConversationView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/ask`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    askAnalysis: (analysisId, scope, input, opts) =>
      pedir<AskTurnView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/ask`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify(input), contentType: "application/json" },
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
    getReviewFeedback: (analysisId, scope, opts) =>
      pedir<ReviewFeedbackView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/review/feedback`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    submitReviewFeedback: (analysisId, scope, input, opts) =>
      pedir<ReviewFeedbackView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/review/feedback`,
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
    listAnalyticsViews: (analysisId, scope, opts) =>
      pedir<SavedAnalyticsViewList>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/analytics/views`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    getAnalyticsView: (analysisId, viewId, scope, opts) =>
      pedir<SavedAnalyticsView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/analytics/views/${encodeURIComponent(viewId)}`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    saveAnalyticsView: (analysisId, scope, name, query, opts) =>
      pedir<SavedAnalyticsView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/analytics/views`,
        { workspace_id: scope.workspaceId },
        opts,
        {
          body: JSON.stringify({ name, query }),
          contentType: "application/json",
        },
      ),
    exportAnalyticsView: (analysisId, viewId, scope, opts) =>
      baixar(
        `/v1/analyses/${encodeAnalysisId(analysisId)}/analytics/views/${encodeURIComponent(viewId)}/export`,
        { workspace_id: scope.workspaceId },
        opts,
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
    getLongitudinalComparison: (currentAnalysisId, baselineAnalysisId, scope, opts) =>
      pedir<LongitudinalComparisonView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(currentAnalysisId)}/longitudinal-comparison`,
        {
          workspace_id: scope.workspaceId,
          baseline_analysis_id: baselineAnalysisId,
        },
        opts,
      ),
    listEconomicsScenarios: (analysisId, scope, opts) =>
      pedir<SavedEconomicsScenarioListView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/economics/scenarios`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    saveEconomicsScenario: (analysisId, scope, input, opts) =>
      pedir<SavedEconomicsScenarioView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/economics/scenarios`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify(input), contentType: "application/json" },
      ),
    listEconomicsReconciliations: (analysisId, scope, opts) =>
      pedir<EconomicsReconciliationListView>(
        "GET",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/economics/reconciliations`,
        { workspace_id: scope.workspaceId },
        opts,
      ),
    saveEconomicsReconciliation: (analysisId, scope, input, opts) =>
      pedir<EconomicsReconciliationView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/economics/reconciliations`,
        { workspace_id: scope.workspaceId },
        opts,
        { body: JSON.stringify(input), contentType: "application/json" },
      ),
    getPricingRegistryStatus: (scope, opts) =>
      pedir<PricingRegistryStatusView>(
        "GET",
        "/v1/economics/pricing/status",
        { workspace_id: scope.workspaceId },
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
          query: params.query,
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
      outcome,
      modelUsage,
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
            ...(outcome === undefined ? {} : { outcome }),
            ...(modelUsage === undefined ? {} : { model_usage: modelUsage }),
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
