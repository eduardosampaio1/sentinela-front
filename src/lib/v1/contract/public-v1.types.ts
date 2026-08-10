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
  // Parada de NEGÓCIO, não de sistema: o dado chegou e passou pelo Privacy Gate, mas falta
  // uma pessoa confirmar como alguns campos devem ser interpretados. Não é `failed` (nada
  // quebrou, e "tentar de novo" repetiria exatamente o mesmo resultado) nem `preparing`
  // (nada está progredindo, e um indicador em andamento seria a tela travada com cara de
  // trabalho em curso).
  | "needs_mapping"
  | "completed" // resultado disponível
  | "failed"; // falha terminal (ver retry_allowed para recuperabilidade)

export const PUBLIC_STATES: readonly AnalysisStatus[] = [
  "preparing",
  "receiving",
  "queued",
  "running",
  "recovering",
  "needs_mapping",
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

// ── Progresso por eixo (M20) ────────────────────────────────────────────────────────────────
//
// `progress_axes` do contrato: quatro eixos, e cada um com VOCABULÁRIO PRÓPRIO. Eles não são o
// mesmo enum com nomes diferentes:
//
//   • `withheld` só existe em `analytics` — retenção por privacidade não acontece na Engine;
//   • `expired` e `unavailable` só existem em `export` — só um pacote caduca;
//   • `partial` só existe em `analytics` — a Engine termina ou falha, não entrega metade.
//
// Um `estado: string` comum aceitaria `expired` num eixo que nunca expira, e a tela mostraria um
// estado que aquele componente não tem. Os tipos separados são o que impede isso no compilador,
// e é a mesma razão pela qual o `StatusBadge` da M11 usa união discriminada.

/** Estados do eixo `engine`. Termina ou falha — não há meio-termo. */
export type EngineAxisState = "pending" | "running" | "ready" | "failed";

/** Estados do eixo `analytics`. Único que conhece `partial` e `withheld`. */
export type AnalyticsAxisState =
  | "pending"
  | "running"
  | "ready"
  | "partial"
  | "withheld"
  | "failed"
  | "unknown";

/** Estados do eixo `export`. Único que conhece `expired` e `unavailable`. */
export type ExportAxisState =
  | "unavailable"
  | "preparing"
  | "ready"
  | "expired"
  | "failed"
  | "unknown";

/** Estados do eixo `final_result`. */
export type FinalResultAxisState = "pending" | "ready" | "failed";

/** Nome de eixo, exatamente como `progress_axes` publica. */
export type ProgressAxis = "engine" | "analytics" | "export" | "final_result";

/**
 * Uma entrada de progresso. União DISCRIMINADA pelo eixo: passar um estado de `export` onde se
 * espera `engine` deixa de compilar.
 */
export type ProgressEntry =
  | { axis: "engine"; state: EngineAxisState }
  | { axis: "analytics"; state: AnalyticsAxisState }
  | { axis: "export"; state: ExportAxisState }
  | { axis: "final_result"; state: FinalResultAxisState };

/**
 * `GET /v1/analyses/{analysis_id}/progress`.
 *
 * **Não há percentual, e não haverá.** O plano põe agregação fora de escopo, e o motivo é de
 * produto: um número único inventaria uma média entre eixos que medem coisas incomparáveis, e a
 * pessoa leria "63%" como se fosse uma medida quando é uma opinião do front.
 */
export interface AnalysisProgressView {
  analysis_id: string;
  axes: readonly ProgressEntry[];
}

// ── Projeção analítica pública (M21) ────────────────────────────────────────────────────────

/** `component_status` — o vocabulário da projeção. `partial` ≠ `failed`, `withheld` ≠ erro. */
export type AnalyticsComponentStatus = "ready" | "partial" | "withheld" | "failed" | "unknown";

/**
 * Retenção por privacidade. **Não é erro**: a medida existe e foi RETIDA por regra.
 * `reason_code` diz por quê; convertê-la em erro apagaria a diferença entre "não pôde ser
 * publicado" e "não pôde ser calculado".
 */
export interface AnalyticsWithheld {
  reason_code: string;
  [k: string]: unknown;
}

/**
 * `GET /v1/analyses/{analysis_id}/analytics` — os 9 campos de
 * `analytics_read_model_fields`.
 *
 * `snapshot` é `unknown` de propósito: sua forma é o contrato ANINHADO que a BD08 publicou
 * (`analytics-snapshot-v9`), e quem o abre é `analyticsProjection`. Tipá-lo aqui duplicaria a
 * superfície num segundo lugar que envelheceria sozinho.
 */
export interface AnalysisAnalyticsView {
  analysis_id: string;
  component_status: AnalyticsComponentStatus;
  snapshot_contract_version: string | null;
  snapshot_digest: string | null;
  snapshot: unknown;
  disclosure_rule_version: string | null;
  projection_digest: string | null;
  withheld: AnalyticsWithheld | null;
  generated_at: string | null;
}

// ── Download do pacote de export (M22) ──────────────────────────────────────────────────────

/**
 * `GET /v1/analyses/{analysis_id}/analytics/export/download`.
 *
 * **O Gateway não entrega bytes.** Ele devolve a capability de leitura que o broker assinou, e a
 * resposta de sucesso é `200 application/json` — não um ZIP. Existe **uma** noção de exportação,
 * e é o artefato do backend (Product Freeze D16): o front não monta pacote, não gera CSV e não
 * recalcula nada.
 *
 * `download_url` é **transporte de vida curta** — o produtor assina com TTL de 5 minutos. Não é
 * entidade de domínio: não se guarda, não se cacheia, não se persiste. Uma URL assinada em cache
 * é uma credencial que vence sozinha, e a pessoa clicaria num link morto achando que o Sentinela
 * quebrou.
 *
 * **`object_key` não está aqui, e a ausência é o contrato.** A chave do storage pertence ao
 * Orchestrator; o produtor a omite deliberadamente (`assert "object_key" not in corpo`) e o front
 * não teria o que fazer com ela além de vazá-la.
 *
 * `sha256` e `size_bytes` vêm do descritor do Analytics para o cliente conferir o que baixou —
 * sem eles, "baixei o arquivo" seria uma afirmação sobre o que o storage devolveu.
 */
export interface AnalysisExportDownloadView {
  analysis_id: string;
  export_id: string;
  download_url: string;
  expires_in_seconds: number;
  sha256: string;
  size_bytes: number;
  export_contract_version: string;
  format: string;
}
