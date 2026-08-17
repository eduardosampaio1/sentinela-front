// As larguras de barra do Diagnóstico, calculadas fora da árvore de componentes.
//
// Irmão de `barrasDaProjecao.ts`, e de propósito: a mesma forma, a MESMA regra de escala vinda de
// `escalaVisual.ts`. Duas cópias da pergunta "qual é a maior barra" divergiriam no primeiro ajuste.

import { escalar } from "./escalaVisual";
import type { PublicIntent } from "@/lib/v1/contract/public-v3.types";

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
