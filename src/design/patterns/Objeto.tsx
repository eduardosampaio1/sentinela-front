// OBJETO — o arquétipo de "um item por inteiro".
//
// ## A ordem, que é a decisão inteira
//
// Identidade, **sinais vitais**, depois configuração, depois histórico.
//
// Vitais antes de configuração porque a pergunta que traz alguém a esta tela é "isto está bem?",
// não "como isto está configurado?". A ordem inversa é o padrão de tela de administração e está
// errada aqui: ela obriga a rolar por parâmetros que ninguém veio ver para chegar ao estado.
//
// ## Cada vital declara a própria régua
//
// O rodapé de um vital não é legenda opcional: é o que separa "87 está dentro do esperado" de
// "87 me parece bom". Sem régua publicada o número aparece na cor de ação e o rodapé diz que
// não há faixa — porque "sem faixa" é informação, e o cinza sozinho seria lido como "mediano".
//
// Quando nem medir é possível, o vital admite: contorno tracejado e o motivo. É o caso da
// medida que exige uma leitura de referência para existir — sem referência ela não é zero e não
// é falha; ela não é calculável, e dizer isso é mais honesto que desenhar um traço.

import type { ReactNode } from "react";
import { TrilhoDeMedida } from "@/design/primitives/Medida";
import { leituraDaMedida, tomPelaFaixa } from "@/design/primitives/valorDaMedida";
import type { FaixaEsperada, ValorDaMedida } from "@/design/primitives/valorDaMedida";

/** Cabeçalho de identidade: quem é este objeto, e as ações que valem sobre ele inteiro. */
export function IdentidadeDoObjeto({
  sigla,
  titulo,
  atributos,
  acoes,
}: {
  /** Duas ou três letras. Marca de reconhecimento, não avatar — não representa pessoa. */
  sigla: string;
  titulo: string;
  /** Fatos curtos de identificação, já formatados. Esta camada não formata. */
  atributos: readonly string[];
  acoes?: ReactNode;
}) {
  return (
    <header
      data-revelar
      className="flex flex-wrap items-start gap-4 border-b border-border pb-6"
    >
      <span
        aria-hidden="true"
        className="grid h-14 w-14 flex-none place-items-center rounded-lg border border-border bg-muted text-lg font-medium text-primary"
      >
        {sigla}
      </span>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{titulo}</h1>
        {atributos.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {atributos.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
        )}
      </div>
      {acoes && <div className="ml-auto flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

export interface SinalVital {
  chave: string;
  rotulo: string;
  valor: ValorDaMedida;
  faixa?: FaixaEsperada;
  /** O que dizer sobre a régua quando não há faixa publicada. Vem do produto. */
  regua: string;
}

const TINTA = {
  neutro: "text-foreground",
  dentro: "text-success",
  borda: "text-warning",
  fora: "text-destructive",
} as const;

export function SinaisVitais({ sinais }: { sinais: readonly SinalVital[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {sinais.map((s) => {
        const leitura = leituraDaMedida(s.valor);
        const tom = s.valor.tipo === "medido" ? tomPelaFaixa(s.valor.fracao, s.faixa) : "neutro";
        return (
          <div
            key={s.chave}
            data-revelar
            className="grid gap-3 rounded-lg border border-border bg-card p-4"
          >
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {s.rotulo}
            </span>
            <span
              className={
                leitura.semNumero
                  ? "text-base text-muted-foreground"
                  : `tabular text-3xl font-medium leading-none ${TINTA[tom]}`
              }
            >
              {leitura.texto}
            </span>
            <TrilhoDeMedida valor={s.valor} faixa={s.faixa} tom={tom} />
            <span className="text-xs text-muted-foreground">
              {s.faixa ? s.faixa.rotulo : s.regua}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Título de seção dentro de um objeto. O `detalhe` fica à direita e conta o que a seção tem.
 *
 * O detalhe é IRMÃO do `h2`, não filho. Dentro do cabeçalho ele passava a fazer parte do nome
 * acessível da seção, e o leitor de tela anunciava "Seus dados Vêm da conta com que você entra"
 * como um título só — colando descrição em rótulo. Medido na tela, não deduzido: foi o
 * `innerText` do `h2` que entregou as duas frases grudadas.
 */
export function SecaoDoObjeto({
  titulo,
  detalhe,
  children,
}: {
  titulo: string;
  detalhe?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <div
        data-revelar
        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3"
      >
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">{titulo}</h2>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
