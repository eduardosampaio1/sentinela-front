// As larguras de barra do Diagnóstico, calculadas fora da árvore de componentes.
//
// Irmão de `barrasDaProjecao.ts`, e de propósito: a mesma forma, a MESMA regra de escala vinda de
// `escalaVisual.ts`. Duas cópias da pergunta "qual é a maior barra" divergiriam no primeiro ajuste.

import { escalar } from "./escalaVisual";
import type { PublicIntent, PublicMeasurement } from "@/lib/v1/contract/public-v3.types";
import type { ItemDeDominio } from "./dominiosDoArgos";
import { valorEscrito } from "./medicaoV3";

/**
 * O recorte MEDÍVEL de um item, qualquer que seja a família dele.
 *
 * O tipo é um `Pick` de propósito, e não `PublicMeasurement`: um indicador do v3 NÃO é uma medição
 * — é um tipo próprio, com `kind` e `state` que a medição não tem. O que os dois compartilham é
 * exatamente isto: valor, escala, unidade e moeda. Prometer `PublicMeasurement` aqui seria mentir
 * sobre o que chega, e o compilador cobrou.
 */
type Medivel = Pick<PublicMeasurement, "value" | "scale" | "unit"> & {
  readonly currency?: string | null;
};

function medicaoDe(entrada: ItemDeDominio): Medivel {
  return "measurement" in entrada.item ? entrada.item.measurement : entrada.item;
}

/**
 * O valor JÁ FORMATADO de um item, ou `null` quando não há número.
 *
 * `null` não é falha: é o léxico desta casa. Ausência tem palavra própria, e quem desenha escolhe
 * qual — nunca um zero, nunca um travessão fingindo número.
 */
export function valorDoItem(entrada: ItemDeDominio, locale: string): string | null {
  return valorEscrito(medicaoDe(entrada), locale);
}

/**
 * Uma largura por item, na ordem em que os itens vieram.
 *
 * ## Escala por ITEM, não por família
 *
 * Escalar contra o maior da lista é o que a barra de contagem faz, e aqui seria errado: estes itens
 * têm ESCALAS diferentes — razão 0..1, contagem, moeda. O maior valor absoluto seria sempre o de
 * moeda, e as razões virariam traços invisíveis ao lado dele.
 *
 * Então cada item é escalado contra o próprio limite quando a escala é conhecida (`ratio_unit` vai
 * de 0 a 1), e recebe largura cheia quando não há limite publicado — porque barra sem denominador
 * não mede nada, e fingir um denominador é inventar.
 */
export function largurasDeItens(itens: readonly ItemDeDominio[]): string[] {
  return itens.map((entrada) => {
    const m = medicaoDe(entrada);
    if (m.value === null || m.value === undefined) return "0%";
    if (m.scale.kind === "ratio_unit") {
      const limitado = m.value < 0 ? 0 : m.value > 1 ? 1 : m.value;
      return `${(limitado * 100).toFixed(1)}%`;
    }
    // Sem limite publicado, a barra não tem o que medir. Cheia é honesto: ela deixa de afirmar
    // proporção e passa a ser só presença — e o número ao lado continua dizendo tudo.
    return "100%";
  });
}

/**
 * Uma largura por intenção, na ordem em que as intenções vieram.
 *
 * ## Aqui eu divirjo do protótipo, e o motivo é uma regra desta casa
 *
 * O protótipo chamava esta peça de "barras ORDENADAS por intent" — ranking, maior no topo. Não
 * ordeno, e a razão é a mesma que esta visão já aplica a alertas: *"a ordem dos itens é a do
 * documento; reordenar seria priorização decidida no navegador"*. Pôr a intenção de maior amostra
 * no topo afirmaria que amostra grande importa mais, e ninguém publicou isso.
 *
 * A barra resolve o problema que o ranking queria resolver — achar a maior de relance — sem mover
 * nada de lugar. O olho ordena; a tela não.
 */
export function largurasDeSuporte(intents: readonly PublicIntent[]): string[] {
  const escala = escalar(intents.map((i) => i.support));
  return intents.map((i) => escala(i.support));
}
