// Qual seção de um texto longo está sendo lida agora.
//
// ## Por que isto não é `scroll` com medição de posição
//
// A alternativa óbvia — ouvir `scroll` e comparar `getBoundingClientRect()` de cada título —
// lê layout a cada quadro, e ler layout durante a rolagem força o navegador a recalcular o que
// ele acabou de calcular. No aparelho mais fraco que abre a página, isso é a diferença entre
// rolar liso e rolar aos solavancos.
//
// ## A margem negativa, que é a decisão inteira
//
// `-66%` embaixo faz a seção virar ativa quando o título chega ao TERÇO SUPERIOR da tela, não
// quando ele encosta na base. Sem isso o índice marca a próxima seção enquanto a pessoa ainda
// lê a anterior — e um índice que aponta para onde você não está é pior que nenhum índice,
// porque a pessoa passa a desconfiar dele e para de olhar.
//
// Vive em arquivo próprio porque é um hook, e um arquivo que exporta hook e componente juntos
// quebra o fast refresh — o gate de lint conta isso.

import { useEffect, useState } from "react";

export function useSecaoAtiva(ids: readonly string[]): string {
  const [ativa, setAtiva] = useState(ids[0] ?? "");

  // A chave da dependência é o CONTEÚDO da lista, não a referência: um array remontado a cada
  // render com os mesmos ids reinstalaria o observador para sempre.
  const chave = ids.join("|");

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.IntersectionObserver !== "function") return;
    const lista = chave ? chave.split("|") : [];
    if (lista.length === 0) return;

    setAtiva((atual) => (lista.includes(atual) ? atual : lista[0]));

    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.find((e) => e.isIntersecting);
        if (visivel) setAtiva(visivel.target.id);
      },
      { rootMargin: "0px 0px -66% 0px", threshold: 0 },
    );

    for (const id of lista) {
      const no = document.getElementById(id);
      if (no) observador.observe(no);
    }
    return () => observador.disconnect();
  }, [chave]);

  return ativa;
}
