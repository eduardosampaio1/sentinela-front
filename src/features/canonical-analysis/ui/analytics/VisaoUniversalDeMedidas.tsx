import { useLanguage } from "@/contexts/LanguageContext";
import { Disclosure } from "@/design/primitives";
import type {
  CatalogoDeExploracao,
  EstadoDeDisponibilidadeAnalitica,
  FamiliaAnalitica,
} from "../../result/analyticsProjection";

const FAMILIAS_UNIVERSAIS = [
  "volume",
  "structure",
  "outcomes",
  "containment",
  "intent_coverage",
  "response_quality",
  "safety_privacy",
  "groundedness",
  "operations",
  "cost_resources",
] as const satisfies readonly FamiliaAnalitica[];

const ESTILO_DO_ESTADO: Record<EstadoDeDisponibilidadeAnalitica, string> = {
  available: "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  partial: "border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  not_measured: "border-border bg-muted text-muted-foreground",
  not_materialized: "border-border bg-muted text-muted-foreground",
  privacy_suppressed: "border-violet-600/30 bg-violet-500/10 text-violet-900 dark:text-violet-200",
  unauthorized: "border-violet-600/30 bg-violet-500/10 text-violet-900 dark:text-violet-200",
  unsupported: "border-border bg-muted text-muted-foreground",
  incompatible: "border-border bg-muted text-muted-foreground",
};

export function VisaoUniversalDeMedidas({
  catalogo,
}: {
  readonly catalogo: CatalogoDeExploracao | null;
}) {
  const { t } = useLanguage();

  if (catalogo === null) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 sm:p-5">
        <p className="font-medium">
          {t("canonicalAnalysis.universal.legacyTitle")}
        </p>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {t("canonicalAnalysis.universal.legacyBody")}
        </p>
      </div>
    );
  }

  const porFamilia = new Map(catalogo.metric_families.map((item) => [item.family_id, item]));

  return (
    <div className="space-y-5">
      <p className="max-w-4xl text-sm text-muted-foreground">
        {t("canonicalAnalysis.universal.subtitle")}
      </p>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {FAMILIAS_UNIVERSAIS.map((familia) => {
          const publicada = porFamilia.get(familia);
          const metricas = publicada?.metric_ids ?? [];
          return (
            <li key={familia} className="min-w-0 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug">
                    {t(`canonicalAnalysis.universal.families.${familia}.title`)}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`canonicalAnalysis.universal.families.${familia}.question`)}
                  </p>
                </div>
                {publicada ? (
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${ESTILO_DO_ESTADO[publicada.availability]}`}
                  >
                    {t(
                      `canonicalAnalysis.universal.availability.${publicada.availability}`,
                    )}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {t("canonicalAnalysis.universal.catalogEntryMissing")}
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm">
                {publicada === undefined
                  ? t("canonicalAnalysis.universal.catalogEntryMissingBody")
                  : metricas.length === 0
                    ? t("canonicalAnalysis.universal.noPublishedMetric")
                    : t(
                        metricas.length === 1
                          ? "canonicalAnalysis.universal.metricCountOne"
                          : "canonicalAnalysis.universal.metricCountMany",
                        {
                          count: metricas.length,
                        },
                      )}
              </p>
              {metricas.length > 0 ? (
                <Disclosure
                  className="mt-3"
                  gatilho={t("canonicalAnalysis.universal.technical")}
                >
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {metricas.map((metrica) => (
                      <li key={metrica} className="break-all font-mono">
                        {metrica}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
