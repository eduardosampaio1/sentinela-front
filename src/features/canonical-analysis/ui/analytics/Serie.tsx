// Área da série temporal.
//
// Sem biblioteca de gráfico: as janelas são barras horizontais rotuladas, com o número escrito.
// Uma série de até 400 janelas (o teto do contrato) é legível assim, e cada ponto continua
// nomeado — o que uma linha desenhada não garante.

import { useLanguage } from "@/contexts/LanguageContext";
import type { SeriesView } from "../../result/adapterV2";
import { Barra, Cartao, Contagens, Nota } from "./primitivas";

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
          <Cartao key={s.id} titulo={s.label}>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("canonicalAnalysis.result.analytics.granularity")}: {s.granularity} · {s.timezone}
            </p>
            {s.windows.length > 0 && (
              <ul className="mt-3 space-y-2">
                {s.windows.map((w) => (
                  <Barra
                    key={w.label}
                    rotulo={w.label}
                    valor={w.countDisplay}
                    largura={w.barWidth}
                    // Janela retida não desenha barra. Uma barra de largura zero seria lida
                    // como "nada aconteceu neste mês" — sobre exatamente o mês cujo número foi
                    // protegido.
                    retida={w.count === null}
                  />
                ))}
              </ul>
            )}
            <Contagens itens={s.counts} />
            {/* Série suprimida INTEIRA é diferente de série sem janelas: a primeira é decisão de
                privacidade, e sem esta nota o cartão vazio pareceria dado faltando. */}
            {s.seriesSuppressed && (
              <Nota>{t("canonicalAnalysis.result.analytics.seriesSuppressed")}</Nota>
            )}
            {s.coarsened && <Nota>{t("canonicalAnalysis.result.analytics.coarsenedSeries")}</Nota>}
          </Cartao>
        ))}
      </ul>
    </section>
  );
}
