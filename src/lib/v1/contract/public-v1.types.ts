// Contrato PÚBLICO `public-v1` — fonte ÚNICA de tipos da jornada canônica (Onda 6 E1).
//
// ORIGEM (não redefinir manualmente em outro lugar):
//   repo `sentinela` · docs/contracts/public-v1.json + public-v1.types.ts
//   (o gate `test/v1/contract-sync.test.ts` prova que esta copia nao derivou da origem)
//   versão do contrato: "public-v1" (congelado na Onda 5.5).
//
// Esta camada conhece SOMENTE conceitos públicos. É PROIBIDO qualquer tipo aqui conter
// job_stage / job_id interno / engine / worker / assignment / attempt / lease /
// execution_profile / presigned / upload_id / object key / minio / redis.
// (O cadeado `test/v1/canonical-boundary.test.ts` reprova se algum aparecer.)

/** Versão do contrato público que esta camada implementa. */
export const PUBLIC_CONTRACT_VERSION = "public-v1" as const;

/** Estado PÚBLICO estável de uma análise. Sem progresso % (fica para a Onda 7). */
export type AnalysisStatus =
  | "preparing" // reservada / recebendo-preparo antes da fila
  | "receiving" // recebendo a base (upload em andamento)
  | "queued" // submetida, aguardando execução
  | "running" // em execução
  | "recovering" // re-enfileirada após uma tentativa (retomando)
  | "completed" // resultado disponível
  | "failed"; // falha terminal (ver retry_allowed para recuperabilidade)

export const PUBLIC_STATES: readonly AnalysisStatus[] = [
  "preparing",
  "receiving",
  "queued",
  "running",
  "recovering",
  "completed",
  "failed",
] as const;

/** Projeção pública de leitura de status (GET /v1/analyses/{id}). */
export interface AnalysisStatusView {
  analysis_id: string;
  status: AnalysisStatus;
  record_count: number | null;
  result_available: boolean;
  retry_allowed: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Item de listagem (GET /v1/analyses). */
export interface AnalysisListItem {
  analysis_id: string;
  status: AnalysisStatus;
  record_count: number | null;
  result_available: boolean;
  created_at: string | null;
  /**
   * Resumo analítico materializado pelo backend na MESMA query (sem N+1, sem cálculo aqui).
   *
   * `null` significa **ausente**, nunca zero: análise sem resultado, indicador com
   * `state != "measured"`, ou documento malformado. Renderizar `0` ou `"—"` como se fosse
   * medição transformaria não-medição em fato.
   *
   * Os campos legados `risk_level` e `n_intents` NÃO estão aqui porque não existem no modelo
   * canônico — não há indicador de risco nem contagem de intents. Publicá-los exigiria
   * inventá-los.
   *
   * `engine_version` SAIU (achado de review cruzado, Alta). Este mesmo arquivo declara,
   * 20 linhas abaixo, que o cliente NUNCA vê Engine — e declarava o campo assim mesmo. O
   * contrato congelado o lista em `nunca_publicos` desde a Onda 5.5; o backend o devolvia
   * na listagem e a tela de histórico o renderizava com o rótulo "Engine".
   *
   * O invariante estava certo e o código errado. Quem some é o campo.
   */
  observed_conversations?: number | null;
}

/** Página de listagem por cursor determinístico. */
export interface AnalysisListPage {
  items: AnalysisListItem[];
  next_cursor: string | null;
}

/** Resultado canônico (GET /v1/analyses/{id}/result) — só do Result Store.
 *
 *  `result` é um documento `analysis-result-v1`, montado pelo Orchestrator com o
 *  `sentinela-result-assembler`. Deixou de ser `unknown`; o tipo do documento vive em
 *  `features/canonical-analysis/result/canonicalSchema.ts`, e aqui ele fica opaco DE PROPOSITO:
 *  esta camada transporta o contrato publico e nao conhece o vocabulario analitico. Quem abre o
 *  documento e o validador da fronteira do resultado — um lugar so.
 *
 *  `indicator_registry_version` e o que explica um indicador que aparece ou some entre duas
 *  execucoes: o schema sozinho nao responde isso.
 *
 *  NAO expoe engine_version (invariante: o cliente nunca ve Engine) nem o manifesto interno da
 *  montagem (auditoria; nao atravessa a fronteira publica). */
export interface AnalysisResultView {
  analysis_id: string;
  result_schema_version: string;
  indicator_registry_version: string;
  result: unknown;
}

/** Resposta de prepare (POST /v1/analyses) e submit/retry. */
export interface AnalysisHandle {
  analysis_id: string;
  status: AnalysisStatus;
}

/** Código estável de erro público. `type` = `urn:sentinela:error:<code>`. */
export type ProblemCode =
  | "invalid_input"
  | "authentication_required"
  | "forbidden_or_not_found"
  | "idempotency_conflict"
  | "analysis_not_ready"
  | "result_not_available"
  | "capacity_wait"
  | "temporarily_unavailable"
  | "non_retryable_failure";

/** Envelope de erro `application/problem+json` (RFC 7807). `detail` é sempre um código/descrição
 *  segura — nunca tabela/SQL/host/bucket/key/URL/credencial/trace interno. */
export interface Problem {
  type: string; // urn:sentinela:error:<code>
  title: string;
  status: number;
  code: ProblemCode;
  detail: string;
  instance: string; // correlation id
  retryable: boolean;
}

// ── entradas públicas das 7 operações (só conceitos públicos) ─────────────────
/** Escopo canônico autenticado. `workspace_id` é a ÚNICA autoridade de tenant do público.
 *  (project/environment são contexto de produto legado — NÃO entram no `/v1` nesta etapa.) */
export interface CanonicalScope {
  workspaceId: string;
}

/** Parâmetros de listagem (cursor determinístico; sem offset). */
export interface ListParams extends CanonicalScope {
  limit?: number;
  cursor?: string | null;
}

// ── /v1/me — projeção da sessão (Supabase = 0) ────────────────────────────────

/** Membership projetada pelo Gateway a partir das claims do Keycloak. */
export interface WorkspaceMembershipView {
  id: string;
  name: string;
  role: "viewer" | "member" | "admin" | "owner";
}

/**
 * Resposta de `GET /v1/me`.
 *
 * `workspaces` é a LISTA AUTORITATIVA: o frontend não a mantém, não a deriva de dado local
 * antigo e não a completa por outra fonte. O workspace ativo é preferência local e só vale se
 * estiver aqui.
 */
export interface MeView {
  user: { id: string; email: string; name: string };
  workspaces: WorkspaceMembershipView[];
  capabilities: { canonical_analysis_enabled: boolean };
}
