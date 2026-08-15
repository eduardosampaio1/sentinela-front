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

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  workspaceKeys,
  type AnalysisListPage,
  type BaselineView,
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

// ── M40 · INST-05 — a Baseline Reference (BD10) ──────────────────────────────
//
// Quatro operações e NENHUMA regra, como o resto deste arquivo. Quem decide o que é elegível é o
// backend, e o que estas funções fazem é buscar e transportar.
//
// A ausência mais importante aqui é a de um filtro: `useBaselineCandidates` **não** recorta a
// listagem por `status === "completed"` nem por `instance_id`. Ele pede a consulta que o produtor
// já carimba. Recortar aqui faria a regra de elegibilidade existir em dois lugares — e o Front
// seria o errado.

/** O ponteiro atual. `baseline_analysis_id: null` é `NO_BASELINE`: estado legítimo, nunca erro. */
export function useBaseline(
  scope: CanonicalScope | null,
  instanceId: string | undefined,
): UseQueryResult<BaselineView> {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && instanceId
        ? workspaceKeys.instanceBaseline(scope.workspaceId, instanceId)
        : IDLE_KEY,
    enabled: Boolean(scope && instanceId),
    queryFn: ({ signal }) =>
      client.getBaseline(
        instanceId as string,
        { workspaceId: (scope as CanonicalScope).workspaceId },
        { signal },
      ),
  });
}

/** Os CANDIDATOS — a listagem canônica com os dois filtros que o produtor exige.
 *
 * Chave própria, separada do histórico da Instance: as duas leem `GET /v1/analyses`, e
 * compartilhar chave faria o conjunto filtrado sobrescrever o histórico no cache — a INST-03
 * passaria a mostrar só as concluídas sem ninguém ter pedido isso.
 */
export function useBaselineCandidates(
  scope: CanonicalScope | null,
  instanceId: string | undefined,
): UseQueryResult<AnalysisListPage> {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && instanceId
        ? workspaceKeys.baselineCandidates(scope.workspaceId, instanceId)
        : IDLE_KEY,
    enabled: Boolean(scope && instanceId),
    queryFn: ({ signal }) =>
      client.list(
        {
          workspaceId: (scope as CanonicalScope).workspaceId,
          instanceId,
          baselineEligible: true,
        },
        { signal },
      ),
  });
}

/** Elege — ou TROCA. Uma chamada só: a substituição é atômica no produtor, e passar por
 *  `clearBaseline` antes abriria uma janela sem régua que o contrato não tem. */
export function useDefinirBaseline(): UseMutationResult<
  BaselineView,
  unknown,
  { scope: CanonicalScope; instanceId: string; analysisId: string }
> {
  const client = useV1Client();
  return useMutation({
    mutationFn: ({ scope, instanceId, analysisId }) =>
      client.setBaseline(instanceId, analysisId, scope),
  });
}

/** Remove. Idempotente no produtor; a UI não precisa oferecer a ação quando não há régua. */
export function useRemoverBaseline(): UseMutationResult<
  BaselineView,
  unknown,
  { scope: CanonicalScope; instanceId: string }
> {
  const client = useV1Client();
  return useMutation({
    mutationFn: ({ scope, instanceId }) => client.clearBaseline(instanceId, scope),
  });
}

/**
 * M42 · CFG-04 — renomear a Instância. `name` é o ÚNICO atributo configurável dela na V1.
 *
 * ## O que esta mutação deliberadamente NÃO invalida
 *
 * **O baseline.** `instance_rename.nao_toca` lista `baseline_analysis_id` e `baseline_set_at`, e o
 * cache reflete isso: só a chave da própria Instance e a listagem que a exibe são atualizadas. Um
 * `invalidateQueries({ queryKey: workspaceKeys.instance(...) })` seco arrastaria a régua junto —
 * e a tela mostraria o seletor de baseline recarregando, ou vazio por um instante, como se
 * renomear tivesse mexido nela.
 *
 * **Nada de recreate.** A resposta é a linha persistida, com o MESMO `instance_id`. O cache é
 * atualizado no lugar; não há remoção seguida de inserção, e nenhuma navegação muda de identidade.
 *
 * Nome duplicado é sucesso: o contrato declara a ausência de unicidade, e a mutação não filtra.
 */
export function useRenomearInstancia(): UseMutationResult<
  InstanceView,
  unknown,
  { scope: CanonicalScope; instanceId: string; name: string }
> {
  const client = useV1Client();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ scope, instanceId, name }) => client.renameInstance(instanceId, scope, name),
    onSuccess: (nova, { scope }) => {
      cache.setQueryData(workspaceKeys.instance(scope.workspaceId, nova.instance_id), nova);
      // A LISTAGEM exibe o nome, então ela reconcilia — mas por reescrita do item, não por
      // refetch: o produtor já devolveu a linha, e uma segunda ida à rede só adiaria a verdade.
      cache.setQueryData<InstanceListPage>(
        workspaceKeys.instances(scope.workspaceId),
        (pagina) =>
          pagina
            ? {
                ...pagina,
                items: pagina.items.map((i) =>
                  i.instance_id === nova.instance_id ? nova : i,
                ),
              }
            : pagina,
      );
    },
  });
}
