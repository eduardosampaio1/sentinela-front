// A escala VISUAL de uma barra — e o único lugar onde ela é decidida.
//
// ## Por que isto virou arquivo
//
// A regra nasceu dentro do `adapterV2`, que serve a superfície CONGELADA. Quando a visão Medidas
// precisou das mesmas barras, a saída barata era copiar a função para o segundo caminho — e aí
// existiriam duas definições de "qual é a maior barra", livres para divergir sem que nada
// reclamasse. É a mesma classe de defeito que o produto já pagou no nome do Workspace.
//
// Uma regra, um arquivo, dois consumidores.
//
// ## O que esta escala NÃO é
//
// Não é estatística publicada. Nenhum número da tela é derivado dela, ela não vira rótulo, e
// trocá-la por outra escala não mudaria fato nenhum — a proporção real continua sendo lida na
// contagem, que aparece ao lado da barra em texto. A barra é redundância visual, nunca a única
// forma de ler o valor.

/**
 * Escala 0..1 relativa ao MAIOR valor da lista, pronta como valor CSS.
 *
 * Máximo zero ⇒ escala zero para todos: uma lista de zeros não tem barra maior, e dividir por
 * zero produziria `NaN`, que o navegador desenha como largura vazia sem ninguém saber por quê.
 *
 * O resultado já sai LIMITADO a 0..1. O limite mora aqui e não no componente porque limitar é
 * aritmética, e a regra da plataforma é que aritmética não acontece em componente — nem a
 * inofensiva, porque é assim que a primeira conta entra na árvore de UI.
 */
export function escalar(valores: readonly number[]): (v: number) => string {
  const maximo = valores.reduce((a, b) => (b > a ? b : a), 0);
  return (v: number) => {
    if (maximo <= 0) return "0%";
    const fracao = v / maximo;
    const limitada = fracao < 0 ? 0 : fracao > 1 ? 1 : fracao;
    // Uma casa decimal basta para a barra, e evita um valor CSS de dezessete dígitos.
    return `${(limitada * 100).toFixed(1)}%`;
  };
}
