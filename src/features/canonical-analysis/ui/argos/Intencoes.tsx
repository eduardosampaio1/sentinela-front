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
          {t("canonicalAnalysis.argos.minSamples")}:{" "}
          <span className="tabular-nums">{pisoDeAmostra}</span>
        </p>
      ) : null}

      {/* TABELA, e não duas listas paralelas — o desenho é o do Molde V4.
          Antes eram barras em cima e uma linha corrida embaixo, com seis fatos separados por
          espaço. Comparar o escore de duas intenções exigia ler duas linhas inteiras e achar o
          número no meio de cada uma. Em coluna, comparar é percorrer uma coluna.
          O que muda em relação ao molde: aqui nada é calculado. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 text-left font-normal">
                {t("canonicalAnalysis.argos.intentColumn")}
              </th>
              <th scope="col" className="py-2 pl-4 text-right font-normal">
                {t("canonicalAnalysis.argos.intentScore")}
              </th>
              {/* O CORTE como coluna, e não a distância até ele.
                  A distância seria a tela produzindo um número que o backend não publicou. Com
                  as duas colunas lado a lado quem quiser a diferença a lê — e a conta fica
                  visível em vez de embutida. */}
              <th scope="col" className="py-2 pl-4 text-right font-normal">
                {t("canonicalAnalysis.argos.thresholdColumn")}
              </th>
              <th scope="col" className="py-2 pl-4 text-right font-normal">
                {t("canonicalAnalysis.argos.severity")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((i, idx) => {
              const escore = valorEscrito(i.score, locale);
              const corte = i.score?.thresholds?.warn ?? null;
              const estabilidade = i.response_stability
                ? valorEscrito(i.response_stability, locale)
                : null;
              const variancia = i.response_variance
                ? valorEscrito(i.response_variance, locale)
                : null;
              const deriva = i.semantic_drift ? valorEscrito(i.semantic_drift, locale) : null;
              const detalhes: [string, string][] = [];
              // O SUPORTE primeiro: é o denominador que sustenta a linha inteira. Uma nota sobre
              // uma conversa e uma sobre duzentas não são a mesma afirmação. É `support`
              // publicado — nunca uma porcentagem calculada aqui.
              detalhes.push([t("canonicalAnalysis.argos.support"), String(i.support)]);
              if (estabilidade !== null) {
                detalhes.push([
                  t("canonicalAnalysis.argos.output.response_stability"),
                  estabilidade,
                ]);
              }
              // VARIÂNCIA: maior significa mais dispersão, não mais qualidade — e o rótulo diz
              // isso, para não virar "consistência" na leitura.
              if (variancia !== null) {
                detalhes.push([t("canonicalAnalysis.argos.responseVariance"), variancia]);
              }
              // MAIOR É PIOR, como a variância. O rótulo é o nome oficial da métrica, não uma
              // paráfrase que sugira qualidade.
              if (deriva !== null) {
                detalhes.push([t("canonicalAnalysis.argos.output.semantic_drift"), deriva]);
              }
              return (
                <tr key={i.intent_id} className="border-b border-border/40 last:border-b-0">
                  <td className="py-2 pr-4 align-top">
                    {/* `intent_id` é vocabulário do CLIENTE: não se traduz e não se humaniza. */}
                    <span className="font-mono">{i.intent_id}</span>
                    {/* Dado do produtor, não conclusão minha sobre o piso. */}
                    {i.underrepresented ? (
                      <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
                        {t("canonicalAnalysis.argos.underrepresented")}
                      </span>
                    ) : null}
                    <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {detalhes.map(([rot, val]) => (
                        <div key={rot} className="flex gap-1">
                          <dt>{rot}:</dt>
                          <dd className="tabular-nums text-foreground">{val}</dd>
                        </div>
                      ))}
                      {/* O MOTIVO do veredito, e por que ele é obrigatório aqui.

                          `severity` NÃO é o limiar aplicado ao escore: o motor a escala para
                          `WARN` por evidência de mismatch semântico sem olhar a nota. Medido com
                          o motor real, uma intenção com `governance_score = 100` sai `WARN` — e
                          com o limiar publicado, 100 cai na zona VERDE. Sem esta linha a tela
                          mostra atenção ao lado de um número bom e não tem o que dizer.

                          TRÊS estados. `null` = o produtor não declarou, e a tela DIZ isso em vez
                          de calar: veredito sem explicação é o defeito, e "não sabemos por quê" é
                          honesto onde o silêncio não é. `[]` = declarou e não há motivo.

                          Os códigos saem CRUS quando não há tradução: sumir com um código que o
                          produtor mandou é pior que exibi-lo sem rótulo. */}
                      {i.severity && (i.severity || "").toUpperCase() !== "OK" ? (
                        <div className="flex gap-1">
                          <dt>{t("canonicalAnalysis.argos.severityReason")}:</dt>
                          <dd className="text-foreground">
                            {i.severity_reason === null || i.severity_reason === undefined
                              ? t("canonicalAnalysis.argos.severityReasonAbsent")
                              : i.severity_reason
                                  .map((c) => rotuloDoMotivo(t, c))
                                  .join(" · ")}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </td>
                  <td className="py-2 pl-4 align-top text-right">
                    <span className="tabular-nums">
                      {escore ?? t("canonicalAnalysis.argos.availability.unavailable")}
                    </span>
                    {/* A barra mede o que a coluna diz, e fica sob o número.
                        NÃO é o primitivo `Bar`: ele é um `<li>` com rótulo e valor próprios, e
                        dentro de `<td>` seria HTML inválido e um `listitem` sem lista.
                        Sem escore não há barra: largura zero e ausência são indistinguíveis, e
                        afirmam coisas opostas. */}
                    {escore === null ? null : (
                      <span
                        aria-hidden="true"
                        className="mt-1 block h-1.5 w-full min-w-[4rem] overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: larguras[idx] }}
                        />
                      </span>
                    )}
                  </td>
                  <td className="py-2 pl-4 align-top text-right tabular-nums text-muted-foreground">
                    {corte === null ? "—" : corte}
                  </td>
                  <td className="py-2 pl-4 align-top text-right">
                    {i.severity ? (
                      // O veredito como CHIP, e não como pedaço de frase no fim de uma linha
                      // corrida. O valor vem do produtor e é exibido como veio — a tela não
                      // decide gravidade, e por isso o chip não ganha cor por valor: colorir
                      // exigiria um vocabulário fechado que o contrato não publica.
                      <span className="whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-xs">
                        {i.severity}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
