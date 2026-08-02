// Adapter da listagem canônica para a forma que as telas de HISTÓRICO consomem.
//
// Existe para que cada tela migrada não reinvente o mapeamento — e, principalmente, para que a
// decisão sobre o que NÃO existe fique num lugar só. Sem este seam, cada página escolheria por
// conta própria o que exibir no lugar de `risk_level`, e uma delas escolheria `"low"`.

import type { AnalysisListItem, AnalysisStatus } from "@/lib/v1";

/**
 * Linha de histórico canônica.
 *
 * Os campos são `null` quando o backend não afirma o valor — e `null` aqui significa
 * **ausente**, nunca zero. A tela renderiza ausência como ausência (um traço), porque um `0`
 * numa coluna de contagem é lido como medição.
 *
 * `riskLevel` e `nIntents` do modelo legado **não existem** neste tipo, de propósito: não há
 * indicador de risco nem contagem de intents no registro canônico. Declará-los como
 * `null` sugeriria que um dia chegam pelo mesmo caminho; eles só chegam se o registro de
 * indicadores passar a medi-los.
 */
export interface LinhaHistorico {
  analysisId: string;
  status: AnalysisStatus;
  createdAt: string | null;
  /** Registros considerados na análise. */
  recordCount: number | null;
  /** Conversas observadas — indicador `observed_conversations`, só quando `measured`. */
  nConversations: number | null;
  engineVersion: string | null;
  /** `true` quando existe resultado canônico para abrir. */
  resultAvailable: boolean;
}

/** Projeta um item da listagem `/v1` na linha de histórico. Função pura, sem cálculo analítico. */
export function linhaHistoricoDe(item: AnalysisListItem): LinhaHistorico {
  return {
    analysisId: item.analysis_id,
    status: item.status,
    createdAt: item.created_at,
    recordCount: item.record_count,
    // `?? null` e não `?? 0`: o campo é opcional no contrato (cliente pode falar com um
    // Gateway anterior ao rc16), e ausência de campo é ausência de informação.
    nConversations: item.observed_conversations ?? null,
    engineVersion: item.engine_version ?? null,
    resultAvailable: item.result_available,
  };
}
