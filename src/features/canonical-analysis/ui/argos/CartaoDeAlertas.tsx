// O CARTÃO DE ALERTAS — o lado esquerdo do herói, e a pergunta "há algo para fazer?".
//
// ## Por que ele existe
//
// A dobra do Diagnóstico respondia "quanto" (`89,23`) e "isso é bom?" (o veredito). Não
// respondia **"e há algo exigindo ação?"** — a pergunta que faz alguém abrir o painel de manhã.
// A resposta existia no documento desde sempre, espalhada: `critical_alert_count` no meio de
// dezoito indicadores, e a recomendação de maior prioridade numa família lá embaixo.
//
// ## O que ele mostra, e de onde vem CADA coisa
//
//   contagem de alertas críticos  →  `indicators[] · critical_alert_count`
//   onde agir                     →  `recommendations[0].title` + `.priority`
//
// Nada é derivado. A contagem é publicada como indicador — a tela NÃO conta `alerts.length`,
// porque as duas coisas podem legitimamente divergir (nem todo alerta é crítico) e a que vale é
// a do produtor.
//
// ## A ausência é o caso comum, não a exceção
//
// Na análise que atravessou homologação em 2026-08-23, `recommendations` chega **nulo** e
// `critical_alert_count` chega **zero**. São dados diferentes e dizem coisas diferentes: zero
// alerta crítico é uma medição (nada crítico foi encontrado); recomendação nula é ausência de
// medição (o produtor não emitiu nenhuma). Um cartão que sumisse nos dois casos ensinaria que
// são a mesma coisa — e a #24 diz que ausência não é zero.
//
// ## Sobre repetir a recomendação
//
// Ela também aparece na família de conclusões, bem abaixo. Isso é promoção, não duplicação: o
// herói é resumo por definição, e as duas ocorrências leem o MESMO campo do MESMO documento —
// não há segunda fonte livre para divergir. A regra que proíbe o mesmo fato em dois pesos vale
// dentro da dobra, e a família não está nela.

import type { PublicIndicatorV3, PublicRecommendation } from "@/lib/v1/contract/public-v3.types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Text } from "@/design/primitives";
import { formatarNumero } from "../../result/formatacao";

export interface CartaoDeAlertasProps {
  /** `critical_alert_count`, quando o documento o publica. */
  readonly contagem: PublicIndicatorV3 | null;
  /** As recomendações como vieram — a ORDEM é do produtor, e não se reordena aqui. */
  readonly recomendacoes: readonly PublicRecommendation[] | null;
  readonly locale: string;
}

export function CartaoDeAlertas({ contagem, recomendacoes, locale }: CartaoDeAlertasProps) {
  const { t } = useLanguage();
  // `recommendations[0]` e não "a de maior prioridade": ordenar aqui exigiria a tela conhecer a
  // escala de prioridade do domínio, que o contrato publica como string livre. A ordem publicada
  // é a do produtor, e ela é a autoridade.
  const primeira = recomendacoes && recomendacoes.length > 0 ? recomendacoes[0] : null;

  return (
    <section
      data-revelar
      aria-labelledby="argos-alertas-criticos"
      className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5"
    >
      <div>
        {/* `h3` cru e nao a primitiva `Text`: ela nao aceita cabecalho como elemento, e a
            regiao precisa de um para ter nome acessivel. As classes sao as MESMAS que `papel
            micro` + `tom discreto` produzem — copiar o estilo e pior que reusar, mas inventar
            um cabecalho sem nivel semantico e pior que os dois. */}
        <h3
          id="argos-alertas-criticos"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          {t("canonicalAnalysis.argos.criticalAlertsTitle")}
        </h3>
        <ContagemCritica contagem={contagem} locale={locale} />
      </div>

      <div>
        <Text papel="micro" tom="discreto" as="p">
          {t("canonicalAnalysis.argos.whereToActTitle")}
        </Text>
        {primeira ? (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium leading-snug">{primeira.title}</p>
            {/* A prioridade vem como string do domínio e é escrita COMO VEIO. Traduzi-la
                exigiria conhecer o conjunto fechado dela, que o contrato não declara. */}
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {primeira.priority}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("canonicalAnalysis.argos.whereToActAbsent")}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * A contagem, com a distinção que importa: **não medida** ≠ **zero**.
 *
 * `state` é o campo que separa as duas, e ele é publicado. Ler só `value` faria `null` cair no
 * mesmo lugar que `0` na primeira vez que alguém escrevesse `value ?? 0`.
 */
function ContagemCritica({
  contagem,
  locale,
}: {
  readonly contagem: PublicIndicatorV3 | null;
  readonly locale: string;
}) {
  const { t } = useLanguage();

  if (!contagem || contagem.value === null || contagem.value === undefined) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        {t("canonicalAnalysis.argos.notMeasuredShort")}
        {contagem ? (
          <>
            {" · "}
            <span className="font-mono text-[11px]">{contagem.reason}</span>
          </>
        ) : null}
      </p>
    );
  }

  return (
    <p className="mt-1 flex items-baseline gap-2">
      <Text numerico className="text-4xl font-medium leading-none tracking-tight">
        {formatarNumero(contagem.value, locale, contagem.display_precision ?? 0)}
      </Text>
      <span className="text-sm text-muted-foreground">
        {t("canonicalAnalysis.argos.criticalAlertsOpen")}
      </span>
    </p>
  );
}

export default CartaoDeAlertas;
