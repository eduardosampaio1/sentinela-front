import { useLanguage } from "@/contexts/LanguageContext";
import type { CostScenario, EconomicsView } from "../../data/economics";

function ScenarioTable({ rows }: { readonly rows: readonly CostScenario[] }) {
  const { language, t } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t("canonicalAnalysis.review.economicsProvider")}</th>
            <th className="px-4 py-3">{t("canonicalAnalysis.review.economicsModel")}</th>
            <th className="px-4 py-3 text-right">{t("canonicalAnalysis.review.economicsDataset")}</th>
            <th className="px-4 py-3">{t("canonicalAnalysis.review.economicsStatusLabel")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row) => (
            <tr className="border-t border-border" key={row.route_id}>
              <td className="px-4 py-3">{row.provider ?? "—"}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.model_id ?? row.route_id}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">
                {row.total_cost == null
                  ? "—"
                  : new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: row.currency ?? "USD",
                      maximumFractionDigits: 4,
                    }).format(row.total_cost)}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {t(`canonicalAnalysis.review.economicsStatus.${row.status}`)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EconomicsSnapshot({ economics }: { readonly economics: EconomicsView }) {
  const { language, t } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const model = economics.current_model;
  const comparison = economics.current_model_comparison;
  return (
    <>
      <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
        {model?.status === "unknown"
          ? t("canonicalAnalysis.review.economicsUnknownModel")
          : t("canonicalAnalysis.review.economicsKnownModel")}
      </p>
      {model && model.status !== "unknown" ? (
        <div className="mb-5 grid gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {t("canonicalAnalysis.review.economicsCurrent")}
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {[model.provider, model.model_id].filter(Boolean).join(" / ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(`canonicalAnalysis.review.economicsIdentity.${model.status}`)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-muted-foreground">
              {comparison
                ? t(`canonicalAnalysis.review.economicsStatus.${comparison.status}`)
                : t("canonicalAnalysis.review.economicsRouteMissing")}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
              {comparison?.total_cost == null
                ? "—"
                : new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: comparison.currency ?? "USD",
                    maximumFractionDigits: 4,
                  }).format(comparison.total_cost)}
            </p>
          </div>
        </div>
      ) : null}
      <ScenarioTable rows={economics.inference_comparisons} />
      {economics.embedding_comparisons.length > 0 ? (
        <details className="mt-4 rounded-xl border border-border p-4">
          <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t("canonicalAnalysis.review.embeddingScenarios")}
          </summary>
          <div className="mt-4"><ScenarioTable rows={economics.embedding_comparisons} /></div>
        </details>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {t("canonicalAnalysis.review.economicsDisclaimer")}
      </p>
    </>
  );
}
