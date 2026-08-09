// Área da série temporal.
//
// Sem biblioteca de gráfico: as janelas são barras horizontais rotuladas, com o número escrito.
// Uma série de até 400 janelas (o teto do contrato) é legível assim, e cada ponto continua
// nomeado — o que uma linha desenhada não garante.

import { useLanguage } from "@/contexts/LanguageContext";
import type { SeriesView } from "../../result/adapterV2";
import { Bar, DefinitionGrid, Note, Panel } from "@/design/primitives";

export function AreaDeSerie({ series }: { series: readonly SeriesView[] }) {
  const { t } = useLanguage();
  if (series.length === 0) return null;
  return (
    <section aria-labelledby="an-serie" className="space-y-3">
      <h3 id="an-serie" className="text-base font-semibold text-foreground">
        {t("canonicalAnalysis.result.analytics.seriesTitle")}
      </h3>
      <ul className="grid gap-4">
        {series.map((s) => (
          <Panel key={s.id} titulo={s.label}>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("canonicalAnalysis.result.analytics.granularity")}: {s.granularity} · {s.timezone}
            </p>
            {s.windows.length > 0 && (
              <ul className="mt-3 space-y-2">
                {s.windows.map((w) => (
                  <Bar
                    key={w.label}
                    rotulo={w.label}
                    valor={w.countDisplay}
                    largura={w.barWidth}
                    // Janela retida não desenha barra. Uma barra de largura zero seria lida
                    // como "nada aconteceu neste mês" — sobre exatamente o mês cujo número foi
                    // protegido.
                    suprimida={w.count === null}
                    // O rótulo do caso suprimido é vocabulário CONGELADO, e quem o conhece é esta
                    // camada. A barra deixou de traduzir na M10 justamente para não conhecer i18n
                    // de produto — o significado continua aqui, onde sempre esteve.
                    rotuloSuprimido={t("canonicalAnalysis.result.analytics.windowSuppressed")}
                  />
                ))}
              </ul>
            )}
            <DefinitionGrid itens={s.counts} />
            {/* Série suprimida INTEIRA é diferente de série sem janelas: a primeira é decisão de
                privacidade, e sem esta nota o cartão vazio pareceria dado faltando. */}
            {s.seriesSuppressed && (
              <Note>{t("canonicalAnalysis.result.analytics.seriesSuppressed")}</Note>
            )}
            {s.coarsened && <Note>{t("canonicalAnalysis.result.analytics.coarsenedSeries")}</Note>}
          </Panel>
        ))}
      </ul>
    </section>
  );
}
