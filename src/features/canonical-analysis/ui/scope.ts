// Escopo canônico da jornada = workspace ativo do contexto autenticado (Onda 6 E2, item 2).
//
// project/environment (contexto de produto legado de 3 níveis) NÃO entram no /v1 nesta etapa —
// gap backend-first registrado. `null` = workspace ainda não carregado/selecionado.

import { useAuth } from "@/hooks/useAuth";
import type { CanonicalScope } from "@/lib/v1";

export function useCanonicalScope(): CanonicalScope | null {
  const { workspace } = useAuth();
  const id = workspace?.id;
  return id ? { workspaceId: id } : null;
}
