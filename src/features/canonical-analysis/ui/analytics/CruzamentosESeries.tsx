import { useLanguage } from "@/contexts/LanguageContext";
import { Disclosure } from "@/design/primitives";
import type {
  CruzamentoComFlag,
  CruzamentoNumerico,
  SerieComFlag,
  SerieNumerica,
} from "../../result/analyticsProjection";
import { MapaDeProcedencia } from "./MapaDeProcedencia";

function CabecalhoDoBloco({
  dimensionId,
  measureId,
  suprimido,
}: {
  readonly dimensionId: string;
  readonly measureId: string;
  readonly suprimido: boolean;
}) {
  const { t } = useLanguage();
  return (
    <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-sm font-semibold">
        {dimensionId} × {measureId}
      </h3>
      {suprimido ? (
        <span className="selo-supr" data-suprimido="true">
          {t("canonicalAnalysis.analyticsView.suppressed")}
        </span>
      ) : null}
    </header>
  );
}

function Metodo({
  id,
  versao,
}: {
  readonly id: string;
  readonly versao: number;
}) {
  const { t } = useLanguage();
  return (
    <p className="mb-2 font-mono text-[0.7rem] text-muted-foreground">
      {t("canonicalAnalysis.analyticsView.methodLine", {
        id,
        version: String(versao),
      })}
    </p>
  );
}

function TaxaPublicada({ valor }: { readonly valor: number | null }) {
  const { t, language } = useLanguage();
  if (valor === null)
    return <>{t("canonicalAnalysis.analyticsView.notPublished")}</>;
  return (
    <>
      {new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(valor)}
    </>
  );
}

export function Cruzamentos({
  flags,
  numericos,
  denominador,
}: {
  readonly flags: readonly CruzamentoComFlag[];
  readonly numericos: readonly CruzamentoNumerico[];
  readonly denominador: number;
}) {
  const { t, language } = useLanguage();
  const numero = new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
    maximumFractionDigits: 2,
  });
  return (
    <div className="space-y-4">
      {flags.map((cruzamento) => (
        <article
          key={`${cruzamento.dimension_id}:${cruzamento.measure_id}`}
          className="bloco-med"
        >
          <CabecalhoDoBloco
            dimensionId={cruzamento.dimension_id}
            measureId={cruzamento.measure_id}
            suprimido={
              cruzamento.suppression_applied ||
              cruzamento.high_cardinality_suppressed
            }
          />
          <Metodo
            id={cruzamento.method_id}
            versao={cruzamento.method_version}
          />
          <p className="mb-2 text-xs text-muted-foreground">
            {t("canonicalAnalysis.analyticsView.crossGroups", {
              observed: String(cruzamento.groups_observed),
              suppressed: String(cruzamento.groups_suppressed),
            })}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left">
                    {t("canonicalAnalysis.analyticsView.group")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.true")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.false")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.nulls")}
                  </th>
                  <th className="py-2 text-right">
                    {t("canonicalAnalysis.analyticsView.trueRate")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cruzamento.rows.map((linha) => (
                  <tr key={linha.label} className="border-b border-border/40">
                    <th scope="row" className="py-2 text-left font-normal">
                      {linha.label}
                    </th>
                    <td className="px-2 text-right tabular-nums">
                      {linha.true_count}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {linha.false_count}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {linha.null_count}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      <TaxaPublicada valor={linha.true_rate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Disclosure
            className="desdobra"
            gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}
          >
            <MapaDeProcedencia
              bloco={{ tipo: "cruzamento_flag", dado: cruzamento }}
              denominador={denominador}
            />
          </Disclosure>
        </article>
      ))}
      {numericos.map((cruzamento) => (
        <article
          key={`${cruzamento.dimension_id}:${cruzamento.measure_id}`}
          className="bloco-med"
        >
          <CabecalhoDoBloco
            dimensionId={cruzamento.dimension_id}
            measureId={cruzamento.measure_id}
            suprimido={
              cruzamento.suppression_applied ||
              cruzamento.high_cardinality_suppressed
            }
          />
          <Metodo
            id={cruzamento.method_id}
            versao={cruzamento.method_version}
          />
          <p className="mb-2 text-xs text-muted-foreground">
            {cruzamento.unit} · {cruzamento.semantic_role}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left">
                    {t("canonicalAnalysis.analyticsView.group")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.valid")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.nulls")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.invalid")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.minimum")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.maximum")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.totalStat")}
                  </th>
                  <th className="py-2 text-right">
                    {t("canonicalAnalysis.analyticsView.mean")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cruzamento.rows.map((linha) => (
                  <tr key={linha.label} className="border-b border-border/40">
                    <th scope="row" className="py-2 text-left font-normal">
                      {linha.label}
                    </th>
                    <td className="px-2 text-right tabular-nums">
                      {numero.format(linha.count)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {numero.format(linha.null_count)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {numero.format(linha.invalid_count)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {numero.format(linha.minimum)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {numero.format(linha.maximum)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {numero.format(linha.total)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {numero.format(linha.mean)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Disclosure
            className="desdobra"
            gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}
          >
            <MapaDeProcedencia
              bloco={{ tipo: "cruzamento_numerico", dado: cruzamento }}
              denominador={denominador}
            />
          </Disclosure>
        </article>
      ))}
    </div>
  );
}

export function SeriesDeMedida({
  flags,
  numericas,
  denominador,
}: {
  readonly flags: readonly SerieComFlag[];
  readonly numericas: readonly SerieNumerica[];
  readonly denominador: number;
}) {
  const { t, language } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const numero = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
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
  return (
    <div className="space-y-4">
      {flags.map((serie) => (
        <article
          key={`${serie.dimension_id}:${serie.measure_id}`}
          className="bloco-med"
        >
          <CabecalhoDoBloco
            dimensionId={serie.dimension_id}
            measureId={serie.measure_id}
            suprimido={
              serie.suppression_applied || serie.temporal_series_suppressed
            }
          />
          <Metodo id={serie.method_id} versao={serie.method_version} />
          <p className="mb-2 text-xs text-muted-foreground">
            {serie.effective_granularity} · {serie.timezone}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("canonicalAnalysis.analyticsView.seriesCounts", {
              valid: String(serie.value_count),
              nulls: String(serie.null_count),
              invalid: String(serie.invalid_count),
              undated: String(serie.undated_count),
            })}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left">
                    {t("canonicalAnalysis.analyticsView.window")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.status")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.true")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.false")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.nulls")}
                  </th>
                  <th className="py-2 text-right">
                    {t("canonicalAnalysis.analyticsView.trueRate")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {serie.windows.map((janela) => (
                  <tr
                    key={janela.window_start}
                    className="border-b border-border/40"
                  >
                    <th scope="row" className="py-2 text-left font-normal">
                      {formatarJanela(janela.window_start)}
                    </th>
                    <td className="px-2 text-right">{janela.status}</td>
                    <td className="px-2 text-right tabular-nums">
                      {janela.true_count}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {janela.false_count}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {janela.null_count}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      <TaxaPublicada valor={janela.true_rate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Disclosure
            className="desdobra"
            gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}
          >
            <MapaDeProcedencia
              bloco={{ tipo: "serie_flag", dado: serie }}
              denominador={denominador}
            />
          </Disclosure>
        </article>
      ))}
      {numericas.map((serie) => (
        <article
          key={`${serie.dimension_id}:${serie.measure_id}`}
          className="bloco-med"
        >
          <CabecalhoDoBloco
            dimensionId={serie.dimension_id}
            measureId={serie.measure_id}
            suprimido={
              serie.suppression_applied || serie.temporal_series_suppressed
            }
          />
          <Metodo id={serie.method_id} versao={serie.method_version} />
          <p className="mb-2 text-xs text-muted-foreground">
            {serie.effective_granularity} · {serie.timezone} · {serie.unit} ·{" "}
            {serie.semantic_role}
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("canonicalAnalysis.analyticsView.seriesCounts", {
              valid: String(serie.value_count),
              nulls: String(serie.null_count),
              invalid: String(serie.invalid_count),
              undated: String(serie.undated_count),
            })}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left">
                    {t("canonicalAnalysis.analyticsView.window")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.status")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.valid")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.nulls")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.invalid")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.minimum")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.maximum")}
                  </th>
                  <th className="px-2 text-right">
                    {t("canonicalAnalysis.analyticsView.totalStat")}
                  </th>
                  <th className="py-2 text-right">
                    {t("canonicalAnalysis.analyticsView.mean")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {serie.windows.map((janela) => (
                  <tr
                    key={janela.window_start}
                    className="border-b border-border/40"
                  >
                    <th scope="row" className="py-2 text-left font-normal">
                      {formatarJanela(janela.window_start)}
                    </th>
                    <td className="px-2 text-right">{janela.status}</td>
                    <td className="px-2 text-right tabular-nums">
                      {numero.format(janela.count)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {numero.format(janela.null_count)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {numero.format(janela.invalid_count)}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {janela.minimum !== null
                        ? numero.format(janela.minimum)
                        : t("canonicalAnalysis.analyticsView.notPublished")}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {janela.maximum !== null
                        ? numero.format(janela.maximum)
                        : t("canonicalAnalysis.analyticsView.notPublished")}
                    </td>
                    <td className="px-2 text-right tabular-nums">
                      {janela.total !== null
                        ? numero.format(janela.total)
                        : t("canonicalAnalysis.analyticsView.notPublished")}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {janela.mean !== null
                        ? numero.format(janela.mean)
                        : t("canonicalAnalysis.analyticsView.notPublished")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Disclosure
            className="desdobra"
            gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}
          >
            <MapaDeProcedencia
              bloco={{ tipo: "serie_numerica", dado: serie }}
              denominador={denominador}
            />
          </Disclosure>
        </article>
      ))}
    </div>
  );
}
