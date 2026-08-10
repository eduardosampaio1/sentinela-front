// M30 — parear duas análises. Puro, e o que ele NÃO faz é o conteúdo da missão.
//
// ## Comparabilidade é pré-condição, não detalhe
//
// D26 (Product Freeze): *"Quebra de versão quebra a comparabilidade numérica. Mudou
// `indicator_registry_version` ou `measure_schema`: **não conectar valores como mesma série**.
// Descontinuidade explícita… **Nunca** representar como aumento ou queda."*
//
// A quebra é de DOCUMENTO, não de linha: se o vocabulário de indicadores mudou, nenhum par é
// comparável, mesmo que um `id` exista dos dois lados com o mesmo nome. `useful_outcome_rate` no
// registro 1.0 e no 2.0 podem ser fórmulas diferentes com a mesma etiqueta — e é exatamente esse
// o caso que um delta esconderia.
//
// ## Nenhum número é calculado aqui
//
// O `ComparisonRow` da M13 diz, na própria assinatura: *"Texto pronto, com sinal e unidade. O
// Front não calcula variação."* Nada no `analysis-result-v1/v2` publica delta entre duas
// análises, então `delta` é `null` — sempre, hoje. Inventar uma diferença absoluta ou um
// percentual seria produzir um número que contrato nenhum sustenta, e ele apareceria na tela com
// a mesma autoridade dos que foram medidos.
//
// ## Identidade, e só identidade
//
// O pareamento é por `indicator.id` — o id público do registro canônico. Nunca por rótulo
// traduzido (que muda com o idioma), nunca por posição (que muda com a ordem do documento),
// nunca por descrição. Casar por texto faria dois indicadores diferentes virarem série no dia em
// que alguém ajustasse uma tradução.
//
// ## Delta não é Drift
//
// Um valor mudou entre duas análises não é o Sentinela ter detectado Drift. Drift é do motor,
// tem definição própria e não chega ao documento público. Aqui não existe tendência, melhora,
// piora nem degradação: existem dois valores e a informação de se eles pertencem à mesma série.

import type { IndicatorView } from "./indicadores";

export interface LinhaDeComparacao {
  /** `indicator.id` — a identidade canônica, e a única chave de pareamento. */
  readonly id: string;
  readonly descriptor: IndicatorView["descriptor"];
  /** Já formatado pelo adapter. `null` é AUSÊNCIA — do indicador ou do valor —, nunca zero. */
  readonly antes: string | null;
  readonly depois: string | null;
  /** `true` quando os dois pontos pertencem à mesma série. */
  readonly comparavel: boolean;
}

export interface Comparacao {
  /** `false` quando o vocabulário mudou: NENHUMA linha é comparável. */
  readonly comparavel: boolean;
  readonly linhas: readonly LinhaDeComparacao[];
}

/**
 * Pareia por identidade e declara comparabilidade. Não ordena por variação — não há variação.
 *
 * A ordem é a do documento ATUAL, com o que só existe na anterior no fim: inventar uma ordem por
 * "quanto mudou" exigiria calcular o quanto, que é justamente o que não se faz.
 */
export function compararComAnterior(
  atual: { indicators: readonly IndicatorView[]; indicatorRegistryVersion: string },
  anterior: { indicators: readonly IndicatorView[]; indicatorRegistryVersion: string } | null,
): Comparacao | null {
  if (!anterior) return null;

  const comparavel = atual.indicatorRegistryVersion === anterior.indicatorRegistryVersion;
  const porId = new Map(anterior.indicators.map((i) => [i.id, i]));
  const linhas: LinhaDeComparacao[] = [];

  for (const i of atual.indicators) {
    const par = porId.get(i.id);
    porId.delete(i.id);
    linhas.push({
      id: i.id,
      descriptor: i.descriptor,
      antes: par?.display ?? null,
      depois: i.display,
      comparavel,
    });
  }

  // O que existia antes e sumiu continua visível: um indicador que desapareceu é informação, e
  // omiti-lo faria a análise parecer ter os mesmos indicadores de sempre.
  for (const restante of porId.values()) {
    linhas.push({
      id: restante.id,
      descriptor: restante.descriptor,
      antes: restante.display,
      depois: null,
      comparavel,
    });
  }

  return { comparavel, linhas };
}
