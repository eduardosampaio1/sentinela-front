// DOCUMENTO — o arquétipo de texto longo.
//
// ## O único lugar do produto onde a pessoa LÊ
//
// Todo o resto é escaneado. Aqui não: quem abre um texto legal está procurando uma frase
// específica e vai ler o parágrafo inteiro quando achar. Isso muda a tipografia inteira —
// medida de 66 caracteres, entrelinha aberta, e um índice que diz onde a pessoa está.
//
// ## O índice marca a posição, e isso não é enfeite
//
// Num texto de cinco seções, um índice que só navega é um menu. O que o torna útil é responder
// "onde estou" durante a rolagem — sem isso a pessoa perde o lugar ao voltar de uma seção e
// recomeça a busca visual do zero.
//
// A marcação é feita por `IntersectionObserver` sobre os títulos. A alternativa, `scroll` com
// medição de posição, roda a cada quadro e é exatamente o tipo de leitura de layout que trava a
// rolagem no aparelho mais fraco que abre a página.

import { useEffect, useState, type ReactNode } from "react";

export interface SecaoDeDocumento {
  id: string;
  titulo: string;
  corpo: ReactNode;
}

export function Documento({
  titulo,
  atualizado,
  rotuloDoIndice,
  secoes,
}: {
  titulo: string;
  /** Quando mudou, já formatado. Num texto legal isto é parte do conteúdo, não metadado. */
  atualizado: string;
  rotuloDoIndice: string;
  secoes: readonly SecaoDeDocumento[];
}) {
  const [ativa, setAtiva] = useState(secoes[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.IntersectionObserver !== "function") return;

    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.find((e) => e.isIntersecting);
        if (visivel) setAtiva(visivel.target.id);
      },
      // A margem inferior negativa faz a seção "virar ativa" quando o título chega ao TERÇO
      // superior da tela, não quando encosta na base. Sem ela o índice marca a próxima seção
      // enquanto a pessoa ainda lê a anterior.
      { rootMargin: "0px 0px -66% 0px", threshold: 0 },
    );

    for (const s of secoes) {
      const no = document.getElementById(s.id);
      if (no) observador.observe(no);
    }
    return () => observador.disconnect();
  }, [secoes]);

  return (
    <div className="mx-auto grid max-w-5xl gap-9 px-4 py-12 md:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label={rotuloDoIndice} className="md:sticky md:top-20 md:self-start">
        <p className="mb-2 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {rotuloDoIndice}
        </p>
        <ul className="grid gap-0.5 text-sm">
          {secoes.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={ativa === s.id ? "true" : undefined}
                className={`block rounded border-l-2 px-3 py-1.5 transition-colors ${
                  ativa === s.id
                    ? "border-primary bg-accent text-primary"
                    : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {s.titulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="max-w-[66ch]">
        <h1 data-revelar className="text-3xl font-semibold tracking-tight text-foreground">
          {titulo}
        </h1>
        <p data-revelar className="mt-2 text-xs text-muted-foreground">
          {atualizado}
        </p>

        {secoes.map((s) => (
          <section key={s.id} data-revelar className="mt-8">
            {/* `scroll-mt` impede que o cabeçalho fixo cubra o título ao pular pela âncora — o
                defeito clássico de índice em página com barra grudada no topo. */}
            <h2
              id={s.id}
              className="scroll-mt-24 text-lg font-semibold tracking-tight text-foreground"
            >
              {s.titulo}
            </h2>
            <div className="mt-2 grid gap-3 leading-relaxed text-muted-foreground">{s.corpo}</div>
          </section>
        ))}
      </article>
    </div>
  );
}

/** Destaque dentro de um documento: a frase que a pessoa veio procurar. */
export function DestaqueDeDocumento({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-primary bg-card px-4 py-3 text-sm text-foreground">
      {children}
    </p>
  );
}
