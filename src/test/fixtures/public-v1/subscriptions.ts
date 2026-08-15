// M44 — a massa de Subscription (BD14) e dos eventos que produzem reentrada.
//
// ## A massa é HOSTIL de propósito
//
// Toda inferência plausível que a M44 poderia fazer aqui está **errada por construção**, e
// observavelmente errada:
//
// - o `destination` não é o e-mail da conta, nem parecido com ele;
// - o `language` da assinatura é o oposto da preferência da conta;
// - os `workspace_id` não são deriváveis dos nomes;
// - os `analysis_id` não são deriváveis de nada.
//
// Uma massa "coerente" — conta e assinatura combinando — deixaria passar um Front que lê a fonte
// errada, porque os dois valores seriam iguais e nenhuma tela mostraria diferença. É o mesmo
// raciocínio da armadilha da claim na M42, aplicado a outro par de donos.
//
// ## O que estas formas são
//
// A projeção pública de `api/routes/subscriptions_v1.py::_publica` e as respostas literais de
// `create`/`rotate`/`disable`. **Nenhum campo inventado para facilitar UI**: se a tela precisar de
// algo que não está aqui, o produtor não publica, e a conversa é com o contrato — não com a massa.

/** A projeção pública da assinatura. Espelha `_publica`, campo a campo, e nada além. */
export interface SubscriptionView {
  readonly subscription_id: string;
  readonly channel: "webhook" | "email";
  readonly destination: string;
  readonly event_types: readonly string[];
  readonly language: "pt" | "en";
  readonly active: boolean;
  readonly secret_version: number;
  /**
   * Estado **OBSERVADO**, produzido por uma entrega real — não há operação pública de verificar.
   * `null` = ainda não houve entrega aceita. Não é "pendente de OTP": não existe OTP.
   */
  readonly verified_at: string | null;
  readonly created_at: string | null;
}

/** A resposta de `create` e de `rotate`. O material sai UMA vez, e só aqui. */
export interface SubscriptionSecretView {
  readonly subscription_id: string;
  readonly secret_version: number;
  /** `null` para `email`, que não tem segredo. A chave existe SEMPRE — omiti-la obrigaria o
   *  cliente a distinguir "não veio" de "não tem". */
  readonly secret: string | null;
}

// ── Identidades opacas ────────────────────────────────────────────────────────────────────
//
// Nenhuma deriva do nome, e nenhuma deriva da outra. Um mock que montasse `ws-acme` a partir de
// "Acme" ensinaria a tela a construir identidade a partir de rótulo — que é exatamente o erro que
// a BD12 fechou do outro lado.

export const WS_PRINCIPAL = "ws-3f9c1d70-5a24-4e8b-9c13-7d0e6a2b4f85";
export const WS_VIZINHO = "ws-c85b0e42-19af-4d63-b7e0-2a6f9c31d508";

export const SUB_ATIVA = "sub-6b1e9047-3c85-4a2f-b0d6-18e7c4a95230";
export const SUB_NAO_VERIFICADA = "sub-a24f7db3-08e1-4c96-9f52-7b30d6e18c4a";
export const SUB_DESATIVADA = "sub-fe07c519-624b-4d80-a3e1-95c2f4b70d63";
export const SUB_DO_VIZINHO = "sub-90d3a68c-4f17-42be-8c05-e61b7d29a534";

export const ANALYSIS_CONCLUIDA = "an-5c2f8e13-7a04-4b69-9d81-3e0a6c47fb02";
export const ANALYSIS_FALHADA = "an-b71d4a06-2e58-4f93-8c07-6a1e9d34b502";

// ── A ARMADILHA ───────────────────────────────────────────────────────────────────────────

/**
 * O e-mail da CONTA. Vive em `account-language.ts` (`ana.ribeiro@cliente.test`) e é repetido aqui
 * como constante nomeada para que os gates possam afirmar a ausência dele — não para ser usado.
 *
 * Se algum dia esta string aparecer como `destination`, a M44 estará mandando aviso para o e-mail
 * de login em vez de para o endereço que alguém configurou. São coisas diferentes: uma é *quem
 * entrou*, a outra é *para onde avisar*, e elas divergem no minuto em que a operação quer que o
 * alerta caia numa caixa compartilhada.
 */
export const EMAIL_DA_CONTA = "ana.ribeiro@cliente.test";

/** O destino REAL da assinatura. Sem relação nenhuma com a conta — de propósito. */
export const DESTINO_CONFIGURADO = "alertas@operacoes.exemplo.test";

/** A preferência de idioma da CONTA na massa da M41/BD11. */
export const IDIOMA_DA_CONTA = "pt" as const;

/** O idioma da ENTREGA. Divergente, e legítimo: é a intenção congelada de quem assinou. */
export const IDIOMA_DA_ASSINATURA = "en" as const;

// ── Estados canônicos ─────────────────────────────────────────────────────────────────────

/**
 * O `created_at` das assinaturas criadas DENTRO de um cenário.
 *
 * Vive aqui, e não no catálogo, porque o gate da M18 é literal: o catálogo não redigita campo de
 * read model. Um `created_at` escrito à mão lá seria a segunda fonte da mesma massa.
 */
export const CRIADA_EM = "2026-08-15T00:00:00Z";

/** Ativa, verificada, canal `email`. `secret_version` existe mesmo sem segredo. */
export const ASSINATURA_ATIVA: SubscriptionView = {
  subscription_id: SUB_ATIVA,
  channel: "email",
  destination: DESTINO_CONFIGURADO,
  // Dois dos três eventos notificáveis com e-mail. O terceiro (`result.available`) fica de FORA
  // de propósito: é o que torna "quais eventos esta assinatura recebe" uma pergunta com resposta
  // observável, em vez de "todos".
  event_types: ["analysis.completed", "analysis.failed"],
  language: IDIOMA_DA_ASSINATURA,
  active: true,
  secret_version: 1,
  verified_at: "2026-07-02T14:20:00Z",
  created_at: "2026-06-28T09:05:00Z",
};

/**
 * Ativa e NÃO verificada — `verified_at: null`.
 *
 * Isto não é um estado de espera de ação da pessoa: não há o que confirmar. É a ausência de uma
 * entrega aceita até agora. Tratá-lo como "pendente" na UI inventaria um passo que o domínio não
 * tem, e a massa existe para que essa invenção fique visível.
 */
export const ASSINATURA_NAO_VERIFICADA: SubscriptionView = {
  subscription_id: SUB_NAO_VERIFICADA,
  channel: "webhook",
  destination: "https://hooks.operacoes.exemplo.test/sentinela",
  event_types: ["analysis.failed"],
  language: "pt",
  active: true,
  secret_version: 2,
  verified_at: null,
  created_at: "2026-07-19T11:47:00Z",
};

/** Desativada. **Continua existindo** — e é isso que a massa precisa mostrar. */
export const ASSINATURA_DESATIVADA: SubscriptionView = {
  subscription_id: SUB_DESATIVADA,
  channel: "email",
  destination: "plantao@operacoes.exemplo.test",
  event_types: ["analysis.completed"],
  language: "pt",
  active: false,
  secret_version: 1,
  verified_at: "2026-05-11T08:00:00Z",
  created_at: "2026-05-10T16:30:00Z",
};

/** A assinatura do OUTRO workspace. Existe para provar que ela nunca aparece na lista deste. */
export const ASSINATURA_DO_VIZINHO: SubscriptionView = {
  subscription_id: SUB_DO_VIZINHO,
  channel: "email",
  destination: "laboratorio@operacoes.exemplo.test",
  event_types: ["analysis.completed", "analysis.failed"],
  language: "en",
  active: true,
  secret_version: 1,
  verified_at: "2026-06-02T10:00:00Z",
  created_at: "2026-06-01T12:00:00Z",
};

/** O que cada workspace tem. É por aqui que o isolamento vira observável. */
export const POR_WORKSPACE: Readonly<Record<string, readonly SubscriptionView[]>> = {
  [WS_PRINCIPAL]: [ASSINATURA_ATIVA, ASSINATURA_NAO_VERIFICADA],
  [WS_VIZINHO]: [ASSINATURA_DO_VIZINHO],
};

/** O segredo revelado UMA vez, na criação de um webhook. */
export const SEGREDO_REVELADO: SubscriptionSecretView = {
  subscription_id: SUB_NAO_VERIFICADA,
  secret_version: 1,
  secret: "whsec_7f2a91c4e0d3",
};

/** Criação de canal `email`: `secret` é `null`, e a chave está presente. */
export const CRIADA_SEM_SEGREDO: SubscriptionSecretView = {
  subscription_id: SUB_ATIVA,
  secret_version: 1,
  secret: null,
};

// ── Os eventos, e o link que a mensagem carrega ───────────────────────────────────────────
//
// O Front NÃO tem operação pública que devolva evento: não há `GET /v1/events`, e o inventário
// de 27 operações não tem nada do gênero. Por isso estas massas são FIXTURE e não handler — elas
// representam o que a mensagem entregue carrega, e servem aos gates de reentrada.

/** O envelope público, campo a campo, de `contracts/public-events-v1.json`. */
export interface EventEnvelope {
  readonly event_id: string;
  readonly event_type: string;
  readonly event_schema_version: string;
  readonly analysis_id: string;
  readonly workspace_id: string;
  readonly sequence: number;
  readonly occurred_at: string;
  readonly data: Readonly<Record<string, unknown>>;
}

/**
 * O deep link, montado como o compositor monta — **um formato só, para os três eventos**.
 *
 * `event_dispatcher/adapters/email.py`:
 *
 *     link = f"{url_base.rstrip('/')}/analyses/{analysis_id}"
 *
 * Não há ramo por tipo de evento, e não existe `/analyses/{id}/result` como destino de mensagem.
 * A `url_base` é **configurada**; nada aqui a lê do envelope, porque URL vinda de payload é como
 * um e-mail nosso passa a apontar para o site de outra pessoa.
 */
export function linkDaMensagem(analysisId: string, urlBase = "https://app.sentinela.test"): string {
  return `${urlBase.replace(/\/+$/, "")}/analyses/${analysisId}`;
}

/**
 * `analysis.completed`. `data.result_available` vem da MASSA — nunca de inferência.
 *
 * O evento diz `completed` e diz, separadamente, se o resultado está legível. Derivar o segundo do
 * primeiro é a versão de "progresso inventado" aplicada a resultado: existem análises concluídas
 * cujo resultado ainda não está disponível, e é por isso que `result.available` é um evento à
 * parte no contrato.
 */
export const EVENTO_CONCLUIDA: EventEnvelope = {
  event_id: "evt-2d47c9a1-6b30-4e85-91f7-0c8a35e2d764",
  event_type: "analysis.completed",
  event_schema_version: "public-events-v1",
  analysis_id: ANALYSIS_CONCLUIDA,
  workspace_id: WS_PRINCIPAL,
  sequence: 7,
  occurred_at: "2026-08-03T17:12:44Z",
  data: { result_available: true },
};

/**
 * `analysis.failed`. `data.failure_stage` é o enum PÚBLICO — `input`/`execution`/`cancelled` — e
 * nada além dele descreve a causa.
 *
 * O contrato é explícito: o relatório terminal do Worker não carrega motivo, e inventar categorias
 * aqui seria fabricar causa técnica que a mensagem pública não expõe.
 */
export const EVENTO_FALHADA: EventEnvelope = {
  event_id: "evt-8e01b3f5-47d2-4a69-bc10-5f93a7e26d81",
  event_type: "analysis.failed",
  event_schema_version: "public-events-v1",
  analysis_id: ANALYSIS_FALHADA,
  workspace_id: WS_PRINCIPAL,
  sequence: 4,
  occurred_at: "2026-08-04T09:38:02Z",
  data: { failure_stage: "execution" },
};

/**
 * Concluída com o resultado **ainda não disponível**. O par que impede o atalho.
 *
 * Sem ela, `result_available` seria sempre `true` na massa e um Front que o derivasse do estado
 * passaria em tudo — o defeito só apareceria em produção, na primeira análise que concluísse antes
 * de o resultado ficar legível.
 */
export const EVENTO_CONCLUIDA_SEM_RESULTADO: EventEnvelope = {
  ...EVENTO_CONCLUIDA,
  event_id: "evt-4a92f60d-1c73-4b58-8e04-9d2b6c17e3f5",
  analysis_id: ANALYSIS_FALHADA,
  sequence: 9,
  data: { result_available: false },
};

/** Campos que o contrato de eventos declara NUNCA públicos. Os gates afirmam a ausência deles. */
export const NUNCA_PUBLICOS: readonly string[] = [
  "job_id",
  "attempt_id",
  "lease_token",
  "worker_id",
  "object_key",
  "presigned_url",
  "stack_trace",
  "internal_error_body",
  "result",
] as const;
