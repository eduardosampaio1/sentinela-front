// M26 — "o que merece atenção", e o que essa frase NÃO autoriza.
//
// O Blueprint define a região com a fonte de verdade explícita: *"derivado do documento canônico
// (ordenação, sem recálculo)"*. As duas metades importam.
//
// **Derivado do documento** significa que o motivo é DECLARADO pela origem, nunca deduzido aqui.
// São dois, e os dois já existem no view model porque o contrato os publica:
//
//   `outOfRange`           a origem declarou a unidade, e o valor está fora da faixa dela
//   `partially_measured`   a origem declarou que mediu parte da amostra
//
// **Sem recálculo** significa que este módulo não toca em valor nenhum. Ele não pontua, não
// pondera, não soma, não compara indicadores entre si e não produz nota. Ele ORDENA e FILTRA — e
// os itens que devolve são os mesmos objetos que a seção de indicadores recebe.
//
// ## Por que isto não é um score
//
// Um "AI score" agregado seria a coisa mais fácil de escrever aqui e a mais cara de defender: o
// número não existe em contrato nenhum, e a tela passaria a afirmar uma medida que o backend
// nunca produziu. Behavior Score, Drift, Confidence e risco não chegam ao `analysis-result-v1/v2`
// — existem em material de produto e no motor, não no documento. Landing não é autoridade de
// resultado.
//
// ## Ausência não entra
//
// Indicador não medido (`unavailable`, `not_applicable`) **não** aparece aqui. Ausência não é
// anomalia: tratá-la como algo a resolver transformaria "ninguém mediu" em "algo está errado",
// que é a mesma falácia do zero-por-ausência, com outra roupa.

import type { IndicatorView } from "./indicadores";

/** Por que a origem assinalou este indicador. Fechado: dois motivos, ambos publicados. */
export type MotivoDeAtencao = "out_of_range" | "partially_measured";

export interface ItemDeAtencao {
  readonly item: IndicatorView;
  readonly motivo: MotivoDeAtencao;
}

/**
 * Precedência dos motivos. `out_of_range` vem antes porque é uma afirmação sobre o VALOR — ele
 * está fora do que a própria unidade admite —, enquanto `partially_measured` é uma afirmação
 * sobre a COBERTURA: o número é válido, só não cobre tudo.
 */
const ORDEM: readonly MotivoDeAtencao[] = ["out_of_range", "partially_measured"];

function motivoDe(item: IndicatorView): MotivoDeAtencao | null {
  if (item.outOfRange) return "out_of_range";
  if (item.state === "partially_measured") return "partially_measured";
  return null;
}

/**
 * Os indicadores assinalados pelo documento, em ordem de leitura.
 *
 * Estável dentro de cada motivo: a ordem de entrada é a do documento, e preservá-la evita que a
 * tela invente uma segunda hierarquia entre itens que a origem tratou como iguais.
 */
export function ordenarPorAtencao(
  indicators: readonly IndicatorView[],
): readonly ItemDeAtencao[] {
  const marcados = indicators
    .map((item) => ({ item, motivo: motivoDe(item) }))
    .filter((x): x is ItemDeAtencao => x.motivo !== null);

  return ORDEM.flatMap((motivo) => marcados.filter((x) => x.motivo === motivo));
}
