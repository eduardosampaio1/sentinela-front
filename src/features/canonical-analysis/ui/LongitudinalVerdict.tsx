import type { LongitudinalComparisonView } from "@/lib/v1";
import { useLanguage } from "@/contexts/LanguageContext";

export function LongitudinalVerdict({
  comparison,
}: {
  readonly comparison: LongitudinalComparisonView;
}) {
  const { t } = useLanguage();
  const comparable = comparison.verdict !== "not_comparable";
  const caveatText = (caveat: string) => {
    switch (caveat) {
      case "partial_result":
        return t("canonicalAnalysis.compare.longitudinal.caveat.partial_result");
      case "sample_size_changed_materially":
        return t("canonicalAnalysis.compare.longitudinal.caveat.sample_size_changed_materially");
      case "sample_size_unavailable":
        return t("canonicalAnalysis.compare.longitudinal.caveat.sample_size_unavailable");
      case "dataset_composition_not_provable":
        return t("canonicalAnalysis.compare.longitudinal.caveat.dataset_composition_not_provable");
      case "model_identity_not_available":
        return t("canonicalAnalysis.compare.longitudinal.caveat.model_identity_not_available");
      default:
        return caveat;
    }
  };

  return (
    <section
      aria-labelledby="longitudinal-verdict-title"
      className="space-y-3 rounded-lg border border-border bg-card/50 p-4 sm:p-5"
      data-longitudinal-verdict={comparison.verdict}
    >
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {t("canonicalAnalysis.compare.longitudinal.eyebrow")}
        </p>
        <h2 id="longitudinal-verdict-title" className="text-lg font-semibold text-foreground">
          {comparable
            ? t("canonicalAnalysis.compare.longitudinal.comparableTitle")
            : t("canonicalAnalysis.compare.longitudinal.blockedTitle")}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {comparable
            ? t("canonicalAnalysis.compare.longitudinal.comparableBody")
            : t("canonicalAnalysis.compare.longitudinal.blockedBody")}
        </p>
      </div>

      {comparable ? (
        <p className="text-sm font-medium text-foreground">
          {t("canonicalAnalysis.compare.longitudinal.directionNote")}
        </p>
      ) : null}

      {comparison.caveats.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("canonicalAnalysis.compare.longitudinal.caveatsTitle")}
          </p>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {comparison.caveats.map((caveat) => (
              <li key={caveat} className="rounded-md border border-border/70 px-3 py-2">
                {caveatText(caveat)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
