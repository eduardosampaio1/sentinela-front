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
