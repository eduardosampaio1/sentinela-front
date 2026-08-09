// Área da concentração de volume — o Pareto.
//
// As duas perguntas do vocabulário aparecem SEMPRE, respondidas ou explicitamente não
// respondidas. Omitir a que não saiu faria "não pôde ser calculada" e "não foi perguntada"
// virarem o mesmo silêncio.

import { useLanguage } from "@/contexts/LanguageContext";
import type { ConcentrationView } from "../../result/adapterV2";
import { Bar, DefinitionGrid, Note, Panel } from "@/design/primitives";

export function AreaDeConcentracao({
  concentracoes,
}: {
  concentracoes: readonly ConcentrationView[];
}) {
  const { t } = useLanguage();
  if (concentracoes.length === 0) return null;
  return (
    <section aria-labelledby="an-concentracao" className="space-y-3">
      <h3 id="an-concentracao" className="text-base font-semibold text-foreground">
        {t("canonicalAnalysis.result.analytics.concentrationsTitle")}
      </h3>
      <ul className="grid gap-4">
        {concentracoes.map((c) => (
          <Panel key={c.id} titulo={`${c.label} · ${c.unit}`}>
            <dl className="mt-3 space-y-2">
              {c.statistics.map((e) => (
                <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-sm text-muted-foreground">{e.label}</dt>
                  <dd className="text-right">
                    {e.display === null ? (
                      // Sem número, e com o motivo em texto derivado de vocabulário FECHADO.
                      <span className="text-sm text-muted-foreground">{e.withheldLabel}</span>
                    ) : (
                      <>
                        <span className="text-lg font-semibold text-foreground">{e.display}</span>
                        {/* A exatidão é DECLARADA pela origem. Um intervalo apresentado como
                            ponto seria uma precisão que a conta não tem. */}
                        {e.precision === "bounded" && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t("canonicalAnalysis.result.analytics.precisionBounded")}
                          </span>
                        )}
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {c.bands.length > 0 && (
              <>
                <p className="mt-4 text-xs font-medium text-muted-foreground">
                  {t("canonicalAnalysis.result.analytics.bandsTitle")}
                </p>
                <ul className="mt-2 space-y-2">
                  {c.bands.map((b) => (
                    <Bar
                      key={b.label}
                      rotulo={b.label}
                      valor={b.entityCountDisplay}
                      largura={b.barWidth}
                      rotuloSuprimido={t("canonicalAnalysis.result.analytics.windowSuppressed")}
                    />
                  ))}
                </ul>
              </>
            )}

            <DefinitionGrid itens={c.counts} />
            {c.totalVolumeDisplay !== null && (
              <p className="mt-2 flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  {t("canonicalAnalysis.result.analytics.totalVolume")}
                </span>
                <span className="font-medium text-foreground">{c.totalVolumeDisplay}</span>
              </p>
            )}
            {c.coarsened && <Note>{t("canonicalAnalysis.result.analytics.coarsened")}</Note>}
            {c.highCardinalitySuppressed && (
              <Note>{t("canonicalAnalysis.result.analytics.highCardinality")}</Note>
            )}
          </Panel>
        ))}
      </ul>
    </section>
  );
}
