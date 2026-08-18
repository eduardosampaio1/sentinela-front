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
import { largurasDeSuporte } from "../../result/barrasDoArgos";
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
  const larguras = largurasDeSuporte(intents);

  return (
    <div>
      {/* O piso primeiro, porque é ele que explica a marca que aparece nas linhas abaixo. */}
      {pisoDeAmostra !== null ? (
        <p className="pb-2 text-xs text-muted-foreground">
          {t("canonicalAnalysis.argos.minSamples")}: <span className="tabular-nums">{pisoDeAmostra}</span>
        </p>
      ) : null}

      <ul className="space-y-1">
        {intents.map((i, idx) => (
          <Bar
            key={i.intent_id}
            // `intent_id` é vocabulário do CLIENTE: não se traduz e não se humaniza. É o mesmo
            // motivo pelo qual `rotuloDe` não o toca.
            rotulo={i.intent_id}
            valor={String(i.support)}
            largura={larguras[idx]}
            rotuloSuprimido={t("canonicalAnalysis.argos.availability.unavailable")}
          />
        ))}
      </ul>

      {/* O detalhe por intenção, abaixo da barra e só quando o produtor o publicou. Cada campo é
          rotulado: `severity` saía como pedaço solto depois de um ponto médio, sem dizer o que era. */}
      <dl className="mt-3 space-y-2">
        {intents.map((i) => {
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
