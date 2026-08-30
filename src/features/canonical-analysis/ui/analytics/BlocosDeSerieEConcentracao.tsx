import { useLanguage } from "@/contexts/LanguageContext";
import { Bar, Disclosure } from "@/design/primitives";
import { estatisticaConhecida } from "../../result/estatisticas";
import {
  largurasDeConcentracao,
  largurasDeSerie,
} from "../../result/barrasDaProjecao";
import type { SnapshotAnalitico } from "../../result/analyticsProjection";
import { MapaDeProcedencia } from "./MapaDeProcedencia";
import { Suprimido } from "./EstadoDeSupressao";

export function Concentracoes({ snapshot }: { readonly snapshot: SnapshotAnalitico }) {
  const { t, language } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const numero = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const percentual = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 2,
  });
  const larguras = snapshot.concentrations.map(largurasDeConcentracao);
  const faixa = (inferior: number, superior: number) =>
    `${inferior.toLocaleString(locale)}–${superior.toLocaleString(locale)}`;
  return (
    <div>
      {snapshot.concentrations.map((c, iBloco) => (
        <div key={c.measure_id} className="bloco-med">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm">{c.measure_id}</span>
            {c.suppression_applied || c.coarsening_applied ? <Suprimido /> : null}
          </div>
          <ul className="mt-1 space-y-0.5">
            {c.statistics.map((s) => (
              <li key={s.statistic_id} className="flex justify-between gap-3 text-xs">
                <span>
                  {estatisticaConhecida(s.statistic_id)
                    ? t(`canonicalAnalysis.analyticsView.statistic.${s.statistic_id}`)
                    : s.statistic_id}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {s.value !== null ? (
                    s.statistic_id.includes("share") ? (
                      percentual.format(s.value)
                    ) : (
                      numero.format(s.value)
                    )
                  ) : s.lower_bound !== null && s.upper_bound !== null ? (
                    `${numero.format(s.lower_bound)}–${numero.format(s.upper_bound)}`
                  ) : (
                    <>
                      {t("canonicalAnalysis.analyticsView.notPublished")}
                      {s.reason_code ? (
                        <span className="ml-2 font-mono opacity-70">{s.reason_code}</span>
                      ) : null}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {c.bands.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {c.bands.map((b, i) => (
                <Bar
                  key={`${b.lower_value}-${b.upper_value}`}
                  rotulo={faixa(b.lower_value, b.upper_value)}
                  valor={String(b.entity_count)}
                  largura={larguras[iBloco][i]}
                  rotuloSuprimido={t("canonicalAnalysis.analyticsView.suppressed")}
                />
              ))}
            </ul>
          ) : null}
          <Disclosure
            className="desdobra"
            gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}
          >
            <MapaDeProcedencia
              bloco={{ tipo: "concentracao", dado: c }}
              denominador={snapshot.record_count}
            />
          </Disclosure>
        </div>
      ))}
    </div>
  );
}

export function Series({ snapshot }: { readonly snapshot: SnapshotAnalitico }) {
  const { t, language } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const formatarJanela = (valor: string) => {
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
      ? valor
      : data.toLocaleDateString(locale, {
          year: "numeric",
          month: "short",
          day: "2-digit",
          timeZone: "UTC",
        });
  };
  const larguras = snapshot.time_series.map(largurasDeSerie);
  return (
    <div>
      {snapshot.time_series.map((s, iBloco) => (
        <div key={s.dimension_id} className="bloco-med">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm">{s.dimension_id}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{s.effective_granularity}</span>
              <span>{s.timezone}</span>
              {s.suppression_applied || s.temporal_series_suppressed ? <Suprimido /> : null}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[0.7rem] text-muted-foreground">
            {t("canonicalAnalysis.analyticsView.methodLine", {
              id: s.method_id,
              version: String(s.method_version),
            })}
          </p>
          <ul className="grupos">
            {s.windows.map((j, i) => (
              <Bar
                key={j.window_start}
                rotulo={formatarJanela(j.window_start)}
                valor={j.count !== null ? String(j.count) : null}
                largura={larguras[iBloco][i]}
                suprimida={j.count === null}
                rotuloSuprimido={t("canonicalAnalysis.analyticsView.suppressed")}
              />
            ))}
          </ul>
          <Disclosure
            className="desdobra"
            gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}
          >
            <MapaDeProcedencia
              bloco={{ tipo: "serie", dado: s }}
              denominador={snapshot.record_count}
            />
          </Disclosure>
        </div>
      ))}
    </div>
  );
}
