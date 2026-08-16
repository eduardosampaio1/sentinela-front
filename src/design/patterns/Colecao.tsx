// COLEÇÃO — o arquétipo de "escolher um item entre muitos".
//
// ## A pergunta que a linha responde
//
// Uma coleção não é um índice de nomes. É uma fila de perguntas **"devo abrir isto?"**, e uma
// linha que só tem nome obriga a pessoa a abrir para descobrir — o que transforma a lista num
// corredor de portas fechadas.
//
// Por isso a linha carrega, quando existem: o número que decide, a tendência que dá contexto, o
// estado e a idade.
//
// ## Por que quase tudo é opcional, e por que isso NÃO é frouxidão
//
// Porque recurso diferente publica campo diferente, e o arquétipo não pode inventar o que o
// contrato não tem. A lista de Instâncias diz isso por escrito: três campos publicados, e "o
// Front não calcula estado de backend". Uma linha com espaço fixo para saúde forçaria uma de
// duas mentiras — um traço que parece medida faltando, ou um número computado no browser.
//
// Então a regra é: **o slot só existe se o dado existe.** Uma coleção pobre em campos renderiza
// uma linha limpa e curta; uma rica renderiza a linha inteira. As duas são a mesma linha.
//
// ## Ausência
//
// `numero` aceita o léxico de valor de medida em vez de `string | null`. É o que faz "suprimido
// por privacidade" parar de parecer falha: ele recebe a hachura, não o vermelho, e a lista deixa
// de sugerir que alguém precisa consertar alguma coisa.

import type { ReactNode } from "react";
import { Tendencia } from "@/design/primitives/Tendencia";
import { leituraDaMedida, type ValorDaMedida } from "@/design/primitives/valorDaMedida";

/** Cabeçalho de uma superfície de trabalho: título, contexto e as ações do escopo inteiro. */
export function CabecalhoDeTrabalho({
  titulo,
  contexto,
  acoes,
}: {
  titulo: string;
  contexto?: string;
  acoes?: ReactNode;
}) {
  return (
    <header data-revelar className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{titulo}</h1>
      {contexto && <span className="text-sm text-muted-foreground">{contexto}</span>}
      {acoes && <div className="ml-auto flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

export interface ItemDeColecao {
  /** Chave estável. Nunca o índice: reordenar a lista reaproveitaria o nó errado. */
  chave: string;
  titulo: string;
  subtitulo?: string;
  destino?: string;
  /** O número que decide se vale abrir. Ausência entra pelo léxico, não como `null`. */
  numero?: { valor: ValorDaMedida; rotulo: string; tom?: "neutro" | "dentro" | "borda" | "fora" };
  /** Série curta, 0…1, já normalizada. Contexto do número — nunca um gráfico. */
  tendencia?: readonly number[];
  /** Estado do processo, já traduzido pela camada de produto. */
  estado?: { rotulo: string; sinal: ReactNode };
  /** Idade, já formatada. Esta camada não sabe formatar tempo. */
  quando?: string;
}

const TINTA: Record<string, string> = {
  neutro: "text-foreground",
  dentro: "text-success",
  borda: "text-warning",
  fora: "text-destructive",
};

function Numero({ item }: { item: NonNullable<ItemDeColecao["numero"]> }) {
  const leitura = leituraDaMedida(item.valor);
  return (
    <div className="text-right">
      <div
        className={
          leitura.semNumero
            ? "text-sm text-muted-foreground"
            : `tabular text-xl font-medium ${TINTA[item.tom ?? "neutro"]}`
        }
      >
        {leitura.semNumero ? "—" : leitura.texto}
      </div>
      <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {leitura.semNumero ? leitura.texto : item.rotulo}
      </div>
    </div>
  );
}

/**
 * Uma linha.
 *
 * `Envoltorio` é `Link` quando há destino e `div` quando não há — em vez de um `<a>` sem `href`,
 * que é focável, anunciado como link e não vai a lugar nenhum.
 */
export function LinhaDeColecao({
  item,
  Envoltorio,
}: {
  item: ItemDeColecao;
  Envoltorio: (p: { destino?: string; children: ReactNode; className: string }) => ReactNode;
}) {
  const interativa = Boolean(item.destino);

  return (
    <li data-revelar className="bg-card">
      {Envoltorio({
        destino: item.destino,
        className: [
          "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 px-4 py-4",
          "sm:grid-cols-[minmax(0,1.7fr)_minmax(0,7rem)_minmax(0,8rem)_minmax(0,6rem)_minmax(0,5rem)]",
          interativa
            ? "transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            : "",
        ].join(" "),
        children: (
          <>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{item.titulo}</div>
              {item.subtitulo && (
                <div className="truncate text-xs text-muted-foreground">{item.subtitulo}</div>
              )}
            </div>

            {/* A tendência some antes do número quando falta largura: ela é contexto, e o número
                é a decisão. Esconder a decisão para preservar o contexto seria inverter os dois. */}
            {item.tendencia && (
              <div className="hidden sm:block">
                <Tendencia pontos={item.tendencia} />
              </div>
            )}

            {item.estado && (
              <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                {item.estado.sinal}
                <span className="truncate">{item.estado.rotulo}</span>
              </div>
            )}

            {item.numero && <Numero item={item.numero} />}

            {item.quando && (
              <div className="hidden text-right text-xs text-muted-foreground sm:block">
                {item.quando}
              </div>
            )}
          </>
        ),
      })}
    </li>
  );
}

/**
 * O contêiner. `gap-px` sobre fundo de borda desenha os divisores sem que cada linha precise
 * carregar `border-b` — e sem a borda órfã embaixo do último item.
 */
export function ListaDeColecao({ children }: { children: ReactNode }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border">
      {children}
    </ul>
  );
}
