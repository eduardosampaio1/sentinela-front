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
 * O limite em que o número vive, LIDO do contrato — nunca inventado aqui.
 *
 * ## Eu tinha subestimado o que o contrato publica
 *
 * A versão anterior desta função tratava só `ratio_unit` e dava barra cheia para todo o resto,
 * porque eu acreditava que o limite não era publicado. Está publicado, e em dois lugares:
 *
 *   `scale.minimum` / `scale.maximum`   explícitos, quando o produtor os declara
 *   `scale.kind`                        `ratio_unit` é 0..1 e `score_100` é 0..100 por definição
 *
 * O docblock do próprio `Scale` diz: *"a faixa em que o número vive. Declarada, nunca inferida."*
 *
 * `percent` fica de FORA de propósito: o nome sugere 0..100, mas percentual de crescimento passa
 * de 100 e percentual de queda é negativo. Sem `maximum` explícito, não há limite — e chutar 100
 * seria a inferência que este arquivo existe para não fazer.
 *
 * `currency`, `count`, `duration` e `raw` não têm teto natural. Sem `maximum`, não há denominador.
 */
function limiteDe(m: Medivel): { readonly min: number; readonly max: number } | null {
  const { kind, minimum, maximum } = m.scale;
  if (minimum !== null && minimum !== undefined && maximum !== null && maximum !== undefined) {
    return maximum > minimum ? { min: minimum, max: maximum } : null;
  }
  if (kind === "ratio_unit") return { min: 0, max: 1 };
  if (kind === "score_100") return { min: 0, max: 100 };
  return null;
}

/**
 * Uma largura por item, na ordem em que os itens vieram.
 *
 * ## Escala por ITEM, não por família
 *
 * Escalar contra o maior da lista seria errado aqui: estes itens têm escalas diferentes — razão
 * 0..1, escore 0..100, contagem, moeda. O maior valor absoluto seria sempre o de moeda, e as razões
 * virariam traços invisíveis ao lado dele. Cada item é medido contra o PRÓPRIO limite.
 *
 * ## Sem limite publicado, a barra fica CHEIA — decisão de owner
 *
 * Eu havia recomendado não desenhar barra nenhuma nesse caso, e o owner escolheu a barra cheia.
 * O risco fica registrado: cheia pode ser lida como "está no máximo", e ninguém publicou máximo.
 * O que reduz o risco é que o número aparece ao lado em todas as linhas, e que agora este caso é
 * RARO — com `minimum`/`maximum`, `ratio_unit` e `score_100` cobertos, sobra moeda, contagem e
 * duração sem teto declarado.
 */
export function largurasDeItens(itens: readonly ItemDeDominio[]): string[] {
  return itens.map((entrada) => {
    const m = medicaoDe(entrada);
    if (m.value === null || m.value === undefined) return "0%";
    const limite = limiteDe(m);
    if (limite === null) return "100%";
    const fracao = (m.value - limite.min) / (limite.max - limite.min);
    const limitada = fracao < 0 ? 0 : fracao > 1 ? 1 : fracao;
    return `${(limitada * 100).toFixed(1)}%`;
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
