// Query keys CANÔNICAS — SEMPRE tenant-scoped (começam por ["workspace", workspaceId, …]).
//
// Regra da E1: NUNCA usar ["analyses"] sozinho. O workspace prefixa toda chave, de modo que a
// troca de workspace isola o cache por construção e uma resposta tardia do workspace antigo não
// contamina o novo contexto.

export const workspaceKeys = {
  /** Raiz de tudo de um workspace — usada para cancelar/remover em bloco na troca. */
  root: (workspaceId: string) => ["workspace", workspaceId] as const,
  analyses: (workspaceId: string) => ["workspace", workspaceId, "analyses"] as const,
  list: (workspaceId: string, params?: { limit?: number; cursor?: string | null }) =>
    ["workspace", workspaceId, "analyses", "list", params ?? {}] as const,
  detail: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId] as const,
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
  /** M20 — progresso por eixo. Tenant-scoped como todo o resto: a troca de workspace isola. */
  progress: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "progress"] as const,
  /** M27 — projeção analítica, lida independentemente do documento de resultado. */
  analytics: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "analytics"] as const,
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
