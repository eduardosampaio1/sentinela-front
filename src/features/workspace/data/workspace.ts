// M42 · CFG-03 — o Workspace, lido e renomeado pela fronteira PÚBLICA.
//
// ## A decisão que dá razão a este arquivo existir
//
// O nome do espaço **vem daqui**, e não da claim. `GET /v1/me` projeta `workspaces[].name` do
// provedor de identidade, e o contrato é literal: essa projeção é de **bootstrap** e *"pode ficar
// velha após um rename"*. Ela autoriza e identifica contexto; ela não decide como o espaço se
// chama.
//
// O caso que separa os dois não dá erro nenhum: a claim responde `200`, o produtor responde `200`,
// e os dois nomes divergem. Quem lê o errado mostra o errado com confiança — por isso o hook de
// configuração **não** aceita a claim como fonte, e há gate provando a divergência.
//
// ## O que este módulo NÃO faz
//
// **Não cria nem exclui Workspace.** O contrato diz por escrito que o CRUD legado *não foi
// promovido*: provisionar espaço é ação administrativa, fora do produto. Não há `POST` nem
// `DELETE` aqui, nem desabilitados.
//
// **Não lista Workspaces.** Listar os espaços de alguém é MEMBERSHIP, e membership é do provedor
// de identidade — `GET /v1/me` já a projeta, sem I/O.
//
// **Não conhece o `sentinela-workspace`.** Nem URL interna, nem token S2S, nem tabela legada. O
// Front fala com o Gateway, e só.
//
// **Não é otimista.** O estado confirmado só muda com a resposta do servidor. Otimismo aqui faria
// a tela afirmar um nome que o `PATCH` pode ter recusado.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { workspaceKeys, type WorkspaceView } from "@/lib/v1";
import { useV1Client } from "@/features/canonical-analysis/data/client";

/**
 * O Workspace corrente, pelo produtor público. **A autoridade do nome.**
 *
 * `retry: false` pelo mesmo motivo da preferência de idioma da M41: indisponibilidade do owner não
 * pode virar ausência silenciosa depois de algumas tentativas. Deixar o erro subir é o que permite
 * a seção dizer *não consegui carregar* em vez de mostrar um nome vindo de outro lugar.
 */
export function useWorkspaceConfig(workspaceId: string | null): UseQueryResult<WorkspaceView> {
  const client = useV1Client();
  return useQuery({
    queryKey: workspaceKeys.config(workspaceId ?? "idle"),
    enabled: Boolean(workspaceId),
    queryFn: ({ signal }) => client.getWorkspace(workspaceId as string, { signal }),
    retry: false,
    staleTime: 60_000,
  });
}

/**
 * Renomear. A resposta do servidor entra no cache como estado confirmado.
 *
 * `setQueryData` com a resposta, e não `invalidate` seco: o produtor devolve **a linha
 * persistida**, então já temos o estado novo sem uma segunda ida à rede. O `invalidate` das
 * Instances **não** acontece aqui — renomear o espaço não toca Instance nenhuma, e invalidar por
 * precaução faria a tela recarregar dado que não mudou.
 */
export function useRenomearWorkspace(
  workspaceId: string | null,
): UseMutationResult<WorkspaceView, unknown, string> {
  const client = useV1Client();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => client.renameWorkspace(workspaceId as string, name),
    onSuccess: (novo) => {
      // A chave é a do `workspaceId` que ESTA instância do hook recebeu — a MESMA que
      // `useWorkspaceConfig` usa para ler. Escrever em `config(novo.workspace_id)` parecia mais
      // correto ("use a identidade que o servidor devolveu") e estava errado: quando o escopo
      // canônico e o `workspace_id` da resposta não são a mesma string, a escrita cai numa chave
      // que ninguém lê, e a seção fica para sempre no valor anterior.
      //
      // O browser encontrou isto; o vitest não podia, porque lá os dois valores são o mesmo por
      // construção do teste. É a diferença entre provar o componente e provar a composição.
      cache.setQueryData(workspaceKeys.config(workspaceId ?? "idle"), novo);
      // E, se o produtor devolveu outra identidade, a chave dela também recebe o estado — sem
      // isso, uma leitura por aquele id ficaria com dado velho.
      if (novo.workspace_id !== workspaceId) {
        cache.setQueryData(workspaceKeys.config(novo.workspace_id), novo);
      }
    },
  });
}

/**
 * Existe mudança a PERSISTIR?
 *
 * Comparação contra o nome CONFIRMADO, e com `trim` — espaço no fim não é uma escolha, e mandar
 * um `PATCH` por causa dele gastaria uma escrita para nada.
 *
 * O que esta função **não** faz é recusar: nome repetido não é conflito. O contrato declara a
 * ausência de unicidade em letras claras (*"dois times podem chamar o espaço de 'Produção'"*), e
 * bloquear aqui seria a tela inventando uma regra de produto.
 */
export function mudaONome(confirmado: string, rascunho: string): boolean {
  return rascunho.trim() !== confirmado;
}

/** Um nome vazio não é um nome. `min_length 1` é do contrato, e a recusa é local para não gastar
 *  uma viagem que o produtor rejeitaria de qualquer jeito. */
export function nomeEhValido(rascunho: string): boolean {
  return rascunho.trim().length > 0;
}
