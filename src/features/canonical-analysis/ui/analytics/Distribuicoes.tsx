// Área das distribuições de rótulo. Serve tanto as MEDIDAS categóricas quanto as DIMENSÕES —
// os dois têm a mesma forma, e a diferença (espaço de nomes) aparece no título da seção, não na
// apresentação de cada bloco.

import { useLanguage } from "@/contexts/LanguageContext";
import type { DistributionView } from "../../result/adapterV2";
import { Bar, DefinitionGrid, Note, Panel } from "@/design/primitives";

export function AreaDeDistribuicoes({
  distribuicoes,
  tituloKey,
  id,
}: {
  distribuicoes: readonly DistributionView[];
  tituloKey: string;
  id: string;
}) {
  const { t } = useLanguage();
  if (distribuicoes.length === 0) return null;
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h3 id={id} className="text-base font-semibold text-foreground">
        {t(tituloKey)}
      </h3>
      <ul className="grid gap-4">
        {distribuicoes.map((d) => (
          <Panel key={d.id} titulo={d.label}>
            {d.groups.length > 0 && (
              <ul className="mt-3 space-y-2">
                {d.groups.map((g) => (
                  <Bar
                    key={g.label}
                    rotulo={g.label}
                    valor={g.countDisplay}
                    largura={g.barWidth}
                    rotuloSuprimido={t("canonicalAnalysis.result.analytics.windowSuppressed")}
                  />
                ))}
              </ul>
            )}
            <DefinitionGrid itens={d.counts} />
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <div className="flex items-baseline gap-2">
                <dt className="text-muted-foreground">
                  {t("canonicalAnalysis.result.analytics.distinctObserved")}
                </dt>
                <dd className="font-medium text-foreground">{d.distinctObservedDisplay}</dd>
              </div>
              {/* `other` só aparece quando a origem o publicou. `null` NÃO vira zero: zero diria
                  "não havia ninguém fora dos grupos nomeados", que é outra afirmação. */}
              {d.otherCountDisplay !== null && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-muted-foreground">
                    {t("canonicalAnalysis.result.analytics.otherCount")}
                  </dt>
                  <dd className="font-medium text-foreground">{d.otherCountDisplay}</dd>
                </div>
              )}
            </dl>
            {/* As três notas são distintas de propósito: "cardinalidade alta demais" é decisão,
                "alguns rótulos não saíram" é o piso, e a ausência de `other` diz que nem a soma
                dos suprimidos podia ser publicada. Colapsá-las esconderia qual aconteceu. */}
            {d.highCardinalitySuppressed && (
              <Note>{t("canonicalAnalysis.result.analytics.highCardinality")}</Note>
            )}
            {d.suppressed && !d.highCardinalitySuppressed && (
              <Note>
                {t("canonicalAnalysis.result.analytics.suppressedGroups")}
                {d.otherCountDisplay === null &&
                  ` ${t("canonicalAnalysis.result.analytics.otherWithheld")}`}
              </Note>
            )}
            <Note>
              {/* Interpolação pelo caminho canônico. Antes era `.replace("{n}", …)` na mão —
                  uma segunda via que funcionava neste ponto e deixava o placeholder `{n}` sem
                  ninguém que o substituísse em qualquer outro lugar que usasse `t(chave, params)`. */}
              {t("canonicalAnalysis.result.analytics.minGroupSize", { n: d.minGroupSize })}
            </Note>
          </Panel>
        ))}
      </ul>
    </section>
  );
}
