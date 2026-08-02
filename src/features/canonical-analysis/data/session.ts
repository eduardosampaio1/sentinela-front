// Sessão canônica: quem sou eu e a que workspaces pertenço. Consome SÓ `@/lib/v1`.
//
// Fonte ÚNICA da verdade de membership. O frontend não mantém lista autoritativa, não a deriva
// de dado local antigo e não completa a resposta com outra fonte — se `/v1/me` não afirma, o
// usuário não pertence.
//
// A query key NÃO é workspace-scoped, e essa é a exceção correta: esta é a chamada que descobre
// quais workspaces existem. Prefixá-la por workspace seria exigir a resposta como pergunta.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { MeView, WorkspaceMembershipView } from "@/lib/v1";
import { useV1Client } from "./client";

export const sessionKeys = {
  /** Raiz da sessão — invalidar isto é o que faz a troca de identidade ser observada. */
  me: () => ["session", "me"] as const,
} as const;

/** Projeção autenticada da sessão. `enabled: false` enquanto não há token. */
export function useSession(autenticado: boolean): UseQueryResult<MeView> {
  const client = useV1Client();
  return useQuery({
    queryKey: sessionKeys.me(),
    enabled: autenticado,
    queryFn: ({ signal }) => client.me({ signal }),
    // A membership muda por ação administrativa no Keycloak, não pelo uso do app. Revalidar a
    // cada foco de janela geraria tráfego sem informação nova; o token expirando já força o
    // recarregamento pela via do 401.
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/**
 * Resolve o workspace ATIVO a partir da preferência local, validando contra a lista projetada.
 *
 * A preferência é do frontend; a autoridade é do Gateway. Um id guardado no `localStorage` que
 * não esteja na projeção é **descartado** — pode ser de um workspace do qual o usuário foi
 * removido, e honrá-lo faria a UI pedir dados que o backend vai negar, produzindo uma tela de
 * erro no lugar de um seletor correto.
 *
 * Sem preferência válida, cai no primeiro da lista (ordem do Gateway). Lista vazia → `null`,
 * que é um estado legítimo: "não pertenço a nenhum workspace" ≠ "minha sessão morreu".
 */
export function resolverWorkspaceAtivo(
  workspaces: readonly WorkspaceMembershipView[],
  preferenciaLocal: string | null,
): WorkspaceMembershipView | null {
  if (workspaces.length === 0) return null;
  const preferido = preferenciaLocal
    ? workspaces.find((w) => w.id === preferenciaLocal)
    : undefined;
  return preferido ?? workspaces[0];
}
