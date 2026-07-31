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
  status: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "status"] as const,
  result: (workspaceId: string, analysisId: string) =>
    ["workspace", workspaceId, "analyses", "detail", analysisId, "result"] as const,
} as const;
