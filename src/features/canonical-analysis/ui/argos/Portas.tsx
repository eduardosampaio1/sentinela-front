// As PORTAS da Visão geral — os cartões que o protótipo chamava de "onde investigar".
//
// ## Quatro portas, não três
//
// O protótipo desenhou TRÊS portas — "Qualidade & Comportamento", "Economia & Eficiência",
// "Cobertura & Evidência". Aquele agrupamento era um chute editorial dele, feito antes de alguém
// olhar o contrato. O contrato publica `domain` com vocabulário FECHADO de quatro valores, e é
// esse o eixo real.
//
// Então: mesmo desenho, taxonomia verdadeira. Uma porta por domínio publicado.
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
import type { Domain } from "@/lib/v1/contract/public-v3.types";
import {
  DOMINIOS,
  PARAM_DOMINIO,
  type AgrupamentoPorDominio,
  type ItemDeDominio,
} from "../../result/dominiosDoArgos";
import { largurasDeItens, valorDoItem } from "../../result/barrasDoArgos";

/** Quantos sinais cada porta resume. Três, como o protótipo. */
const SINAIS_POR_PORTA = 3;

function Porta({
  dominio,
  itens,
  rotuloDe,
}: {
  readonly dominio: Domain;
  readonly itens: readonly ItemDeDominio[];
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
        to={`${pathname}?${PARAM_DOMINIO}=${dominio}`}
        className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-[hsl(var(--ds-accent-ink))] hover:bg-muted"
      >
        <div className="flex items-baseline gap-3">
          <Text papel="destaque">{t(`canonicalAnalysis.argos.dimension.${dominio}`)}</Text>
          {/* A contagem é DADO: quantos números o produtor pôs neste domínio. */}
          <Text papel="micro" tom="discreto" numerico className="ml-auto">
            {t("canonicalAnalysis.argos.metricCount", { n: itens.length })}
          </Text>
        </div>

        {/* A PERGUNTA que a porta responde. É copy, e é o que transforma um rótulo taxonômico em
            um motivo para entrar. */}
        <Text papel="corpo" tom="discreto">
          {t(`canonicalAnalysis.argos.domainQuestion.${dominio}`)}
        </Text>

        <ul className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          {amostra.map((entrada, i) => {
            const id = "measurement" in entrada.item ? entrada.item.measurement.id : entrada.item.id;
            const valor = valorDoItem(entrada, locale);
            return (
              <li key={`${entrada.familia}:${id}`} className="flex items-center gap-3 text-xs">
                <Text papel="rotulo" tom="discreto" className="min-w-0 truncate">
                  {rotuloDe(id)}
                </Text>
                {/* Mini-barra: magnitude, nunca veredito. `aria-hidden` porque o número está ao
                    lado — a barra é redundância, e leitor de tela não precisa dela. */}
                <span
                  className="ml-auto h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <span
                    data-revelar="barra"
                    className="block h-full rounded-full bg-primary"
                    style={{ width: larguras[i] }}
                  />
                </span>
                <Text papel="rotulo" numerico className="shrink-0 tabular-nums">
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
  readonly agrupamento: AgrupamentoPorDominio;
  readonly rotuloDe: (id: string) => string;
}) {
  const { t } = useLanguage();
  // Porta VAZIA não nasce: um cartão dizendo "0 métricas" convida a entrar numa tela em branco.
  // A aba correspondente continua lá, com a contagem zero visível antes do clique.
  const comConteudo = DOMINIOS.filter((d) => agrupamento.porDominio[d].length > 0);
  if (comConteudo.length === 0) return null;

  return (
    <section data-revelar aria-labelledby="argos-portas" className="space-y-3">
      <h2
        id="argos-portas"
        className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground"
      >
        {t("canonicalAnalysis.argos.whereToInvestigate")}
      </h2>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {comConteudo.map((d) => (
          <Porta
            key={d}
            dominio={d}
            itens={agrupamento.porDominio[d]}
            rotuloDe={rotuloDe}
          />
        ))}
      </ul>
    </section>
  );
}
