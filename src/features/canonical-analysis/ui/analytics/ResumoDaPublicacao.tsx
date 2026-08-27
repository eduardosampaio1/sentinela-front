import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalysisIntake } from "@/lib/v1";
import type { SnapshotAnalitico } from "../../result/analyticsProjection";
import { MapaDoDenominador } from "./MapaDoDenominador";

function StatusDaFamilia({
  rotulo,
  quantidade,
  explicacao,
}: {
  readonly rotulo: string;
  readonly quantidade: number;
  readonly explicacao: string;
}) {
  const { t, language } = useLanguage();
  const numero = new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US");
  const publicado = quantidade > 0;

  return (
    <li className={publicado ? "tem" : "vazio"}>
      <span className="qtd tabular-nums">{numero.format(quantidade)}</span>
      <span className="fam">{rotulo}</span>
      <span className="estado">
        {publicado
          ? t("canonicalAnalysis.analyticsView.published")
          : t("canonicalAnalysis.analyticsView.notConfigured")}
      </span>
      <span className="explica">{explicacao}</span>
    </li>
  );
}

export function ResumoDaPublicacao({
  snapshot,
  intake,
}: {
  readonly snapshot: SnapshotAnalitico;
  readonly intake: AnalysisIntake | null | undefined;
}) {
  const { t } = useLanguage();

  const familias = [
    {
      chave: "conversations",
      quantidade: snapshot.record_count,
    },
    {
      chave: "numeric",
      quantidade: snapshot.numeric.length,
    },
    {
      chave: "distributions",
      quantidade: snapshot.distributions.length,
    },
    {
      chave: "dimensions",
      quantidade: snapshot.dimensions.length,
    },
    {
      chave: "concentrations",
      quantidade: snapshot.concentrations.length,
    },
    {
      chave: "series",
      quantidade: snapshot.time_series.length,
    },
  ] as const;

  return (
    <section data-revelar aria-labelledby="anl-resumo" className="painel reg resumo-pub">
      <header>
        <h2 id="anl-resumo">{t("canonicalAnalysis.analyticsView.summaryTitle")}</h2>
        <p>{t("canonicalAnalysis.analyticsView.summaryBody")}</p>
      </header>

      <div className="corpo">
        <ol className="familias" aria-label={t("canonicalAnalysis.analyticsView.summaryFamilies")}>
          {familias.map((familia) => (
            <StatusDaFamilia
              key={familia.chave}
              rotulo={t(`canonicalAnalysis.analyticsView.summary.${familia.chave}.label`)}
              quantidade={familia.quantidade}
              explicacao={t(
                `canonicalAnalysis.analyticsView.summary.${familia.chave}.${
                  familia.quantidade > 0 ? "ready" : "empty"
                }`,
              )}
            />
          ))}
        </ol>

        <div className="traco" aria-labelledby="anl-resumo-traco">
          <h3 id="anl-resumo-traco">{t("canonicalAnalysis.analyticsView.traceTitle")}</h3>
          <MapaDoDenominador snapshot={snapshot} intake={intake} />
        </div>
      </div>
    </section>
  );
}
