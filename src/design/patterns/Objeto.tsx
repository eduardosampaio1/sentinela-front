// OBJETO — o arquétipo de "um item por inteiro".
//
// ## A ordem, que é a decisão inteira
//
// Identidade primeiro, depois o que o objeto declara sobre si, depois o histórico.
//
// A identidade vem antes porque a pergunta que traz alguém a esta tela é "é este mesmo?", e
// porque quem chega por link direto precisa saber onde está antes de qualquer outra coisa.
//
// ## O que este arquétipo NÃO tem, e por quê
//
// Ele foi projetado com uma faixa de sinais vitais no topo — saúde, volume, custo, cada um com
// a sua régua — e essa faixa foi removida antes de nascer. O motivo está registrado embaixo,
// no lugar exato onde ela morava: nenhum objeto deste produto publica medida com faixa, e as
// que existem vivem em ARGOS e Analytics, que têm componentes próprios.

import type { ReactNode } from "react";

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
        className="grid h-14 w-14 flex-none place-items-center rounded-lg border border-border bg-card text-lg font-medium text-[hsl(var(--ds-accent-ink))]"
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

// ═══════════════════════════════════════════════════════════════════════════════════════════
// SINAIS VITAIS — projetado, e REMOVIDO antes de nascer
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// O arquétipo previa uma faixa de sinais vitais no topo do objeto: saúde, volume, custo, deriva
// — cada um com a própria régua. No protótipo ficou bom. No produto não existe.
//
// A Instância publica TRÊS campos — identidade, nome e data de criação —, e `InstancePage.tsx`
// escreve a proibição por extenso: *"Nenhum estado, saúde, contador, 'última execução' ou badge
// sobre a Instância… a proibição vale também para insinuação"*. A Home diz o mesmo com outras
// palavras (D9: não é dashboard de KPIs). As medidas com faixa vivem em ARGOS e Analytics, que
// têm componentes próprios e já estão prontos.
//
// Ou seja: os números que eu desenhei nos vitais do protótipo eu inventei. Mantê-los como
// componente seria guardar um molde à espera de um dado que o contrato recusa publicar — e o
// próximo a encontrá-lo iria supor que existe origem para ele.
//
// Isto fica registrado, e não apagado, porque a decisão pode mudar: no dia em que houver
// produtor de saúde de Instância, o desenho está no protótipo e volta com consumidor no mesmo
// commit. Até lá, `IdentidadeDoObjeto` e `SecaoDoObjeto` são o arquétipo inteiro.

/**
 * O que uma seção É — e a aparência sai daqui, não de uma prop de estilo.
 *
 *   • `leitura` — a seção apresenta fatos. Cabeçalho com régua embaixo, conteúdo solto na página.
 *   • `acao`    — a seção oferece um ato. Cartão: o bloco se fecha em volta do que se pode fazer.
 *
 * ## Por que a natureza, e não `aparencia: "cartao" | "regua"`
 *
 * Porque o produto tinha as DUAS aparências convivendo — cartão nos ajustes, régua no perfil e
 * nos arquétipos — e nenhuma decisão escrita separando os casos. Uma prop de estilo teria
 * mantido isso: cada tela escolheria de novo, e a escolha seria gosto.
 *
 * Declarando a natureza, a regra fica no sistema e não no chamador. Quem escrever uma seção nova
 * responde "isto é leitura ou ação?", que é uma pergunta sobre o CONTEÚDO — e a forma segue.
 */
export type NaturezaDaSecao = "leitura" | "acao";

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
  natureza,
  children,
}: {
  titulo: string;
  detalhe?: string;
  /** Sem valor padrão de propósito: escolher entre leitura e ação é a decisão, e um default
   *  deixaria a maioria das seções sem ninguém ter decidido nada. */
  natureza: NaturezaDaSecao;
  children: ReactNode;
}) {
  const cartao = natureza === "acao";

  return (
    <section className="mt-10">
      <div data-revelar className={cartao ? "rounded-lg border border-border bg-card p-5" : ""}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">{titulo}</h2>
          {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}
