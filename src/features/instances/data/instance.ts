// M36 — os hooks de dado da Instância. Consomem SÓ `@/lib/v1`, como toda a jornada canônica.
//
// Três hooks e nenhuma regra: quem decide o que é Instância é o backend, e o que estas funções
// fazem é buscar. Não há cálculo de estado, contagem nem inferência aqui — e não é omissão, é a
// razão pela qual INST-02 ficou fora da missão: o contrato publica `instance_id`, `name` e
// `created_at`, e mais nada.
//
// A query key é SEMPRE workspace-scoped, pelo mesmo motivo do resto da jornada: trocar de
// workspace tem de invalidar o cache por construção, não por alguém lembrar de limpar.
//
// O histórico usa chave PRÓPRIA (`instanceHistory`), separada da listagem geral. As duas leem
// `GET /v1/analyses`, mas com filtros diferentes — compartilhar chave faria a lista da Home e o
// histórico de uma Instância se sobrescreverem no cache.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  workspaceKeys,
  type AnalysisListPage,
  type CanonicalScope,
  type InstanceListPage,
  type InstanceView,
} from "@/lib/v1";
import { useV1Client } from "@/features/canonical-analysis/data/client";

const IDLE_KEY = ["instances", "idle"] as const;

/** As Instâncias do workspace. Lista vazia é sucesso — workspace sem Instância é estado legítimo. */
export function useInstancesList(scope: CanonicalScope | null): UseQueryResult<InstanceListPage> {
  const client = useV1Client();
  return useQuery({
    queryKey: scope ? workspaceKeys.instances(scope.workspaceId) : IDLE_KEY,
    enabled: Boolean(scope),
    queryFn: ({ signal }) =>
      client.listInstances({ workspaceId: (scope as CanonicalScope).workspaceId }, { signal }),
  });
}

/** UMA Instância, pela identidade durável.
 *
 * Busca direta e não leitura do cache da listagem: é isso que sustenta deep link, refresh e carga
 * fria. Derivar a Instância de uma lista carregada antes faria a tela funcionar na navegação
 * interna e quebrar quando alguém colasse a URL.
 */
export function useInstance(
  scope: CanonicalScope | null,
  instanceId: string | undefined,
): UseQueryResult<InstanceView> {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && instanceId ? workspaceKeys.instance(scope.workspaceId, instanceId) : IDLE_KEY,
    enabled: Boolean(scope && instanceId),
    queryFn: ({ signal }) =>
      client.getInstance(instanceId as string, { workspaceId: (scope as CanonicalScope).workspaceId }, { signal }),
  });
}

/** O histórico da Instância: a listagem canônica de análises, FILTRADA.
 *
 * Não existe subrecurso `/v1/instances/{id}/analyses` — a BD02 recusou criá-lo, e o histórico é
 * a operação de sempre com `instance_id`. O cursor é opaco: o front repassa o `next_cursor` que
 * recebeu e nunca deriva offset dele.
 */
export function useInstanceHistory(
  scope: CanonicalScope | null,
  instanceId: string | undefined,
  cursor?: string | null,
): UseQueryResult<AnalysisListPage> {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && instanceId
        ? workspaceKeys.instanceHistory(scope.workspaceId, instanceId, { cursor: cursor ?? null })
        : IDLE_KEY,
    enabled: Boolean(scope && instanceId),
    queryFn: ({ signal }) =>
      client.list(
        {
          workspaceId: (scope as CanonicalScope).workspaceId,
          instanceId,
          cursor: cursor ?? undefined,
        },
        { signal },
      ),
  });
}
