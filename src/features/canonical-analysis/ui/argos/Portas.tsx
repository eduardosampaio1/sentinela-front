// As PORTAS da Visão geral — os cartões que o protótipo chamava de "onde investigar".
//
// ## Três portas — e isto REVERTE o que estava escrito aqui
//
// A versão anterior deste arquivo dizia "quatro portas, não três": o protótipo agrupava
// editorialmente, o contrato publica `domain` com vocabulário fechado de quatro valores, "e é
// esse o eixo real". O argumento sobre PROCEDÊNCIA continua certo — `domain` é publicado, a
// porta não é.
//
// O que ele não mediu foi o ALCANCE. `assemble_v3._dominio_de` só classifica as quatro dimensões
// de saúde, e diz por quê: *"inventar um domínio para `useful_outcome_rate` seria afirmar uma
// classificação que ninguém fez"*. Medido no catálogo: **4 das 39 saídas têm `domain`; 33 saem
// `null`** — e a própria tela anunciava isso, *"31 publicados sem domínio declarado, e aparecem
// aqui na Visão geral"*.
//
// Quatro cartões que cobriam quatro métricas, com trinta e uma num balde, não eram "a taxonomia
// verdadeira": eram a lista plana com quatro exceções. Os dois eixos COEXISTEM — `domain` segue
// sendo a procedência das dimensões, e a porta é o eixo de leitura sobre o que o contrato deixa
// `null` de propósito. A porta nunca é escrita em `domain`, e há teste para isso.
//
// ## Os três sinais de cada porta, e a regra que escolhe
//
// O protótipo mostrava 2–3 sinais resumidos por porta. Quais? Ele não dizia, e o produtor não
// publica ranking de importância — escolher "os três que mais importam" seria priorização decidida
// no navegador, que é o que esta visão proíbe para severidade.
//
// A regra aqui é declarada e verificável: **os três PRIMEIROS na ordem do documento**. Não é a
// melhor regra possível; é a única que não inventa hierarquia. Quando o produtor publicar
// relevância, ela troca.
//
// ## A mini-barra NÃO julga
//
// Ela mostra magnitude na escala do próprio número, sem marca de esperado e sem cor de veredito —
// porque `expected_range` existe no motor preenchido com o DOMÍNIO (`"0-100"`) e não é publicado.
// No dia em que a expectativa vier, esta barra ganha a marca e a cor, e nada mais muda aqui.

import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Text } from "@/design/primitives";
import {
  PARAM_PORTA,
  PORTAS,
  type AgrupamentoPorPorta,
  type ItemDaPorta,
  type Porta as ChaveDaPorta,
} from "../../result/portasDoArgos";
import { largurasDeItens, valorDoItem } from "../../result/barrasDoArgos";

/** Quantos sinais cada porta resume. Três, como o protótipo. */
const SINAIS_POR_PORTA = 3;

function Porta({
  porta,
  itens,
  rotuloDe,
}: {
  readonly porta: ChaveDaPorta;
  readonly itens: readonly ItemDaPorta[];
  readonly rotuloDe: (id: string) => string;
}) {
  const { t, language } = useLanguage();
  const { pathname } = useLocation();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const amostra = itens.slice(0, SINAIS_POR_PORTA);
  const larguras = largurasDeItens(amostra);

  return (
    // `data-revelar` em CADA porta, não só na seção.
    //
    // Com um `data-revelar` na seção inteira as quatro entravam no mesmo quadro, e o resultado é
    // um bloco que aparece — não uma sequência que se apresenta. O motor escalona por ÍNDICE do
    // elemento, então basta cada cartão ser um alvo para o ritmo aparecer.
    //
    // A receita é `bloco`: deslocamento puro, sem opacidade. A matriz transversal impôs essa regra
    // depois de reprovar contraste em vinte jornadas — texto entrando com opacidade fica abaixo de
    // 4,5:1 enquanto a animação roda, e axe mede o quadro, não o destino.
    <li data-revelar>
      {/* O cartão INTEIRO é o link. O protótipo fazia o cartão clicável, e um cartão com um
          "investigar" pequeno no pé obriga a mirar — alvo de toque de 44px é a régua da casa.
          `transition-colors` no hover: cor muda, geometria não. Animar borda ou fundo por
          `transform` não existe, e animar largura obrigaria layout a cada quadro. */}
      <Link
        to={`${pathname}?${PARAM_PORTA}=${porta}`}
        className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-[hsl(var(--ds-accent-ink))] hover:bg-muted"
      >
        <div className="flex items-baseline gap-3">
          <Text papel="destaque">{t(`canonicalAnalysis.argos.portas.${porta}`)}</Text>
          {/* A contagem é DADO: quantas saídas o documento colocou nesta porta. */}
          <Text papel="micro" tom="discreto" numerico className="ml-auto">
            {t("canonicalAnalysis.argos.metricCount", { n: itens.length })}
          </Text>
        </div>

        {/* A PERGUNTA que a porta responde. É copy, e é o que transforma um rótulo taxonômico em
            um motivo para entrar. */}
        <Text papel="corpo" tom="discreto">
          {t(`canonicalAnalysis.argos.portas.pergunta.${porta}`)}
        </Text>

        <ul className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          {amostra.map((entrada, i) => {
            const id = "measurement" in entrada.item ? entrada.item.measurement.id : entrada.item.id;
            const valor = valorDoItem(entrada, locale);
            return (
              // GRADE de três colunas, e não `flex` com `ml-auto`.
              //
              // O owner mediu a olho o que a régua confirmou: os trilhos começavam em 541, 543 e
              // **551** dentro do MESMO cartão. A causa era o `ml-auto` morar no trilho — o valor
              // vinha depois com largura variável (`78,6%` tem 34px, `12%` tem 24px), então cada
              // linha empurrava o trilho para um lugar diferente.
              //
              // E quando a barra some — moeda não tem régua —, nada empurrava o valor: ele colava
              // no rótulo, à esquerda, enquanto o vizinho com barra ficava à direita.
              //
              // Com colunas fixas os dois problemas somem pela mesma porta: o trilho tem lugar
              // próprio (reservado mesmo quando não há barra, senão as linhas voltam a divergir)
              // e o valor tem coluna própria, alinhada à DIREITA — que é onde número se compara.
              <li
                key={`${entrada.familia}:${id}`}
                className="grid grid-cols-[minmax(0,1fr)_3rem_4.5rem] items-center gap-3 text-xs"
              >
                <Text papel="rotulo" tom="discreto" className="min-w-0 truncate">
                  {rotuloDe(id)}
                </Text>
                {/* Mini-barra: magnitude, nunca veredito. `aria-hidden` porque o número está ao
                    lado — a barra é redundância, e leitor de tela não precisa dela.

                    SEM RÉGUA, SEM BARRA: moeda e contagem não têm faixa canônica, e a versão
                    anterior desenhava o trilho CHEIO para elas. Dois custos diferentes ficavam
                    com a mesma barra completa. Agora o espaço fica vazio — o número já está
                    escrito, e o alinhamento da coluna se mantém pelo `ml-auto` do valor. */}
                {larguras[i] === null ? (
                  // O VÃO é o que mantém as linhas alinhadas. Colapsar a coluna faria o valor
                  // de um custo subir para o lugar do trilho do vizinho.
                  <span aria-hidden="true" />
                ) : (
                  <span
                    className="h-1 w-full overflow-hidden rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <span
                      data-revelar="barra"
                      className="block h-full rounded-full bg-primary"
                      style={{ width: larguras[i] as string }}
                    />
                  </span>
                )}
                {/* Coluna própria, alinhada à DIREITA: é assim que uma pilha de números se compara de
                    relance — as unidades sob as unidades. Alinhado à esquerda, cada valor
                    começa num lugar e o olho tem de reancorar a cada linha. */}
                <Text papel="rotulo" numerico className="text-right tabular-nums">
                  {valor ?? t("canonicalAnalysis.argos.availability.unavailable")}
                </Text>
              </li>
            );
          })}
        </ul>

        <Text papel="micro" className="text-[hsl(var(--ds-accent-ink))]">
          {t("canonicalAnalysis.argos.investigate")}
        </Text>
      </Link>
    </li>
  );
}

export function Portas({
  agrupamento,
  rotuloDe,
}: {
  readonly agrupamento: AgrupamentoPorPorta;
  readonly rotuloDe: (id: string) => string;
}) {
  const { t } = useLanguage();
  // Porta VAZIA não nasce: um cartão dizendo "0 métricas" convida a entrar numa tela em branco.
  // A aba correspondente continua lá, com a contagem zero visível antes do clique.
  const comConteudo = PORTAS.filter((p) => agrupamento.porPorta[p].length > 0);
  if (comConteudo.length === 0) return null;

  return (
    <section data-revelar aria-labelledby="argos-portas" className="space-y-3">
      <h2
        id="argos-portas"
        className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground"
      >
        {t("canonicalAnalysis.argos.whereToInvestigate")}
      </h2>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {comConteudo.map((p) => (
          <Porta key={p} porta={p} itens={agrupamento.porPorta[p]} rotuloDe={rotuloDe} />
        ))}
      </ul>
    </section>
  );
}
