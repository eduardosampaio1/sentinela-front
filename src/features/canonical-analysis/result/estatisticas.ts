// As estatísticas de concentração do Analytics — quais delas têm rótulo humano.
//
// ## Por que um registro, e não uma tradução direta
//
// `statistic_id` é vocabulário ABERTO: o contrato público não declara a lista, exatamente como o
// `reason_code`. Traduzir tudo obrigaria a adivinhar nomes que o backend ainda pode criar, e
// indicador novo aparecendo com rótulo adivinhado é o defeito que `descriptors.ts` existe para
// impedir — a mesma regra, escrita lá, de que *"sem descritor sai o `id` cru, nunca um rótulo
// adivinhado"*.
//
// Então o desenho é o do ARGOS, e não um novo: quem está aqui ganha rótulo; quem não está aparece
// como o id. Feio e honesto vence bonito e inventado.
//
// Os quatro abaixo são os que as massas publicadas usam hoje, e os rótulos LEEM o id — não
// acrescentam semântica que o produtor não deu.

/** Os ids com rótulo publicado. A chave i18n é `analyticsView.statistic.<id>`. */
const CONHECIDAS = new Set([
  "gini",
  "top_10_share",
  "top_20_percent_volume_share",
  "population_share_required_for_80_percent_volume",
]);

/**
 * Esta estatística tem rótulo humano?
 *
 * Devolve `false` para tudo que o registro não conhece — e é esse `false` que mantém o id cru na
 * tela em vez de uma chave de i18n vazando como texto.
 */
export function estatisticaConhecida(id: string): boolean {
  return CONHECIDAS.has(id);
}
