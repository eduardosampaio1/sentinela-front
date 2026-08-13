// F3 — a leitura do documento ARGOS. **O único lugar do frontend que pede o v3.**
//
// Módulo próprio, e não mais um hook em `data/analysis.ts`, por duas razões que se reforçam:
//
//   1. **A negociação de versão fica visível.** Quem procura "quem pede v3?" acha um arquivo, não
//      uma linha no meio de nove hooks. E o gate que impede as superfícies legadas de negociarem
//      continua podendo afirmar, sobre `data/analysis.ts`, que ali ninguém pede versão.
//   2. **A visão ARGOS tem fonte única.** Este módulo não sabe o que é `/analytics`, e é assim
//      que a fronteira entre os dois motores para de depender de disciplina.
//
// ## Sem queda silenciosa
//
// Pedir v3 e receber v1 seria o pior desfecho possível: sete famílias ausentes lidas como "o
// ARGOS não produziu nada", sem nada na resposta que o denuncie. O produtor não faz isso — ele
// devolve problema explícito — e este módulo também não: um documento que não se declara v3 é
// recusado aqui, e a tela mostra indisponibilidade, não um resultado parecido.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { workspaceKeys, type AnalysisResultView, type CanonicalScope } from "@/lib/v1";
import { useV1Client } from "./client";
import { PEDIDO_DE_V3 } from "../result/contratoV3";

const IDLE_KEY = ["argos", "idle"] as const;

/**
 * Chave de cache PRÓPRIA, separada da do `/result`.
 *
 * A mesma análise tem dois documentos servidos pela mesma rota, distinguidos só pela query. Uma
 * chave compartilhada faria o v3 sobrescrever o v1 no cache (ou o contrário), e a tela legada
 * passaria a receber, sem pedir, o documento da outra.
 */
export function chaveDoArgos(workspaceId: string, analysisId: string) {
  return [...workspaceKeys.result(workspaceId, analysisId), "v3"] as const;
}

/**
 * `GET /v1/analyses/{id}/result?result_schema_version=3`.
 *
 * A versão é pedida SEMPRE e EXPLICITAMENTE. Sem ela a rota devolveria o documento histórico
 * (v2 se existir, senão v1) — que é o comportamento certo para quem não negocia e o errado para
 * uma visão que existe para mostrar o ARGOS inteiro.
 */
export function useAnalysisArgos(
  scope: CanonicalScope | null,
  analysisId: string | null,
  habilitado = true,
): UseQueryResult<AnalysisResultView> {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && analysisId ? chaveDoArgos(scope.workspaceId, analysisId) : IDLE_KEY,
    enabled: Boolean(scope && analysisId) && habilitado,
    queryFn: ({ signal }) =>
      client.getResult(
        analysisId as string,
        scope as CanonicalScope,
        { signal },
        PEDIDO_DE_V3,
      ),
  });
}
