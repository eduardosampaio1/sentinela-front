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
  /**
   * Ação sobre o item, para a coleção que é SELECIONADA em vez de aberta.
   *
   * A lista de espaços de trabalho é o caso: nenhum item leva a uma tela própria — um deles é o
   * corrente e os outros oferecem trocar. Sem este slot, encaixá-la aqui exigiria fingir que ela
   * é navegação, e o arquétipo passaria a mentir sobre o que aquela tela faz.
   */
  acao?: ReactNode;
  /** O item corrente de uma coleção de seleção. Marca "é este", nunca "é o melhor". */
  ativo?: boolean;
  /** Atributos `data-*` de teste que a superfície já publicava. Repassados sem interpretação. */
  dados?: Readonly<Record<string, string>>;
}

const TINTA: Record<string, string> = {
  neutro: "text-foreground",
  dentro: "text-success",
  borda: "text-warning",
  fora: "text-destructive",
};

/**
 * A célula do número.
 *
 * ## Ausência recebe FORMA, não um travessão
 *
 * A primeira versão desenhava `—` no lugar do valor quando a medida não veio. É exatamente o
 * que o contrato de listagem proíbe com estas palavras: *"renderizar 0 ou '—' como se fosse
 * medição transformaria não-medição em fato"*. E o travessão é pior que o zero em um aspecto —
 * ele parece um valor que ninguém preencheu, sugerindo defeito de carga, quando a ausência é
 * frequentemente a decisão correta (supressão por privacidade, massa insuficiente).
 *
 * Agora a ausência ocupa o mesmo espaço do número com a hachura, que é o segundo canal: ela
 * sobrevive à escala de cinza e ao daltonismo, e diz "aqui não há medida" sem fingir uma.
 */
function Numero({ item }: { item: NonNullable<ItemDeColecao["numero"]> }) {
  const leitura = leituraDaMedida(item.valor);

  if (leitura.semNumero) {
    // AUSENTE e NÃO MEDIDO são fatos diferentes e recebem formas diferentes — hachura para
    // "perguntamos e não veio", tracejado vazio para "ninguém tentou medir".
    //
    // A primeira versão desta célula tratava os dois pelo mesmo `semNumero` e desenhava a
    // hachura nos dois. O tipo distinguia quatro estados e a tela desenhava dois: o léxico
    // existia no compilador e não chegava ao olho, que é a forma mais silenciosa de ele deixar
    // de valer.
    const naoMedida = item.valor.tipo === "naoMedida";
    return (
      <div className="text-right">
        <span
          className={`${naoMedida ? "medida-nao-medida" : "medida-ausente"} ml-auto block h-3 w-full rounded-sm`}
          aria-hidden="true"
        />
        <div className="mt-1 whitespace-nowrap text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {leitura.texto}
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className={`tabular text-xl font-medium ${TINTA[item.tom ?? "neutro"]}`}>
        {leitura.texto}
      </div>
      <div className="whitespace-nowrap text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {item.rotulo}
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
    <li
      data-revelar
      {...item.dados}
      // O item corrente é marcado pela BORDA da marca, e o fundo continua sendo o mesmo dos
      // outros. A primeira versão usava `bg-primary/5` — um tingimento translúcido — e ele
      // custava contraste ao texto secundário por cima: composto sobre a linha, o rótulo de
      // papel caía abaixo de 4,5:1.
      //
      // A borda basta porque ela não está sozinha: a linha corrente troca o botão de ação por um
      // rótulo em texto, e texto é o canal que sobrevive a tudo. Dois canais sem tingir nada.
      // `min-w-0` é obrigatório, não estilo. Item de grid nasce com `min-width: auto`, o que o
      // impede de encolher abaixo do conteúdo — então a coluna inteira crescia até caber o
      // identificador sem quebra, e a linha media 438 px numa viewport de 375. Os `truncate` de
      // dentro nunca entravam em ação, porque nada nunca ficava apertado.
      //
      // O estouro era INVISÍVEL na tela: o shell tem `overflow-x-hidden` e recortava a borda. Só
      // um gate que mede a caixa de cada elemento, em vez de `scrollWidth`, o enxerga.
      className={`min-w-0 ${item.ativo ? "border-l-2 border-primary bg-card" : "bg-card"}`}
    >
      {Envoltorio({
        destino: item.destino,
        // Flex, não grade de colunas fixas. Uma grade de cinco faixas coloca os filhos na ordem
        // das faixas, então uma linha esparsa — as Instâncias publicam só nome e data — jogaria
        // a data na coluna da tendência e deixaria o resto vazio à direita. Com flex, a célula
        // que não existe simplesmente não ocupa lugar, e é isso que faz o mesmo componente
        // servir a uma linha de dois campos e a uma de cinco.
        className: [
          "flex w-full items-center gap-4 px-4 py-4 sm:gap-6",
          interativa
            ? "transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            : "",
        ].join(" "),
        children: (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{item.titulo}</div>
              {item.subtitulo && (
                <div className="truncate text-xs text-muted-foreground">{item.subtitulo}</div>
              )}
            </div>

            {/* A tendência some antes do número quando falta largura: ela é contexto, e o número
                é a decisão. Esconder a decisão para preservar o contexto seria inverter os dois.

                O ponto de quebra é `lg`, não `sm`, e o número veio de medida: em `sm` a linha
                estourava a página em 189 px no tablet e 125 px no celular. Com quatro células de
                largura fixa mais `gap`, não sobrava espaço para o título — e `flex-none` impede
                exatamente o encolhimento que salvaria a linha. */}
            {item.tendencia && (
              <div className="hidden w-24 flex-none lg:block">
                <Tendencia pontos={item.tendencia} />
              </div>
            )}

            {/* `min-w-0` junto com `truncate`: sem ele um item de flex nunca encolhe abaixo do
                conteúdo, e o rótulo de estado empurrava a linha para fora da página em vez de
                cortar. É a mesma armadilha que fez `/aion` rolar 226 px na M45. */}
            {item.estado && (
              <div className="hidden w-32 min-w-0 flex-none items-center gap-2 text-xs text-muted-foreground lg:flex">
                {item.estado.sinal}
                <span className="truncate">{item.estado.rotulo}</span>
              </div>
            )}

            {/* Sem largura fixa. Com `w-20 flex-none` o rótulo do número transbordava a célula:
                "conversations" não cabe em 80 px e não quebra, então a linha estourava a página
                em 125 px no celular — invisível na tela, porque o shell recorta, e visível para
                o gate que mede geometria em vez de `scrollWidth`.

                Curioso e instrutivo: em PT ("conversas") coubera. Um rótulo que só estoura num
                idioma é o caso que a regra de expansão de copy existe para lembrar. */}
            {item.numero && (
              <div className="flex-none">
                <Numero item={item.numero} />
              </div>
            )}

            {item.quando && (
              <div className="hidden flex-none whitespace-nowrap text-right text-xs text-muted-foreground lg:block">
                {item.quando}
              </div>
            )}

            {item.acao && <div className="flex-none">{item.acao}</div>}
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
    // `grid-cols-1` explícito: sem ele o grid cria a coluna implícita com largura `auto`, que
    // acompanha o conteúdo mais largo em vez da caixa disponível. Junto com o `min-w-0` da linha
    // é cinto e suspensório — e os dois valem, porque a próxima superfície pode montar o `ul` por
    // conta própria, como duas já montam.
    <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border">
      {children}
    </ul>
  );
}
