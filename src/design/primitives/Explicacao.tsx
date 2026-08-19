// EXPLICAÇÃO — o que esta medida quer dizer, ao lado do nome dela.
//
// ## Por que existe, e quem pediu
//
// O owner leu a avaliação da primeira vista e reparou no que faltava nela: *"não vi eles pedindo
// tooltips — estranho"*. Ele estava certo duas vezes. O protótipo aprovado **tem** o padrão — um
// `i` com `cursor:help` ao lado de cada título de cartão — e as descrições **já existem** no
// produto, escritas, no registro de descritores. Elas só não apareciam em lugar nenhum.
//
// A tela mostra `Semantic drift` em inglês, por decisão registrada de não traduzir nome de
// métrica. Sem uma frase ao lado, o nome é a única pista — e para quem não é do time, não é
// pista nenhuma. **A explicação é o que torna a decisão de não traduzir sustentável.**
//
// ## Por que não é `title=`
//
// `title` nativo não abre por teclado, não abre por toque, e o navegador decide o atraso. Aqui a
// explicação é um `<button>` que alterna um bloco de texto: funciona com dedo, com teclado e com
// leitor de tela, e o texto entra no fluxo em vez de flutuar sobre o conteúdo.
//
// ## Sem descrição, sem ícone
//
// Metade das saídas ainda não tem texto escrito. Um `i` que abre e não diz nada é pior que
// nenhum: ele promete explicação e entrega vazio. Quando não há descrição, este componente
// devolve `null` e a linha fica como estava.

import { useId, useState } from "react";

export function Explicacao({
  texto,
  rotuloDoGatilho,
}: {
  /** A descrição pronta. `null` ou vazio NÃO desenha nada. */
  readonly texto: string | null | undefined;
  /** Nome acessível do gatilho, já traduzido — inclui o nome da medida. */
  readonly rotuloDoGatilho: string;
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  if (!texto || !texto.trim()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={rotuloDoGatilho}
        // O alvo tem 44px de área com `before:`, mas o desenho fica com 16px: um círculo de
        // 44px ao lado de cada rótulo dominaria a linha. A área invisível é o que vale para o
        // dedo, e é a mesma técnica que a régua desta casa aceita.
        className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-[0.6rem] leading-none text-muted-foreground transition-colors before:absolute before:-inset-3.5 before:content-[''] hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true">i</span>
      </button>
      {aberto ? (
        <p
          id={id}
          className="mt-1 basis-full text-xs leading-relaxed text-muted-foreground"
        >
          {texto}
        </p>
      ) : null}
    </>
  );
}
