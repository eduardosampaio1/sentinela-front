// As intenções, com o suporte dito por comprimento — e três campos que estavam publicados e
// ninguém lia.
//
// ## O que estava caindo no chão
//
// `PublicIntent` publica `support`, `underrepresented`, `severity`, `response_stability` e
// `response_variance`. A tela mostrava `support` como número solto depois de dois pontos, o resto
// como pedaço concatenado, e `response_variance` **nunca aparecia**. Somando o `min_samples_per_intent`
// de `method`, que também nunca era lido, eram três fatos publicados invisíveis.
//
// ## O piso é DECLARADO, e o rótulo de sub-representada também
//
// A tentação óbvia é comparar `support` com o piso e concluir quem está abaixo. Não faço: o
// produtor já publica `underrepresented` por intenção, e recalcular aqui criaria uma segunda
// verdade sobre o mesmo fato — livre para divergir do produtor no dia em que a regra dele mudar.
//
// O piso aparece como CONTEXTO, para a pessoa saber contra o que a marca foi decidida. Não é a
// origem da marca.

import { useLanguage } from "@/contexts/LanguageContext";
import { Bar } from "@/design/primitives";
import type { PublicIntent } from "@/lib/v1/contract/public-v3.types";
import {
  largurasDeEscore,
  ordenadasPorPior,
} from "../../result/barrasDoArgos";
import { valorEscrito } from "../../result/medicaoV3";

export function Intencoes({
  intents,
  pisoDeAmostra,
}: {
  readonly intents: readonly PublicIntent[];
  /** `method.min_samples_per_intent`. `null` quando o produtor não o declarou. */
  readonly pisoDeAmostra: number | null;
}) {
  const { t, language } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  // RANKING: pior primeiro, e a barra mede QUALIDADE.
  //
  // A versão anterior desenhava a barra pelo SUPORTE, na ordem do documento — respondia "qual
  // intenção tem mais conversas", que é pergunta de cobertura, não de qualidade. Com a massa de
  // hoje (escores 10, 80, 22.5) a pior ficava no meio da lista.
  //
  // O suporte NÃO some: ele passa para a linha de detalhe, junto do resto. A primeira versão
  // desta mudança o tirou da barra e o comentário afirmou que ele continuava na linha — e não
  // continuava: o detalhe nunca o mostrou. Afirmação sobre a tela se confere na tela.
  const ordenadas = ordenadasPorPior(intents);
  const larguras = largurasDeEscore(ordenadas);



  return (
    <div>
      {/* O piso primeiro, porque é ele que explica a marca que aparece nas linhas abaixo. */}
      {pisoDeAmostra !== null ? (
        <p className="pb-2 text-xs text-muted-foreground">
          {t("canonicalAnalysis.argos.minSamples")}: <span className="tabular-nums">{pisoDeAmostra}</span>
        </p>
      ) : null}

      <ul className="space-y-1">
        {ordenadas.map((i, idx) => {
          const escore = valorEscrito(i.score, locale);
          return (
            <Bar
              key={i.intent_id}
              // `intent_id` é vocabulário do CLIENTE: não se traduz e não se humaniza. É o mesmo
              // motivo pelo qual `rotuloDe` não o toca.
              rotulo={i.intent_id}
              // O ESCORE é o que a barra mede, e por isso é o que ela escreve. O suporte fica na
              // linha de detalhe abaixo: escrever os dois aqui faria o número ao lado da barra
              // deixar de dizer o que a barra representa.
              valor={escore}
              largura={larguras[idx]}
              rotuloSuprimido={t("canonicalAnalysis.argos.availability.unavailable")}
            />
          );
        })}
      </ul>

      {/* O detalhe por intenção, abaixo da barra e só quando o produtor o publicou. Cada campo é
          rotulado: `severity` saía como pedaço solto depois de um ponto médio, sem dizer o que era. */}
      <dl className="mt-3 space-y-2">
        {ordenadas.map((i) => {
          const estabilidade = i.response_stability ? valorEscrito(i.response_stability, locale) : null;
          const variancia = i.response_variance ? valorEscrito(i.response_variance, locale) : null;
          const deriva = i.semantic_drift ? valorEscrito(i.semantic_drift, locale) : null;
          const escore = valorEscrito(i.score, locale);
          const temDetalhe =
            escore !== null ||
            estabilidade !== null ||
            variancia !== null ||
            deriva !== null ||
            i.severity ||
            i.underrepresented;
          if (!temDetalhe) return null;
          return (
            <div key={i.intent_id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
              <dt className="font-mono text-muted-foreground">{i.intent_id}</dt>
              {/* O SUPORTE vem primeiro porque é o denominador que sustenta tudo o que vem
                  depois: uma nota sobre uma conversa e uma nota sobre duzentas não são a mesma
                  afirmação, e a ordem de leitura diz isso sem precisar de frase. */}
              <dd className="text-muted-foreground">
                {t("canonicalAnalysis.argos.support")}:{" "}
                <span className="tabular-nums text-foreground">{i.support}</span>
              </dd>
              {escore !== null ? (
                <dd className="text-muted-foreground">
                  {t("canonicalAnalysis.argos.intentScore")}:{" "}
                  <span className="tabular-nums text-foreground">{escore}</span>
                </dd>
              ) : null}
              {estabilidade !== null ? (
                <dd className="text-muted-foreground">
                  {t("canonicalAnalysis.argos.output.response_stability")}:{" "}
                  <span className="tabular-nums text-foreground">{estabilidade}</span>
                </dd>
              ) : null}
              {/* NUNCA lido até aqui. É VARIÂNCIA: valor maior significa mais dispersão, não mais
                  qualidade — e o rótulo diz isso, para não virar "consistência" na leitura. */}
              {variancia !== null ? (
                <dd className="text-muted-foreground">
                  {t("canonicalAnalysis.argos.responseVariance")}:{" "}
                  <span className="tabular-nums text-foreground">{variancia}</span>
                </dd>
              ) : null}
              {/* MAIOR E PIOR, como a variancia acima — e por isso o rotulo e o nome oficial da
                  metrica, nao uma parafrase que sugira qualidade. Mede quao diferentes sao as
                  respostas dadas DENTRO desta intencao, ou seja, a perguntas parecidas. */}
              {deriva !== null ? (
                <dd className="text-muted-foreground">
                  {t("canonicalAnalysis.argos.output.semantic_drift")}:{" "}
                  <span className="tabular-nums text-foreground">{deriva}</span>
                </dd>
              ) : null}
              {i.severity ? (
                <dd className="text-muted-foreground">
                  {t("canonicalAnalysis.argos.severity")}:{" "}
                  <span className="text-foreground">{i.severity}</span>
                </dd>
              ) : null}
              {/* O MOTIVO do veredito, e por que ele é obrigatório aqui.

                  `severity` NÃO é o limiar aplicado ao escore: o motor a escala para `WARN`
                  por evidência de mismatch semântico sem olhar a nota. Medido com o motor
                  real, uma intenção com `governance_score = 100` sai `WARN` — e com o
                  limiar publicado, 100 cai na zona VERDE. Sem esta linha a tela mostra
                  atenção ao lado de um número bom e não tem o que dizer.

                  TRÊS estados. `null` = o produtor não declarou (motor anterior à fatia), e
                  a tela DIZ isso em vez de calar: veredito sem explicação é o defeito, e
                  "não sabemos por quê" é honesto onde o silêncio não é. `[]` = declarou e
                  não há motivo, e aí não há o que mostrar.

                  Os códigos saem CRUS quando não há tradução. Sumir com um código que o
                  produtor mandou é pior que exibi-lo sem rótulo. */}
              {i.severity && (i.severity || "").toUpperCase() !== "OK" ? (
                <dd className="text-muted-foreground">
                  {t("canonicalAnalysis.argos.severityReason")}:{" "}
                  <span className="text-foreground">
                    {i.severity_reason === null || i.severity_reason === undefined
                      ? t("canonicalAnalysis.argos.severityReasonAbsent")
                      : i.severity_reason
                          .map((c) => rotuloDoMotivo(t, c))
                          .join(" · ")}
                  </span>
                </dd>
              ) : null}
              {/* Dado do produtor, não conclusão minha sobre o piso. */}
              {i.underrepresented ? (
                <dd className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                  {t("canonicalAnalysis.argos.underrepresented")}
                </dd>
              ) : null}
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/**
 * O rótulo humano de um código de motivo, ou o CÓDIGO CRU.
 *
 * Caminho literal por código, e não `t(variavel)`: o gate de i18n não enxerga chave montada, e
 * uma chave ausente sairia na tela como a própria chave — que parece um rótulo e não é.
 *
 * O vocabulário é ABERTO no contrato de propósito: código novo no motor chega ao consumidor em
 * vez de derrubar a montagem. Aqui isso vira a regra do `default`: mostra cru. Sumir com o que
 * o produtor mandou seria pior que exibir sem tradução.
 */
function rotuloDoMotivo(t: (k: string) => string, codigo: string): string {
  switch (codigo) {
    case "SCORE_BELOW_CRIT":
      return t("canonicalAnalysis.argos.severityReasonCode.SCORE_BELOW_CRIT");
    case "SCORE_BELOW_WARN":
      return t("canonicalAnalysis.argos.severityReasonCode.SCORE_BELOW_WARN");
    case "CROSS_INTENT_PENALTY":
      return t("canonicalAnalysis.argos.severityReasonCode.CROSS_INTENT_PENALTY");
    case "SEMANTIC_MISMATCH_EVIDENCE":
      return t("canonicalAnalysis.argos.severityReasonCode.SEMANTIC_MISMATCH_EVIDENCE");
    default:
      return codigo;
  }
}
