// O LÉXICO DE VALOR DE MEDIDA — os tipos e as duas regras puras.
//
// Separado de `Medida.tsx` porque as regras aqui não precisam de React para existir nem para
// serem provadas. `tomPelaFaixa` é a regra de julgamento do sistema inteiro: ela decide se um
// número tem direito a cor semântica. Uma regra dessa importância merece ser testável sem
// montar árvore.
//
// (O gate de lint cobra a mesma separação por outro motivo — um arquivo que exporta componente
// e função pura quebra o fast refresh. As duas razões apontam para o mesmo arquivo.)
//
// O nome NÃO é `medida.ts`. Num sistema de arquivos que não distingue maiúsculas — o do Windows,
// onde este repositório é desenvolvido — `medida.ts` e `Medida.tsx` colidem, e o compilador
// recusa os dois com `TS1149`. O nome longo é o que mantém o par legível nas duas plataformas.

/** Onde o valor caiu em relação à faixa publicada. `neutro` é o que vale sem faixa. */
export type TomDaMedida = "neutro" | "dentro" | "borda" | "fora";

/**
 * O valor de uma medida, nas quatro formas que ele pode ter.
 *
 *   • MEDIDO      — foi calculado e tem valor.
 *   • ZERO        — foi calculado e deu zero. É um DADO, tão medido quanto qualquer outro.
 *   • AUSENTE     — existe no contrato e não veio: suprimido, grosseirizado, sem massa.
 *   • NÃO MEDIDO  — ninguém tentou. Não é falha, não é zero, não é ausência.
 *
 * `fracao` é 0…1 e chega PRONTA. Nenhuma conta acontece nesta camada — normalizar exigiria
 * conhecer o denominador, que é justamente o que o Design System não pode saber.
 */
export type ValorDaMedida =
  | { tipo: "medido"; texto: string; fracao: number }
  | { tipo: "zero"; texto: string }
  | { tipo: "ausente"; motivo: string }
  | { tipo: "naoMedida"; motivo: string };

/** A régua publicada. Sem ela não há julgamento. */
export interface FaixaEsperada {
  de: number;
  ate: number;
  /** Como escrever a faixa. Vem do produto: esta camada não traduz. */
  rotulo: string;
}

/**
 * Deriva o tom a partir da faixa.
 *
 * Sem faixa devolve `neutro` — e é por isso que isto é uma FUNÇÃO e não uma prop: como prop, um
 * chamador distraído passaria `dentro` sem ter régua nenhuma, e nenhum gate veria. Aqui a
 * ausência de faixa torna o julgamento impossível por construção.
 *
 * A folga de 10 % da largura da faixa é o que separa "fora" de "quase". Sem ela um valor um
 * décimo acima do teto receberia o mesmo vermelho de um valor ao dobro — e a tela perderia a
 * capacidade de distinguir o que precisa de atenção do que precisa de ação.
 */
export function tomPelaFaixa(fracao: number, faixa?: FaixaEsperada): TomDaMedida {
  if (!faixa) return "neutro";
  if (fracao >= faixa.de && fracao <= faixa.ate) return "dentro";
  const folga = (faixa.ate - faixa.de) / 10;
  if (fracao >= faixa.de - folga && fracao <= faixa.ate + folga) return "borda";
  return "fora";
}

/**
 * O que escrever no lugar do número, e se ainda existe número.
 *
 * Existe para o estreitamento do union acontecer UMA vez. Sem isto cada consumidor escreve
 * `valor.tipo === "ausente" || valor.tipo === "naoMedida"` duas vezes na mesma linha — o
 * compilador não estreita através de um booleano intermediário — e a terceira superfície a
 * copiar isso vai errar a ordem dos ramos sem nada reclamar.
 */
export function leituraDaMedida(valor: ValorDaMedida): { semNumero: boolean; texto: string } {
  switch (valor.tipo) {
    case "medido":
    case "zero":
      return { semNumero: false, texto: valor.texto };
    default:
      return { semNumero: true, texto: valor.motivo };
  }
}
