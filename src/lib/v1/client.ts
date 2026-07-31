// Cliente HTTP CANÔNICO da API pública `/v1/analyses` (Onda 6 E1).
//
// Fronteira canônica PARALELA ao cliente legado (`lib/api.ts`) — NÃO migra telas nesta etapa.
// Só conhece o contrato público. PROIBIDO: `/internal`, Worker/Engine, MinIO/Redis/Supabase,
// endpoints legados de análise, `tenant_id` livre, fallback multi-base. `capacity_wait` e
// `temporarily_unavailable` são ESTADO/indisponibilidade — nunca autorização para trocar de base.

import type {
  AnalysisHandle,
  AnalysisListPage,
  AnalysisResultView,
  AnalysisStatusView,
  CanonicalScope,
  ListParams,
} from "./contract/public-v1.types";
import { normalizeProblem, PROBLEM_MEDIA_TYPE, ProblemError } from "./problem";

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
  /** Chave de idempotência escolhida pelo chamador (prepare/submit/retry). Se ausente, o cliente
   *  gera uma — mas a MESMA chave deve ser reusada num retry de rede para não duplicar. */
  idempotencyKey?: string;
}

/** Fronteira pública tipada — as 7 operações canônicas. */
export interface V1Client {
  prepare(scope: CanonicalScope, opts?: RequestOptions): Promise<AnalysisHandle>;
  uploadData(analysisId: string, scope: CanonicalScope, body: BodyInit, opts?: RequestOptions): Promise<AnalysisStatusView>;
  submit(analysisId: string, scope: CanonicalScope, opts?: RequestOptions): Promise<AnalysisHandle>;
  getStatus(analysisId: string, scope: CanonicalScope, opts?: RequestOptions): Promise<AnalysisStatusView>;
  getResult(analysisId: string, scope: CanonicalScope, opts?: RequestOptions): Promise<AnalysisResultView>;
  list(params: ListParams, opts?: RequestOptions): Promise<AnalysisListPage>;
  retry(analysisId: string, scope: CanonicalScope, opts?: RequestOptions): Promise<AnalysisHandle>;
}

const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.abs(Date.now())}-${Math.floor(Math.abs(Date.now() * 1.7) % 1e9)}`;

function encodeAnalysisId(id: string): string {
  if (!id || typeof id !== "string") throw new ProblemError(normalizeProblem({ code: "invalid_input" }, 400, uuid()));
  return encodeURIComponent(id);
}

export function createV1Client(config: V1ClientConfig): V1Client {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  const newCorr = config.newCorrelationId ?? uuid;
  const newIdem = config.newIdempotencyKey ?? uuid;
  const base = config.baseUrl.replace(/\/+$/, "");

  const MALFORMADO = Symbol("malformado");
  async function corpoJsonSeguro(resposta: Response): Promise<unknown> {
    try {
      return await resposta.json();
    } catch {
      return MALFORMADO;
    }
  }

  async function pedir<T>(
    metodo: string,
    caminho: string,
    query: Record<string, string | number | undefined | null>,
    opts: RequestOptions | undefined,
    corpo?: { body: BodyInit; contentType?: string },
    idempotente?: boolean,
  ): Promise<T> {
    const correlationId = newCorr();
    // 1) auth ANTES da rede: sem token → authentication_required (não vaza, não chama fetch)
    const token = await config.getAccessToken();
    if (!token) {
      throw new ProblemError(normalizeProblem({ code: "authentication_required" }, 401, correlationId));
    }
    // 2) URL + query (workspace_id é a autoridade de tenant; nunca `tenant_id`)
    const url = new URL(`${base}${caminho}`);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    // 3) headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: `application/json, ${PROBLEM_MEDIA_TYPE}`,
      "X-Correlation-Id": correlationId,
    };
    if (idempotente) headers["Idempotency-Key"] = opts?.idempotencyKey ?? newIdem();
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
      if (erro instanceof DOMException && erro.name === "AbortError") throw erro; // cancelamento propaga
      throw new ProblemError(normalizeProblem({ code: "temporarily_unavailable" }, 503, correlationId));
    }

    // 5) parsing seguro + validação de content-type
    const ct = resposta.headers.get("content-type") ?? "";
    const ehJson = /application\/(problem\+)?json/i.test(ct);

    if (!resposta.ok) {
      // erro: se JSON, normaliza o corpo; senão, deriva o código do status (não confia no corpo)
      const corpoErro = ehJson ? await corpoJsonSeguro(resposta) : {};
      throw new ProblemError(normalizeProblem(corpoErro, resposta.status, correlationId));
    }
    // sucesso: 204 = vazio; senão EXIGE JSON válido — 200 não-JSON quebra o contrato → transitório
    if (resposta.status === 204) return {} as T;
    if (!ehJson) {
      throw new ProblemError(normalizeProblem({ code: "temporarily_unavailable" }, 503, correlationId));
    }
    const dados = await corpoJsonSeguro(resposta);
    if (dados === MALFORMADO) {
      throw new ProblemError(normalizeProblem({ code: "temporarily_unavailable" }, 503, correlationId));
    }
    return dados as T;
  }

  return {
    prepare: (scope, opts) =>
      pedir<AnalysisHandle>("POST", "/v1/analyses", { workspace_id: scope.workspaceId }, opts, undefined, true),
    uploadData: (analysisId, scope, body, opts) =>
      pedir<AnalysisStatusView>(
        "POST",
        `/v1/analyses/${encodeAnalysisId(analysisId)}/data`,
        { workspace_id: scope.workspaceId },
        opts,
        { body, contentType: "application/x-ndjson" },
      ),
    submit: (analysisId, scope, opts) =>
      pedir<AnalysisHandle>("POST", `/v1/analyses/${encodeAnalysisId(analysisId)}/submit`, { workspace_id: scope.workspaceId }, opts, undefined, true),
    getStatus: (analysisId, scope, opts) =>
      pedir<AnalysisStatusView>("GET", `/v1/analyses/${encodeAnalysisId(analysisId)}`, { workspace_id: scope.workspaceId }, opts),
    getResult: (analysisId, scope, opts) =>
      pedir<AnalysisResultView>("GET", `/v1/analyses/${encodeAnalysisId(analysisId)}/result`, { workspace_id: scope.workspaceId }, opts),
    list: (params, opts) =>
      pedir<AnalysisListPage>("GET", "/v1/analyses", { workspace_id: params.workspaceId, limit: params.limit, cursor: params.cursor }, opts),
    retry: (analysisId, scope, opts) =>
      pedir<AnalysisHandle>("POST", `/v1/analyses/${encodeAnalysisId(analysisId)}/retry`, { workspace_id: scope.workspaceId }, opts, undefined, true),
  };
}
