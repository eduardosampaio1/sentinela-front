// M36 — massa de Instance, derivada do produtor REAL congelado pela BD02.
//
// ## Por que estas fixtures existem, e por que não são "massa fabricada"
//
// A razão original do bloqueio do `instance-empty` dizia: *"Instância NÃO existe no contrato
// público. Não há operação, read model nem campo que a represente — servir uma lista vazia faria
// a tela montar e o delta parecer feito."* As três ausências acabaram: `create_instance`/
// `list_instances`/`get_instance` estão publicadas, `instance_read_model_fields` existe, e o E2E
// por processos reais provou a cadeia. Representar um produtor que existe é fixture; representar
// um que não existe é o que estava proibido.
//
// ## O shape é o publicado, e nada além
//
//     instance_read_model_fields = ["instance_id", "name", "created_at"]
//
// Sem `status`, `health`, contador, `description`, `tags`, `slug` ou `updated_at`. Nenhum deles
// existe no contrato — e é exatamente por isso que **INST-02 (Estado) não tem scenario**: ela pede
// "estado corrente" e o produtor não publica nenhum. Acrescentar um campo aqui para a tela ficar
// mais interessante seria pôr a mentira no mock.
//
// Valores são determinísticos de propósito: prova que muda de resultado entre execuções não é
// prova. O que vem do produtor é a ESTRUTURA e o significado; os literais são nossos.

import type { AnalysisListPage } from "@/lib/v1";

/** A Instance dos scenarios `instance-present` e `instance-history`. */
export const INSTANCIA = {
  instance_id: "inst-7c1e4a20-0000-4000-8000-000000000001",
  name: "Produção",
  created_at: "2026-07-20T09:00:00Z",
} as const;

/** Uma SEGUNDA Instance, para provar que o filtro do histórico seleciona de fato. */
export const OUTRA_INSTANCIA = {
  instance_id: "inst-9b2f6d31-0000-4000-8000-000000000002",
  name: "Homologação",
  created_at: "2026-07-22T14:30:00Z",
} as const;

/** Item de histórico: Analysis que declara pertencer à Instance.
 *
 * `instance_id` é obrigatório no read model publicado (`string | null`), e aqui ele é sempre
 * `string`: uma análise do histórico de uma Instance que viesse com `null` seria a associação
 * que a listagem afirma e o item nega.
 */
function analiseDaInstancia(
  analysis_id: string,
  over: Partial<AnalysisListPage["items"][number]> = {},
): AnalysisListPage["items"][number] {
  return {
    analysis_id,
    status: "completed",
    record_count: 1240,
    result_available: true,
    created_at: "2026-07-30T10:00:00Z",
    instance_id: INSTANCIA.instance_id,
    ...over,
  };
}

/** Primeira página do histórico — `next_cursor` presente, porque há mais. */
export const HISTORICO_PAGINA_1: AnalysisListPage = {
  items: [
    analiseDaInstancia("an-hist-0001"),
    analiseDaInstancia("an-hist-0002", {
      status: "failed",
      result_available: false,
      record_count: 300,
      created_at: "2026-07-29T16:20:00Z",
    }),
  ],
  next_cursor: "cursor-hist-2",
};

/** Segunda página — `next_cursor: null` fecha a travessia.
 *
 * Duas páginas, e não uma: uma página feliz não distingue paginação correta de ausência de
 * paginação, e o histórico da INST-03 é justamente a superfície em que a fronteira de página
 * precisa ser atravessada sem repetir nem perder linha.
 */
export const HISTORICO_PAGINA_2: AnalysisListPage = {
  items: [
    analiseDaInstancia("an-hist-0003", {
      status: "running",
      result_available: false,
      record_count: null,
      created_at: "2026-07-28T08:05:00Z",
    }),
  ],
  next_cursor: null,
};
