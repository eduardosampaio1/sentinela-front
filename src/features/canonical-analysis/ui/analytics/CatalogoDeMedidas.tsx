import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Disclosure } from "@/design/primitives";
import type { DefinicaoDeMedida } from "../../result/analyticsProjection";

const GRUPOS = ["volume", "operational_efficiency", "detected_quality", "custom"] as const;
const OBJETIVOS = ["all", "operation", "journey", "risk", "quality"] as const;
type Objetivo = (typeof OBJETIVOS)[number];

function pertenceAoObjetivo(m: DefinicaoDeMedida, objetivo: Objetivo) {
  if (objetivo === "all") return true;
  if (objetivo === "operation") return ["volume", "efficiency", "operations", "estimates"].includes(m.metric_group);
  if (objetivo === "journey") return ["volume", "outcome"].includes(m.metric_group);
  if (objetivo === "risk") return m.metric_group === "safety";
  return m.metric_group === "quality";
}

export function CatalogoDeMedidas({ medidas }: { readonly medidas: readonly DefinicaoDeMedida[] }) {
  const { t, language } = useLanguage();
  // É um filtro desta sessão, não uma "visão salva". Persistência auditável pertence ao
  // Playground futuro; gravar no navegador faria a UI possuir uma preferência sem contrato.
  const [objetivo, setObjetivo] = useState<Objetivo>("all");
  if (medidas.length === 0) return null;
  const percentual = new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          {t("canonicalAnalysis.analyticsView.catalog.savedViews")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t("canonicalAnalysis.analyticsView.catalog.savedViews")}>
          {OBJETIVOS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={objetivo === item}
              className="rounded-full border border-border px-3 py-1.5 text-xs aria-pressed:bg-foreground aria-pressed:text-background"
              onClick={() => {
                setObjetivo(item);
              }}
            >
              {t(`canonicalAnalysis.analyticsView.catalog.goals.${item}`)}
            </button>
          ))}
        </div>
      </div>
      {GRUPOS.map((grupo) => {
        const itens = medidas.filter((m) => m.presentation_group === grupo && pertenceAoObjetivo(m, objetivo));
        if (itens.length === 0) return null;
        return (
          <section key={grupo} aria-labelledby={`catalog-${grupo}`}>
            <h3 id={`catalog-${grupo}`} className="text-sm font-semibold">
              {t(`canonicalAnalysis.analyticsView.catalog.groups.${grupo}`)}
            </h3>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {itens.map((m) => (
                <li key={m.measure_id} className="min-w-0 rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="break-words font-mono text-sm">{m.measure_id}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {t(`canonicalAnalysis.analyticsView.catalog.availability.${m.availability}`)}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">{t("canonicalAnalysis.analyticsView.catalog.coverage")}</dt>
                      <dd className="tabular-nums">{m.coverage === null ? "—" : percentual.format(m.coverage)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("canonicalAnalysis.analyticsView.catalog.population")}</dt>
                      <dd className="tabular-nums">{m.eligible_count} / {m.denominator}</dd>
                    </div>
                  </dl>
                  <Disclosure className="mt-3" gatilho={t("canonicalAnalysis.analyticsView.catalog.technical")}> 
                    <dl className="grid gap-1 break-words text-xs">
                      <div><dt className="inline text-muted-foreground">{t("canonicalAnalysis.analyticsView.catalog.origin")}: </dt><dd className="inline">{t(`canonicalAnalysis.analyticsView.catalog.origins.${m.catalog_origin}`)}</dd></div>
                      <div><dt className="inline text-muted-foreground">{t("canonicalAnalysis.analyticsView.catalog.direction")}: </dt><dd className="inline">{t(`canonicalAnalysis.analyticsView.catalog.directions.${m.quality_direction}`)}</dd></div>
                      <div><dt className="inline text-muted-foreground">{t("canonicalAnalysis.analyticsView.catalog.version")}: </dt><dd className="inline font-mono">{m.metric_catalog_version ?? "—"}</dd></div>
                      <div><dt className="inline text-muted-foreground">{t("canonicalAnalysis.analyticsView.catalog.detector")}: </dt><dd className="inline font-mono">{m.detector_id ?? "—"}</dd></div>
                      <div><dt className="inline text-muted-foreground">{t("canonicalAnalysis.analyticsView.catalog.owner")}: </dt><dd className="inline">{m.detector_owner ?? "—"}</dd></div>
                      <div><dt className="inline text-muted-foreground">{t("canonicalAnalysis.analyticsView.catalog.detectorVersion")}: </dt><dd className="inline">{m.detector_contract_version ?? "—"}</dd></div>
                    </dl>
                  </Disclosure>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
