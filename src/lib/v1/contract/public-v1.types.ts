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
  // O dataset canônico existe e falta submeter. Estado de AÇÃO HUMANA, como `needs_mapping`:
  // não muda sozinho, e um indicador de progresso aqui seria a tela travada com cara de
  // trabalho em curso.
  //
  // Ele nasceu de um defeito medido: `artifact_ready` respondia `preparing` — o mesmo status de
  // quem não mandou arquivo nenhum — e esta tela, que decide o que mostrar pelo status, exibia
  // "adicionar dataset" para uma análise pronta. Ela não travava; voltava.
  | "ready_to_submit"
  | "completed" // resultado disponível
  | "failed"; // falha terminal (ver retry_allowed para recuperabilidade)

export const PUBLIC_STATES: readonly AnalysisStatus[] = [
  "preparing",
  "receiving",
  "queued",
  "running",
  "recovering",
  "needs_mapping",
  "ready_to_submit",
  "completed",
  "failed",
] as const;

/** Projeção pública de leitura de status (GET /v1/analyses/{id}). */
export interface AnalysisStatusView {
  analysis_id: string;
  /** Rotulo humano opcional. A identidade tecnica continua sendo `analysis_id`. */
  display_name?: string | null;
  status: AnalysisStatus;
  record_count: number | null;
  result_available: boolean;
  retry_allowed: boolean;
  created_at: string | null;
  updated_at: string | null;
  /**
   * BD02 — a Instance a que esta analise pertence. `null` = analise SEM Instance, o que inclui
   * toda a legada: a chave existe sempre, e omiti-la para significar ausencia obrigaria o
   * cliente a distinguir "nao veio" de "nao tem".
   *
   * Identidade duravel entre execucoes; e por ela que a navegacao reconstroi o contexto depois
   * de um refresh. Nunca inferida, nunca preenchida por Default.
   */
  instance_id: string | null;
  /**
   * O que aconteceu com o ARQUIVO: quantos registros entraram, quantos viraram dataset e
   * quantos foram recusados. `null` quando ainda nao ha o que contar.
   *
   * Medido em homologacao em 2026-08-24, com base real de atendimento: 61.423 turnos entraram,
   * 100 foram recusados (0,16%) e o dataset inteiro foi rejeitado pela politica estrita. A tela
   * mostrava apenas "Couldn't complete" — o sistema tinha o numero e nao o contava.
   *
   * Os TRES contadores viajam separados porque e assim que o Ingestion os publica. Junta-los
   * num numero so e o que faz uma tela dividir por "recebidos" o que so vale sobre "canonicos".
   */
  intake: AnalysisIntake | null;
}

/** Os tres denominadores do arquivo, juntos e nomeados. */
export interface AnalysisIntake {
  /** Registros lidos do arquivo do cliente. Para conversas, ja EXPANDIDOS em turnos. */
  source_record_count: number | null;
  /** Registros que viraram dataset canonico. */
  canonical_record_count: number | null;
  /**
   * Registros recusados. `0` afirma "nada foi recusado"; `null` diz "ainda nao medimos" — e a
   * tela precisa distinguir para nao anunciar um dataset perfeito antes de ele existir.
   */
  rejected_record_count: number | null;
  /** Motivos agregados dos registros que ficaram fora do dataset canonico. Sem conteúdo. */
  rejected_record_reasons: AnalysisRejectedRecordReason[];
  /** Política efetivamente avaliada pelo Ingestion; nunca inferida pela tela. */
  acceptance_policy: "strict" | "threshold" | null;
  /** Regra efetiva, em números públicos para a tela explicar sem hardcode. */
  acceptance_rule: AnalysisAcceptanceRule | null;
  /** Resultado da política de aceitação, separado da conclusão de privacidade. */
  accepted: boolean | null;
  /** Resultado seguro do Privacy Gate; não inclui conteúdo, campo nem regra detectada. */
  privacy_clearance: "passed" | "review_required" | "rejected" | "policy_violation" | "scanner_failed" | null;
}

export interface AnalysisRejectedRecordReason {
  code: string;
  count: number;
}

export interface AnalysisAcceptanceRule {
  policy: "strict" | "threshold";
  min_valid_ratio: number | null;
  min_valid_records: number | null;
}

/** Item de listagem (GET /v1/analyses). */
export interface AnalysisListItem {
  analysis_id: string;
  display_name?: string | null;
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
  /**
   * BD02 — a Instance a que esta analise pertence. `null` = analise SEM Instance, o que inclui
   * toda a legada. A chave existe sempre: omiti-la para significar ausencia obrigaria a lista a
   * distinguir "nao veio" de "nao tem".
   *
   * E o mesmo campo do read model de STATUS, e de proposito: e ele que liga a linha do
   * historico ao contexto duravel, sem o Front recalcular nada.
   */
  instance_id: string | null;
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

/** Resposta de prepare, submit e reprocess; reprocess devolve a identidade da nova Analysis. */
export interface AnalysisHandle {
  analysis_id: string;
  status: AnalysisStatus;
}

/** Confirmação do rótulo humano; a identidade técnica não muda. */
export interface RenameAnalysisView {
  analysis_id: string;
  display_name: string;
}

/** Confirmação da remoção pública de uma Analysis terminal falhada. */
export interface DeleteAnalysisView {
  analysis_id: string;
  deleted: true;
}

/** Sessão pública de recebimento em partes. Não expõe storage nem URL interna. */
export interface UploadAbertoView {
  analysis_id: string;
  status: "receiving";
  upload_session_id: string;
  part_size_bytes: number;
  uploaded_parts?: Array<{
    part_number: number;
    etag: string;
  }>;
}

/** Confirmação pública de uma parte recebida. */
export interface UploadParteView {
  analysis_id: string;
  upload_session_id: string;
  part_number: number;
  etag: string;
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

/**
 * Parâmetros do `prepare` (M37 · INST-04).
 *
 * `instanceId` é OPCIONAL e ADITIVO, espelhando o produtor: no Gateway `@ ac81633`,
 * `prepare_analysis` declara `instance_id: Annotated[str | None, Query()] = None`. Ausente = a
 * análise nasce sem Instance, que é o caminho de toda a jornada geral e de toda a massa legada —
 * **o campo não pode virar obrigatório aqui**, sob pena de o Front mentir sobre o contrato.
 *
 * Quem valida existência e tenant é o **Orchestrator**, não o Gateway e muito menos o Front. E a
 * associação NÃO volta na resposta do `prepare` (`{analysis_id, status}`): ela só se torna legível
 * depois, no `instance_id` do read model de status.
 */
export interface PrepareParams extends CanonicalScope {
  instanceId?: string;
}

/** Parâmetros de listagem (cursor determinístico; sem offset). */
export interface ListParams extends CanonicalScope {
  limit?: number;
  cursor?: string | null;
  /** Busca tenant-scoped por nome da Instance ou identificador da análise. */
  query?: string;
  /**
   * BD02 — filtra a listagem pela Instance. Ausente = listagem geral do workspace, o
   * comportamento de sempre.
   *
   * É assim que o histórico por Instance existe: filtro na operação canônica, e NÃO um
   * subrecurso `/v1/instances/{id}/analyses` — a BD02 recusou criá-lo de propósito. A seleção
   * acontece na query tenant-scoped do backend; filtrar aqui quebraria o cursor e a contagem
   * da página.
   */
  instanceId?: string;
  /**
   * BD10 — restringe aos CANDIDATOS a referência de baseline. **Exige `instanceId`**:
   * elegibilidade só existe relativa a uma Instance, e sem ela o produtor devolve
   * `invalid_input`.
   *
   * Ele existe porque a alternativa era pior. A listagem já devolve `status` e `instance_id` por
   * item, então sem este filtro o Front CONSEGUIRIA recortar a lista sozinho — e conseguir é o
   * problema: a regra de elegibilidade passaria a existir em dois lugares, e o Front seria o
   * errado. Aqui ela é TRANSPORTE; quem decide é o Orchestrator, com o mesmo predicado que
   * autoriza o `SET`.
   */
  baselineEligible?: boolean;
}

// ── /v1/workspaces — identidade de produto e nome do espaço (BD12) ────────────

/**
 * O Workspace, como o contrato o publica: `workspace.read_model_fields` é exatamente estes três.
 *
 * **Tipo PRÓPRIO, e não um `RenamableEntity` compartilhado com `InstanceView`.** As duas têm um
 * campo `name` e param aí: donos diferentes (`sentinela-workspace` e o Orchestrator), operações
 * diferentes, escopos diferentes — `get_workspace` não leva `workspace_id` na query, e
 * `get_instance` leva. Um tipo genérico faria a primeira mudança de um deles quebrar o outro, e o
 * ganho seria três linhas.
 *
 * **Este é o nome AUTORITATIVO do espaço.** A claim do provedor carrega um `name` que é projeção
 * de bootstrap e envelhece após um rename — ver `MeView.workspaces[].name`. Quem manda aqui é
 * este produtor.
 */
export interface WorkspaceView {
  workspace_id: string;
  name: string;
  created_at: string | null;
}

// ── /v1/subscriptions — a comunicação autorizada do Workspace (BD14) ──────────

/** Os canais que o dono aceita. Enum FECHADO — `Canal` em `domain/entrega.py`. */
export type SubscriptionChannel = "webhook" | "email";

/**
 * A assinatura, como a fronteira pública a projeta (`_publica`, em `subscriptions_v1.py`).
 *
 * **O segredo não está aqui, nem cifrado.** Ele sai UMA vez, na criação e na rotação, e uma
 * leitura nunca o devolve. `secret_version` fica porque o cliente precisa saber qual chave está
 * em uso — a versão é informação de operação, o material é credencial.
 */
export interface SubscriptionView {
  subscription_id: string;
  channel: SubscriptionChannel;
  /**
   * Para onde avisar. É a **intenção explícita** de quem assinou, e não deriva de identidade:
   * o Gateway tem gate provando que não lê `/v1/me`, claim de e-mail, Account nem Workspace para
   * preenchê-lo. A diferença é entre *mandar para quem a pessoa pediu* e *mandar para o que o
   * provedor achar hoje*.
   */
  destination: string;
  event_types: string[];
  /**
   * O idioma da ENTREGA. Independente da preferência de idioma da conta (BD11): um diz em que
   * língua o produto fala com a pessoa, o outro em que língua a mensagem sai. Divergir é legítimo.
   */
  language: "pt" | "en";
  active: boolean;
  secret_version: number;
  /**
   * Quando uma entrega foi aceita pelo destino. Estado **OBSERVADO**, não fluxo: não existe
   * operação de verificar, e portanto não há código, expiração nem tentativas. `null` significa
   * "ainda não houve entrega aceita" — nunca "pendente de confirmação sua".
   */
  verified_at: string | null;
  created_at: string | null;
}

/** `GET /v1/subscriptions`. Lista vazia é estado legítimo — nunca erro, nunca `null`. */
export interface SubscriptionListPage {
  items: SubscriptionView[];
}

/**
 * A resposta de `create` e de `rotate`. O material sai **uma vez**, e só aqui.
 *
 * `secret` é `null` para `email`, que não tem segredo — e a CHAVE existe sempre, de propósito:
 * omiti-la obrigaria o cliente a distinguir "não veio" de "não tem".
 */
export interface SubscriptionSecretView {
  subscription_id: string;
  secret_version: number;
  secret: string | null;
}

/** A resposta de `disable`. O estado que a operação produziu, e não um `204` a interpretar. */
export interface SubscriptionDisabledView {
  subscription_id: string;
  active: boolean;
}

/** O corpo de `create`. O Gateway recusa campo a mais (`extra="forbid"`) — inclusive
 *  `workspace_id`, que já veio autorizado na query. */
export interface CreateSubscriptionInput {
  channel: SubscriptionChannel;
  destination: string;
  event_types: string[];
  language: "pt" | "en";
}

// ── /v1/instances — a identidade DURÁVEL entre execuções (BD02) ───────────────

/**
 * A Instance, como o contrato a publica: `instance_read_model_fields` é exatamente estes três.
 *
 * Não há `status`, `health`, contador, `description`, `tags` nem `updated_at` — a BD02 os
 * recusou deliberadamente, e é por isso que **INST-02 (Estado) não tem produtor** e ficou fora
 * da M36. Acrescentar campo aqui sem que o contrato o publique faria o Front nascer sabendo ler
 * algo que ninguém manda.
 */
export interface InstanceView {
  instance_id: string;
  name: string;
  created_at: string | null;
}

/**
 * BD10 — o PONTEIRO de baseline da Instance.
 *
 * Contrato SEPARADO da `InstanceView` de propósito: aquela é identidade PURA e imutável após a
 * criação, e embutir nela um ponteiro mutável mudaria a natureza da view. Baseline é sub-recurso,
 * com leitura própria — e por isso `get_instance`/`list_instances` NÃO ganharam o campo.
 *
 * As duas chaves existem SEMPRE. `null` nas duas é `NO_BASELINE`: estado LEGÍTIMO e inicial de
 * toda Instance, nunca erro. Omitir para significar ausência obrigaria o cliente a distinguir
 * "não veio" de "não tem", que é a mesma decisão já tomada para `instance_id` no item da listagem.
 *
 * O par nunca vem pela metade — o produtor tem `CHECK` no banco (migration 0040). O tipo diz isso
 * de forma mais fraca do que a realidade (dois `| null` independentes), e é deliberado: apertar
 * aqui com união discriminada obrigaria todo consumidor a estreitar antes de ler `set_at`, e o
 * ganho seria contra um estado que o produtor não emite.
 */
export interface BaselineView {
  instance_id: string;
  baseline_analysis_id: string | null;
  /** Instante da eleição VIGENTE. NÃO é início de tendência, janela analítica nem data de
   *  comparação — é o instante de um ato de configuração. */
  baseline_set_at: string | null;
}

/** Página de Instances (cursor determinístico, mesma semântica de `AnalysisListPage`). */
export interface InstanceListPage {
  items: InstanceView[];
  next_cursor: string | null;
}

/** Parâmetros de listagem de Instances. Mesma forma de `ListParams`, sem o filtro por Instance —
 *  filtrar Instances por Instance não significa nada. */
export interface InstanceListParams extends CanonicalScope {
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

// ── Preferencia de idioma da CONTA (BD11 / CFG-02) ──────────────────────────────────────────
//
// Duas chaves, e elas NAO sao a mesma informacao:
//
//     stored_language = null   ->  "ainda nao escolheu; o produto usa o default"
//     stored_language = "en"   ->  "escolheu ingles"
//
// O tipo separa as duas de proposito. `language: string` aceitaria `es`, `pt-BR` e `""`, e
// `stored: EffectiveLanguage` apagaria o `null` que carrega a distincao inteira — que e o unico
// defeito desta capacidade capaz de passar despercebido, porque nao produz erro: a resposta
// continua plausivel e a tela passa a afirmar uma escolha que a pessoa nunca fez.

/** O que o usuario persistiu EXPLICITAMENTE. `null` = ainda nao escolheu. */
export type StoredLanguage = "en" | "pt" | null;

/** O idioma que o produto usa agora. Sempre um dos dois — nunca `null`. */
export type EffectiveLanguage = "en" | "pt";

/**
 * Resposta de `GET`/`PUT /v1/me/language`.
 *
 * As DUAS chaves existem sempre; `null` nunca e omitido. E o Front nao resolve
 * `stored -> effective`: quem possui essa semantica e o Account, e recalcula-la aqui faria a tela
 * decidir produto.
 */
export interface LanguagePreferenceView {
  stored_language: StoredLanguage;
  effective_language: EffectiveLanguage;
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
export type AnalyticsAxisState = "pending" | "running" | "ready" | "partial" | "withheld" | "failed" | "unknown";

/** Estados do eixo `export`. Único que conhece `expired` e `unavailable`. */
export type ExportAxisState = "unavailable" | "preparing" | "ready" | "expired" | "failed" | "unknown";

/** Estados do eixo `final_result`. */
export type FinalResultAxisState = "pending" | "ready" | "failed";

/** Nome de eixo, exatamente como `progress_axes` publica. */
export type ProgressAxis = "engine" | "analytics" | "export" | "final_result";

/**
 * A ORDEM publicada dos eixos, em runtime.
 *
 * Mora aqui, e não na feature, por dois motivos que coincidem. O primeiro é de lugar: a ordem em
 * que `progress_axes` lista os componentes é conhecimento de CONTRATO, não preferência de leitura
 * de uma tela — reordenar por "o que parece mais importante" seria a UI decidindo prioridade entre
 * componentes que o produtor lista lado a lado.
 *
 * O segundo é o cadeado da jornada canônica: ele proíbe a palavra `engine` em
 * `features/canonical-analysis/**` porque Engine é vocabulário interno e o cliente nunca a vê. A
 * proibição está certa para o que a tela MOSTRA; o identificador do eixo, porém, é publicado pelo
 * contrato, e o lugar dele é a camada que fala contrato. A M34 tentou declarar esta lista dentro
 * da feature e o cadeado reprovou — corretamente.
 */
export const PROGRESS_AXES: readonly ProgressAxis[] = ["engine", "analytics", "export", "final_result"] as const;

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
 * Os quatro eixos não têm percentual agregado: uma média entre componentes incomparáveis seria
 * opinião do front. ``intake`` é diferente — traz bytes medidos por um único produtor durante a
 * passagem pelo arquivo e, por isso, pode publicar percentual sem inventar uma medida.
 */
export interface IntakeProgressView {
  stage: string;
  processed_bytes: number;
  total_bytes: number | null;
  percent: number | null;
  conversations_seen: number;
  conversations_ready: number;
  conversations_outside_analysis: number;
  last_activity_at: string | null;
}

export type OperationalStage = "upload" | "privacy" | "measures" | "final_result";
export type OperationalStageState = "waiting" | "active" | "done" | "attention" | "failed";
export type OperationalOwner = "user" | "sentinela" | "sentinela_support" | "none";
export type OperationalNextAction =
  | "upload_dataset"
  | "continue_upload"
  | "provide_mapping"
  | "start_analysis"
  | "wait"
  | "open_result"
  | "inspect_failure";

export interface AnalysisRunManifestSummaryView {
  contract_version: "analysis-run-manifest-v1";
  manifest_digest: string;
  captured_at: string;
  workload: {
    records: number;
    embeddings: number;
    embedding_dim: number;
  };
  execution: {
    analysis_profile: string;
    estimated_peak_mb: number;
    estimated_duration_seconds: number | null;
    estimator_version: string;
    required_profile: string;
    profile_version: number;
  };
  contracts: {
    measurement_contract_version: string;
  };
}

export interface AnalysisOperationalTruthView {
  contract_version: "analysis-operational-truth-v1" | "analysis-operational-truth-v2";
  current_stage: OperationalStage;
  current_state: OperationalStageState;
  owner: OperationalOwner;
  next_action: OperationalNextAction;
  last_progress_at: string | null;
  /** `null` em análises legadas: a UI nunca reconstrói o passado com defaults atuais. */
  run_manifest: AnalysisRunManifestSummaryView | null;
  runtime_evidence?: {
    attempt_number: number | null;
    state: string;
    started_at: string | null;
    last_heartbeat_at: string | null;
    finished_at: string | null;
    duration_ms: number | null;
    ownership_state: "healthy" | "closed" | "lost" | "fenced" | "unknown";
    terminal_cause:
      "completed" | "worker_reported_failure" | "cancelled" | "lease_expired" | "capacity_requeued" | null;
  } | null;
  core_milestones?: readonly {
    milestone: "dispatch" | "calculation_output" | "result_assembly";
    state: "waiting" | "active" | "done" | "failed" | "unknown";
    observed_at: string | null;
  }[];
  follow_ups?: readonly {
    capability: "review" | "notification";
    state:
      | "not_applicable"
      | "not_requested"
      | "not_configured"
      | "waiting"
      | "active"
      | "ready"
      | "partial"
      | "delivered"
      | "failed"
      | "unavailable"
      | "unknown";
    observed_at: string | null;
  }[];
  stages: readonly { stage: OperationalStage; state: OperationalStageState }[];
}

export interface AnalysisProgressView {
  analysis_id: string;
  axes: readonly ProgressEntry[];
  intake?: IntakeProgressView;
  /** A projeção autoritativa que a tela renderiza sem recompor lifecycle, owner ou ação. */
  operational_truth?: AnalysisOperationalTruthView;
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

export interface AnalyticsQueryInput {
  query_contract_version: "analytics-query-v1";
  projection_digest: string;
  metric_ids: readonly string[];
  dimension_id?: string;
  time_dimension_id?: string;
  granularity: "auto" | "hour" | "day" | "week" | "month";
  filters: readonly [];
  order: readonly [];
  limit: number;
}

export interface AnalyticsQueryMetricResult {
  metric_id: string;
  availability: string;
  reason_code: string | null;
  value_kind: string;
  block_kind: string;
  dimension_id: string | null;
  payload: Record<string, unknown> | null;
}

export interface AnalyticsQueryResultView {
  result_contract_version: "analytics-query-result-v1";
  query_contract_version: "analytics-query-v1";
  analysis_id: string;
  projection_digest: string;
  results: readonly AnalyticsQueryMetricResult[];
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

// ── Linha do tempo (M23) ────────────────────────────────────────────────────────────────────

/**
 * Os oito `event_type` de `public-events-v1`. **União FECHADA, e fechada de propósito:** um tipo
 * novo do produtor deixa de compilar aqui, e é assim que se descobre que o contrato mudou — em
 * vez de a tela renderizar um evento cujo significado ninguém declarou.
 *
 * `analysis.completed` e `result.available` mapeiam ambos para o estado público `completed` e
 * **não** são a mesma coisa: um diz que a execução terminou, o outro que existe documento
 * publicável. Colapsá-los apagaria a janela em que a análise acabou e o resultado ainda não
 * estava lá — que é justamente o caso em que alguém pergunta o que houve.
 */
export type TimelineEventType =
  | "analysis.created"
  | "analysis.data_received"
  | "analysis.queued"
  | "analysis.started"
  | "analysis.recovering"
  | "analysis.completed"
  | "analysis.failed"
  | "result.available";

/** `data.reason` de `analysis.recovering` — enum fechado do contrato. */
export type TimelineRecoveringReason = "capacity" | "interrupted";

/** `data.failure_stage` de `analysis.failed` — enum fechado do contrato. */
export type TimelineFailureStage = "input" | "execution" | "cancelled";

/** Os seis campos do envelope que não discriminam. `sequence` é inteiro; o resto, texto. */
interface TimelineEventBase {
  event_id: string;
  event_schema_version: string;
  analysis_id: string;
  workspace_id: string;
  /** Cursor lógico POR análise, crescente na origem. Não é ordem global, e não é relógio. */
  sequence: number;
  occurred_at: string;
}

/**
 * Um evento durável. **União discriminada por `event_type`**, como os eixos de `/progress`: o
 * contrato declara `data_keys` por tipo, então um `failure_stage` num `analysis.queued` deixa de
 * compilar em vez de virar campo ignorado em silêncio.
 *
 * **`record_count` e `result_available` são `unknown` de propósito.** O contrato publica a
 * CHAVE, não o tipo escalar (`data_keys` lista nomes; só `data_enums` fecha valores). Escrever
 * `number`/`boolean` aqui seria o front inferindo um tipo que o produtor não declarou — e a
 * inferência erraria calada no dia em que a contagem viesse como string. Quem precisar do valor
 * estreita explicitamente, e a estreitagem fica visível.
 */
export type TimelineEvent =
  | (TimelineEventBase & {
      event_type: "analysis.created";
      data: Record<string, never>;
    })
  | (TimelineEventBase & {
      event_type: "analysis.data_received";
      data: { record_count: unknown };
    })
  | (TimelineEventBase & {
      event_type: "analysis.queued";
      data: Record<string, never>;
    })
  | (TimelineEventBase & {
      event_type: "analysis.started";
      data: Record<string, never>;
    })
  | (TimelineEventBase & {
      event_type: "analysis.recovering";
      data: { reason: TimelineRecoveringReason };
    })
  | (TimelineEventBase & {
      event_type: "analysis.completed";
      data: { result_available: unknown };
    })
  | (TimelineEventBase & {
      event_type: "analysis.failed";
      data: { failure_stage: TimelineFailureStage };
    })
  | (TimelineEventBase & {
      event_type: "result.available";
      data: Record<string, never>;
    });

/**
 * `GET /v1/analyses/{analysis_id}/timeline`.
 *
 * A linha do tempo é **LIDA** dos eventos duráveis, nunca remontada a partir do estado atual:
 * remontar produziria uma história plausível em vez da que aconteceu, e as duas divergem
 * exatamente no caso interessante — a análise que foi e voltou.
 *
 * **Não há percentual, e não haverá.** Não existe fonte confiável para "37%", e inventar o
 * número é a forma mais rápida de o cliente perder a confiança no resto da tela.
 *
 * A ordem vem do produtor (crescente por `sequence`, por análise). O front **não** reordena:
 * ordenar seria calcular a linha do tempo, e o cliente passaria a ter opinião sobre a história.
 */
export interface AnalysisTimelineView {
  analysis_id: string;
  events: readonly TimelineEvent[];
}

/**
 * O que o serviço entendeu do arquivo, e o que ele **não** conseguiu decidir sozinho.
 *
 * A leitura que tira `needs_mapping` de beco sem saída. Ela não traz amostra de conteúdo, e a
 * ausência é decisão medida no dono: havia um `samples` com três valores do arquivo, e ele foi
 * removido porque devolvia nome, telefone e CPF ao chamador.
 *
 * O que restou cumpre a função que a amostra tinha de verdade — reconhecer a coluna na tela —
 * sem reverter para o valor: tipo, cobertura e cardinalidade.
 */
export interface ColunaDoArquivo {
  name: string;
  /** `true` quando o próprio NOME da coluna continha dado pessoal e virou `field_NNN`. */
  name_redacted: boolean;
  types: string[];
  /** Fração de registros da amostra em que a coluna aparece preenchida. */
  coverage: number | null;
  distinct_values: number | null;
}

/** O que a heurística propôs para um campo canônico, e com quanta confiança. */
export interface SugestaoDeCampo {
  source?: string | null;
}

export interface CatalogActivationItem {
  kind: "measure" | "dimension";
  catalog_id: string;
  source: string;
  status: "eligible" | "rejected_type";
  expected_value_type: string;
  observed_types: string[];
  reason_code: "exact_contract_match" | "canonical_field_mapped" | "catalog_measure_promoted" | "incompatible_type";
  group: string;
  direction: "higher_is_worse" | "higher_is_better" | "context_only";
  detector_id: string | null;
}

export interface MappingView {
  requires_decision: boolean;
  records_observed: number | null;
  /** `true` quando a amostra parou antes do fim — `records_observed` não é o tamanho do arquivo. */
  sample_truncated: boolean;
  format_id: string | null;
  columns: ColunaDoArquivo[];
  /** Campo canônico → o que a heurística propôs. Ausente = ela não propôs nada. */
  suggestion: Record<string, SugestaoDeCampo>;
  /**
   * Campo canônico → colunas que EMPATARAM.
   *
   * É a informação mais útil da view: são exatamente os campos onde a máquina chegou até o fim
   * e não conseguiu escolher — e por isso são o foco da tela.
   */
  ambiguous: Record<string, string[]>;
  required_fields: string[];
  optional_fields: string[];
  /**
   * Campos canônicos que podem ser declarados como DIMENSÃO — a lista fechada, vinda do
   * servidor.
   *
   * Ela viaja em vez de ficar de cor na tela pela mesma razão que `optional_fields`: a cópia
   * que a fronteira mantinha da lista da Ingestão divergiu em silêncio, e nada pegou.
   */
  groupable_fields: string[];
  /** Decisões do catálogo publicadas pelo owner; o Front só explica e permite opt-out local. */
  catalog_version?: string | null;
  catalog_activation?: CatalogActivationItem[];
  catalog_activation_summary?: { eligible: number; rejected_type: number };
}

/** O desfecho da confirmação. `ingestion_state` sai de `needs_mapping` quando ela é aceita. */
export interface MappingConfirmedView {
  analysis_id: string;
  ingestion_state: string | null;
}

// Analysis Context e Sentinela Review são projeções públicas opcionais. Elas interpretam as
// medições oficiais, sem expor a identidade operacional do processamento assíncrono.
export type ContextItemState = "suggested" | "accepted" | "edited" | "rejected";
export type ContextCategory =
  "objective" | "critical_journey" | "expected_behavior" | "risk" | "success_indicator" | "operational_constraint";

export interface ContextItemView {
  item_id: string;
  category: ContextCategory;
  text: string;
  state: ContextItemState;
  confidence?: number | null;
  source_span?: { start: number; end: number } | null;
}

export interface ContextStructureView {
  items: ContextItemView[];
}
export interface AnalysisContextView {
  context_contract_version?: string;
  context_id?: string;
  analysis_id: string;
  version?: number;
  state: "empty" | "unavailable" | "draft" | "sealed";
  original_text?: string;
  structured?: ContextStructureView;
  privacy_clearance?: "passed" | "not_required" | "unavailable";
  privacy_policy_version?: string | null;
  context_digest?: string;
  created_at?: string;
  updated_at?: string;
  sealed_at?: string | null;
}

export interface ContextDraftInput {
  original_text: string;
  expected_version?: number;
  accepted_structure: ContextStructureView;
}

export interface ContextSuggestionView {
  context_contract_version: string;
  suggestions: ContextStructureView;
  provider: string;
  model: string;
  prompt_version: string;
}

export type ReviewStatus =
  "not_requested" | "unavailable" | "queued" | "investigating" | "partial" | "completed" | "failed";

export interface ReviewEvidenceView {
  evidence_id: string;
  source: "argos" | "analytics" | "context";
  pointer: string;
  label: string;
  excerpt?: string | null;
  digest: string;
}

export interface ReviewClaimView {
  claim_id: string;
  kind: "fact" | "interpretation" | "recommendation" | "limitation";
  statement: string;
  confidence: number;
  evidence_refs: string[];
  metric_refs: string[];
  intent_refs: string[];
  issue_refs: string[];
  context_refs: string[];
  verification_status: "verified" | "rejected";
}

export interface ReviewInvestigationView {
  investigation_id: string;
  title: string;
  summary: string;
  signal_refs: string[];
  claim_refs: string[];
}

export interface ReviewRecommendedActionView {
  action_id: string;
  priority: "now" | "next" | "later";
  title: string;
  why: string;
  owner: string;
  how: string[];
  configuration: string[];
  success_check: string;
  rollback?: string | null;
  evidence_refs: string[];
}

export type ReviewActionStatus =
  | "accepted"
  | "in_progress"
  | "verifying"
  | "succeeded"
  | "failed"
  | "dismissed"
  | "rolled_back";

export interface ReviewActionEventView {
  event_id: string;
  command_id: string;
  sequence: number;
  from_status: ReviewActionStatus | null;
  to_status: ReviewActionStatus;
  actor_id: string;
  reason?: string | null;
  occurred_at: string;
}

export interface ReviewActionRecordView {
  action_record_id: string;
  analysis_id: string;
  source_review_id: string;
  source_review_version: number;
  source_action_id: string;
  source_action_digest: string;
  snapshot: ReviewRecommendedActionView;
  status: ReviewActionStatus;
  assignee: string;
  due_at?: string | null;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  events: ReviewActionEventView[];
}

export interface ReviewActionListView {
  analysis_id: string;
  state?: "unavailable";
  items: ReviewActionRecordView[];
}

export interface AcceptReviewActionInput {
  command_id: string;
  source_review_id: string;
  source_action_id: string;
  assignee: string;
  due_at?: string | null;
}

export interface TransitionReviewActionInput {
  command_id: string;
  expected_version: number;
  target_status: ReviewActionStatus;
  reason?: string | null;
}

export type ReviewFeedbackRating = "helpful" | "not_helpful";
export type ReviewFeedbackReason =
  | "clear"
  | "actionable"
  | "well_supported"
  | "too_generic"
  | "not_actionable"
  | "missing_evidence"
  | "incorrect_interpretation"
  | "other";

export interface ReviewFeedbackView {
  state?: "empty" | "unavailable";
  feedback_id?: string;
  analysis_id: string;
  source_review_id?: string;
  source_review_version?: number;
  actor_id?: string;
  rating?: ReviewFeedbackRating;
  reason?: ReviewFeedbackReason | null;
  comment?: string | null;
  created_at?: string;
}

export interface SubmitReviewFeedbackInput {
  command_id: string;
  source_review_id: string;
  source_review_version: number;
  rating: ReviewFeedbackRating;
  reason?: ReviewFeedbackReason | null;
  comment?: string | null;
}

export interface ReviewRejectedClaimAuditView {
  claim_digest: string;
  kind: ReviewClaimView["kind"];
  evidence_refs: string[];
  reasons: string[];
}

export interface ReviewVerificationReportView {
  gate_version: string;
  submitted_claim_count: number;
  accepted_claim_count: number;
  rejected_claim_count: number;
  rejected_claims: ReviewRejectedClaimAuditView[];
}

export interface ReviewClaimLineageView {
  claim_id: string;
  official_evidence_refs: string[];
  context_refs: string[];
  metric_refs: string[];
  intent_refs: string[];
  issue_refs: string[];
  coverage_refs: string[];
  source_snapshot_refs: string[];
}

export interface ReviewArtifactView {
  review_contract_version?: string;
  review_id?: string;
  analysis_id: string;
  language?: "pt" | "en";
  version?: number;
  status: ReviewStatus;
  executive_summary?: string | null;
  what_matters_most?: string[];
  strengths?: string[];
  investigations?: ReviewInvestigationView[];
  critical_findings?: string[];
  contradictions?: string[];
  business_impact?: string[];
  recommendations?: string[];
  recommended_actions?: ReviewRecommendedActionView[];
  blind_spots?: string[];
  claims?: ReviewClaimView[];
  evidence?: ReviewEvidenceView[];
  verification_report?: ReviewVerificationReportView | null;
  claim_lineage?: ReviewClaimLineageView[];
  partial_reasons?: string[];
  created_at?: string;
  completed_at?: string | null;
}

export interface ReviewRequestView {
  review_request_id: string;
  status: "queued" | "already_queued";
}
