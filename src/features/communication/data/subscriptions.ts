// M44 · COM-01 — a comunicação autorizada do Workspace, pela fronteira PÚBLICA.
//
// ## As quatro operações, e nenhuma a mais
//
// `list` · `create` · `disable` · `rotate_secret`. O contrato vivo não publica ler-por-id,
// atualizar, verificar nem reativar, e um hook aqui para qualquer uma delas seria a tela nascendo
// sabendo pedir o que ninguém atende.
//
// ## Este módulo NÃO conhece Account
//
// `destination` e `language` são campos da ASSINATURA. Há duas fontes plausíveis e erradas a um
// passo daqui — o e-mail de login e a preferência de idioma da conta —, e usar qualquer uma delas
// não daria erro nenhum: daria o valor errado com `200`. Por isso não há import de Account neste
// arquivo, e há gate estrutural provando a ausência.
//
// ## O segredo não mora no cache
//
// `create` e `rotate` devolvem material de uso único. Ele é devolvido ao chamador e **não** entra
// em `setQueryData`: um cache com `gcTime` de cinco minutos guardaria credencial viva muito depois
// de a pessoa ter saído da tela, e ela apareceria de novo numa remontagem — sem ninguém ter pedido.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  workspaceKeys,
  type CreateSubscriptionInput,
  type SubscriptionDisabledView,
  type SubscriptionListPage,
  type SubscriptionSecretView,
  type SubscriptionView,
} from "@/lib/v1";
import { useV1Client } from "@/features/canonical-analysis/data/client";

/**
 * Os tipos de evento que o produto oferece.
 *
 * O dono aceita seis (`EVENTOS_NOTIFICAVEIS`), e o vocabulário só é publicado numa rota
 * **interna** — o Front não pode lê-lo. Estes três são os que o Blueprint §12 confirma como
 * comunicação existente, e são exatamente os que o compositor sabe redigir (`EVENTOS_COM_EMAIL`).
 * As outras três linhas do mapa estão marcadas 🔴 "evento não confirmado".
 *
 * Oferecer um subconjunto do que o dono aceita é decisão de PRODUTO registrada no Blueprint —
 * diferente de inventar um tipo, que faria a criação ser recusada.
 */
export const TIPOS_DE_EVENTO = [
  "analysis.completed",
  "analysis.failed",
  "result.available",
] as const;

export type TipoDeEvento = (typeof TIPOS_DE_EVENTO)[number];

/**
 * As assinaturas do workspace corrente.
 *
 * `retry: false` pela mesma razão da CFG-03: indisponibilidade do dono não pode virar ausência
 * silenciosa depois de algumas tentativas. Deixar o erro subir é o que permite a seção dizer
 * *indisponível* em vez de *você ainda não configurou* — e essas duas telas são opostas.
 */
export function useSubscriptions(
  workspaceId: string | null,
): UseQueryResult<SubscriptionListPage> {
  const client = useV1Client();
  return useQuery({
    queryKey: workspaceKeys.subscriptions(workspaceId ?? "idle"),
    enabled: Boolean(workspaceId),
    queryFn: ({ signal }) =>
      client.listSubscriptions({ workspaceId: workspaceId as string }, { signal }),
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Criar. Ação EXPLÍCITA, com os quatro campos publicados.
 *
 * O `onSuccess` **invalida** em vez de escrever a linha nova no cache, e a diferença importa: a
 * resposta de `create` é `{subscription_id, secret_version, secret}` — ela **não** é uma
 * `SubscriptionView`. Fabricar a linha a partir do rascunho poria na tela um objeto que o produtor
 * nunca mandou, e qualquer divergência (o `created_at` que ele carimba, um `destination` que ele
 * normalize) só apareceria depois de um reload.
 */
export function useCriarSubscription(
  workspaceId: string | null,
): UseMutationResult<SubscriptionSecretView, unknown, CreateSubscriptionInput> {
  const client = useV1Client();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubscriptionInput) =>
      client.createSubscription({ workspaceId: workspaceId as string }, input),
    onSuccess: () => {
      void cache.invalidateQueries({
        queryKey: workspaceKeys.subscriptions(workspaceId ?? "idle"),
      });
    },
  });
}

/**
 * Desativar. **Não apaga.**
 *
 * A resposta é `{subscription_id, active: false}`, e o cache é atualizado marcando a linha — não
 * removendo-a. O dono preserva a linha porque o histórico de entregas a referencia, e some-la aqui
 * faria *"desativei"* virar *"nunca configurei"*: a pessoa reconfiguraria por cima, e passaria a
 * ter duas.
 *
 * Sem otimismo: o estado confirmado só muda com a resposta. Uma remoção otimista que falhasse
 * teria de ressuscitar a linha na posição certa, e a lista vem ordenada pelo produtor.
 */
export function useDesativarSubscription(
  workspaceId: string | null,
): UseMutationResult<SubscriptionDisabledView, unknown, string> {
  const client = useV1Client();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      client.disableSubscription(subscriptionId, { workspaceId: workspaceId as string }),
    onSuccess: (resposta) => {
      const chave = workspaceKeys.subscriptions(workspaceId ?? "idle");
      cache.setQueryData<SubscriptionListPage>(chave, (atual) =>
        atual
          ? {
              items: atual.items.map((s) =>
                s.subscription_id === resposta.subscription_id
                  ? { ...s, active: resposta.active }
                  : s,
              ),
            }
          : atual,
      );
    },
  });
}

/**
 * Rotacionar o segredo. **Não é apagar e recriar** — a identidade é a mesma, e a versão sobe.
 *
 * Mudam DUAS coisas no estado confirmado, e a segunda quase me escapou: o dono faz
 * `secret_version = N+1` **e** `verified_at = null` no mesmo `update`. A verificação anterior era
 * sobre a chave velha, e mantê-la na tela diria "já recebeu com esta chave" sobre uma chave que
 * ainda não entregou nada. `destination`, `language`, `event_types` e `active` não são tocados
 * pela operação, e reescrevê-los aqui inventaria mudança que o produtor não fez.
 *
 * O `secret` da resposta **não entra no cache**. Ele volta para quem chamou, é exibido uma vez, e
 * morre com o componente.
 */
export function useRotacionarSegredo(
  workspaceId: string | null,
): UseMutationResult<SubscriptionSecretView, unknown, string> {
  const client = useV1Client();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      client.rotateSubscriptionSecret(subscriptionId, { workspaceId: workspaceId as string }),
    onSuccess: (resposta) => {
      const chave = workspaceKeys.subscriptions(workspaceId ?? "idle");
      cache.setQueryData<SubscriptionListPage>(chave, (atual) =>
        atual
          ? {
              items: atual.items.map((s) =>
                s.subscription_id === resposta.subscription_id
                  ? { ...s, secret_version: resposta.secret_version, verified_at: null }
                  : s,
              ),
            }
          : atual,
      );
    },
  });
}

/**
 * Um destino é preenchível?
 *
 * Recusa local mínima — só o vazio, que o produtor rejeitaria de qualquer jeito (`min_length 1`).
 * O que esta função **não** faz é validar formato de e-mail ou de URL: quem valida destino é o
 * dono, com política de segurança própria (`security/destino.py` recusa loopback, link-local e
 * multicast), e replicar aqui uma regra mais frouxa faria a tela aprovar o que o produtor recusa —
 * ou, pior, uma mais rígida faria a tela recusar o que ele aceita.
 */
export function destinoPreenchido(rascunho: string): boolean {
  return rascunho.trim().length > 0;
}

/** Ao menos um evento. `min_length 1` é do contrato. */
export function temEvento(eventos: readonly string[]): boolean {
  return eventos.length > 0;
}

/** Ordena para APRESENTAÇÃO sem tocar no que o produtor mandou: ativas primeiro, e dentro de cada
 *  grupo a ordem do servidor (ele já devolve por `created_at`). */
export function paraExibir(itens: readonly SubscriptionView[]): SubscriptionView[] {
  return [...itens.filter((s) => s.active), ...itens.filter((s) => !s.active)];
}
