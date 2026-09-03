// Query keys CANÔNICAS — SEMPRE tenant-scoped (começam por ["workspace", workspaceId, …]).
//
// Regra da E1: NUNCA usar ["analyses"] sozinho. O workspace prefixa toda chave, de modo que a
// troca de workspace isola o cache por construção e uma resposta tardia do workspace antigo não
// contamina o novo contexto.

export const workspaceKeys = {
  /** Raiz de tudo de um workspace — usada para cancelar/remover em bloco na troca. */
  root: (workspaceId: string) => ["workspace", workspaceId] as const,
  analyses: (workspaceId: string) => ["workspace", workspaceId, "analyses"] as const,
  list: (
    workspaceId: string,
    // `instanceId` entra na CHAVE, e nao so na query: sem ele a lista filtrada leria do cache da
    // lista geral e mostraria analises de outra Instancia sem nenhuma requisicao acontecer.
    params?: { limit?: number; cursor?: string | null; instanceId?: string; query?: string },
  ) =>
    ["workspace", workspaceId, "analyses", "list", params ?? {}] as const,
  detail: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId] as const,
  /**
   * M42 · CFG-03 — a CONFIGURAÇÃO do workspace (nome autoritativo), sob a MESMA raiz.
   *
   * Sob `["workspace", id]` porque trocar de workspace tem de invalidá-la junto com o resto. E
   * chave PRÓPRIA, separada de `instances`: são donos diferentes, e um `invalidate` da
   * configuração do espaço não pode arrastar o cache das Instances.
   */
  config: (workspaceId: string) => ["workspace", workspaceId, "config"] as const,
  /**
   * BD14/M44 — a comunicação autorizada DESTE workspace.
   *
   * Sob a raiz do workspace, e não numa raiz própria como `accountKeys`: a assinatura **é**
   * tenant-scoped — o produtor exige `workspace_id` nas quatro operações e o usa no `where`.
   * Pô-la fora da raiz faria a lista do espaço A sobreviver à troca para o B e aparecer como se
   * fosse dele.
   *
   * Chave IRMÃ de `config`, e não filha: renomear o espaço não muda quem recebe aviso, e
   * invalidar uma não pode arrastar a outra.
   */
  subscriptions: (workspaceId: string) => ["workspace", workspaceId, "subscriptions"] as const,
  /** BD02 — Instances do workspace. Mesma raiz: trocar de workspace invalida tudo junto. */
  instances: (workspaceId: string) => ["workspace", workspaceId, "instances"] as const,
  instance: (workspaceId: string, instanceId: string) =>
    ["workspace", workspaceId, "instances", "detail", instanceId] as const,
  /** Histórico DA Instance: é a listagem de analyses com o filtro, e a chave diz isso — cache
   *  separado da listagem geral, senão uma invalidaria a outra sem relação. */
  instanceHistory: (workspaceId: string, instanceId: string, params?: { cursor?: string | null }) =>
    ["workspace", workspaceId, "analyses", "list", { instanceId, ...(params ?? {}) }] as const,
  /** BD10 — o ponteiro de baseline da Instance. Chave PRÓPRIA, sob a raiz da Instance: a troca
   *  de baseline invalida esta e não a identidade, que não mudou. */
  instanceBaseline: (workspaceId: string, instanceId: string) =>
    ["workspace", workspaceId, "instances", "detail", instanceId, "baseline"] as const,
  /** BD10 — os CANDIDATOS a referência. É a listagem de analyses com dois filtros, e a chave diz
   *  isso: cache separado do histórico da Instance, senão o filtro de elegibilidade contaminaria
   *  a lista que a INST-03 mostra. */
  baselineCandidates: (workspaceId: string, instanceId: string) =>
    ["workspace", workspaceId, "analyses", "list", { instanceId, baselineEligible: true }] as const,
  status: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "status"] as const,
  /**
   * O perfil e a sugestao de mapeamento. Tenant-scoped como todo o resto.
   *
   * Chave PROPRIA e nao um pedaco de `status`: as duas mudam por motivos diferentes. O
   * status muda o tempo todo (polling); o mapeamento so muda quando alguem confirma. Junta-
   * las faria o perfil ser refeito a cada batida do relogio, e perfilar LE o arquivo.
   */
  mapping: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "mapping"] as const,
  /** M20 — progresso por eixo. Tenant-scoped como todo o resto: a troca de workspace isola. */
  progress: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "progress"] as const,
  /** M27 — projeção analítica, lida independentemente do documento de resultado. */
  analytics: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "analytics"] as const,
  analyticsPlayground: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "analytics", "playground"] as const,
  context: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "context"] as const,
  review: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "review"] as const,
  reviewActions: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "review", "actions"] as const,
  reviewFeedback: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "review", "feedback"] as const,
  ask: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "ask"] as const,
  result: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "result"] as const,
  /**
   * M23 — eventos duráveis. Cacheável, ao contrário da capability de export: aqui o que se
   * guarda é história gravada, não credencial de cinco minutos.
   */
  timeline: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "timeline"] as const,
} as const;

/**
 * A conta — e ela NÃO é tenant-scoped, ao contrário de todo o resto deste arquivo.
 *
 * `workspaceKeys` prefixa tudo por `["workspace", id]` porque trocar de workspace precisa isolar o
 * cache. A preferência de idioma é **global por usuário**: pô-la sob a raiz do workspace faria a
 * troca de workspace descartá-la e refetchá-la — e, pior, ensinaria que ela pode diferir entre
 * workspaces, que é exatamente a partição que a BD11 recusou.
 *
 * Raiz própria, então, e curta: quem sou eu não depende de onde estou.
 */
export const accountKeys = {
  root: () => ["account"] as const,
  /** Identidade (`GET /v1/me`). Projeção de claims, sem I/O de domínio. */
  me: () => ["account", "me"] as const,
  /** Preferência de idioma (`GET /v1/me/language`). Chave IRMÃ da identidade, não filha: as duas
   *  falham de formas diferentes, e invalidar uma não pode invalidar a outra. */
  language: () => ["account", "language"] as const,
};
