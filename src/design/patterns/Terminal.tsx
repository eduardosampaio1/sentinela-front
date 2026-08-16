// TERMINAL — o arquétipo de "o caminho acabou".
//
// ## As três perguntas, nesta ordem
//
//   1. **O que aconteceu.**
//   2. **O que isso custou a você.**
//   3. **Como sair.**
//
// A segunda é a que quase todo estado de erro esquece, e é a única que a pessoa está realmente
// perguntando. "O trabalho foi perdido?" vem antes de qualquer botão — oferecer "tentar de novo"
// primeiro responde à pergunta errada e obriga a pessoa a arriscar para descobrir.
//
// ## O identificador fica visível
//
// Sem ele, abrir chamado é descrever um sintoma de memória, e a primeira resposta do suporte é
// sempre "consegue reproduzir?". Com ele, a conversa começa no evento. Por isso `diagnostico` é
// texto selecionável e não um bloco decorativo escondido atrás de um "ver detalhes".
//
// ## Não é falha da pessoa
//
// O 404 usa tom neutro, não o de erro. Um endereço que envelheceu não é defeito de quem clicou
// no link antigo, e pintar isso de vermelho transforma navegação normal em acusação.

import type { ReactNode } from "react";

export function Terminal({
  codigo,
  gravidade = "falha",
  titulo,
  consequencia,
  diagnostico,
  saidas,
}: {
  /** O código e o rótulo curto: "Falha do serviço · 503". */
  codigo: string;
  /** `falha` pinta o sinal; `neutro` é para o caminho que simplesmente não existe. */
  gravidade?: "falha" | "neutro";
  titulo: string;
  /** O que isto custou a quem está lendo. A pergunta real, respondida antes dos botões. */
  consequencia: string;
  /** Pares curtos de diagnóstico, já formatados. Selecionáveis de propósito. */
  diagnostico?: readonly { rotulo: string; valor: string }[];
  saidas: ReactNode;
}) {
  const sinal = gravidade === "falha" ? "bg-destructive" : "bg-muted-foreground";
  const tinta = gravidade === "falha" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="mx-auto grid max-w-[56ch] gap-5 px-4 py-16">
      <div
        data-revelar
        className={`flex items-center gap-3 text-xs uppercase tracking-[0.16em] ${tinta}`}
      >
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${sinal}`} />
        {codigo}
      </div>

      <h1 data-revelar className="text-3xl font-semibold tracking-tight text-foreground">
        {titulo}
      </h1>

      <p data-revelar className="text-base text-muted-foreground">
        {consequencia}
      </p>

      {diagnostico && diagnostico.length > 0 && (
        <dl data-revelar className="grid gap-2 rounded-lg border border-border bg-card p-4 text-xs">
          {diagnostico.map((d) => (
            <div key={d.rotulo} className="flex flex-wrap gap-x-3">
              <dt className="text-muted-foreground">{d.rotulo}</dt>
              <dd className="tabular text-foreground">{d.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      <div data-revelar className="flex flex-wrap gap-2">
        {saidas}
      </div>
    </div>
  );
}
