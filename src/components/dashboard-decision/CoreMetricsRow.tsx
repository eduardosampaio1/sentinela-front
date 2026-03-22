import type { CoreMetricCardModel } from "@/lib/decisionLayerModel";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";
import BehaviorScoreRadialCard from "@/components/dashboard-decision/BehaviorScoreRadialCard";

interface CoreMetricsRowProps {
  items: CoreMetricCardModel[];
}

const SUPPORT_METRIC_ORDER: Array<CoreMetricCardModel["id"]> = [
  "drift",
  "cost-per-useful-outcome",
  "confidence",
];

function supportToneClass(tone: CoreMetricCardModel["tone"]) {
  if (tone === "risk") return "text-red-300";
  if (tone === "watch") return "text-amber-300";
  if (tone === "safe") return "text-emerald-300";
  return "text-muted-foreground";
}

function compactMainValue(metric: CoreMetricCardModel) {
  if (metric.missing) return "Not provided by engine";
  if (metric.id === "drift") {
    if (metric.tone === "risk") return "High";
    if (metric.tone === "watch") return "Elevated";
    return "Controlled";
  }
  if (metric.id === "confidence") {
    if (metric.tone === "risk") return "Low";
    if (metric.tone === "watch") return "Moderate";
    return "High";
  }
  if (metric.id === "cost-per-useful-outcome") {
    return metric.displayValue;
  }
  return metric.displayValue;
}

export default function CoreMetricsRow({ items }: CoreMetricsRowProps) {
  const behaviorMetric = items.find((item) => item.id === "behavior-score") ?? null;
  const driftMetric = items.find((item) => item.id === "drift") ?? null;
  const costMetric = items.find((item) => item.id === "cost-per-useful-outcome") ?? null;
  const supportMetrics = SUPPORT_METRIC_ORDER
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is CoreMetricCardModel => Boolean(item));

  return (
    <section className="rounded-[24px] border border-border/50 bg-card/55 p-4 shadow-sm backdrop-blur-md sm:p-5">
      <div className="mb-3">
        <h2 className="text-sm font-medium text-muted-foreground">Core metrics</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-6">
          <BehaviorScoreRadialCard
            behaviorMetric={behaviorMetric}
            driftMetric={driftMetric}
            costMetric={costMetric}
          />
        </div>

        {supportMetrics.map((item) => (
          <article
            key={item.id}
            className={`rounded-[18px] border border-border/50 bg-background/30 p-3.5 md:col-span-2 ${item.missing ? "opacity-70 saturate-75" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              {item.missing ? <MissingDataBadge label={item.missingLabel} /> : null}
            </div>
            <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">{compactMainValue(item)}</p>
            <p className={`mt-1 text-xs leading-snug ${supportToneClass(item.tone)}`}>
              {item.missing ? "Not provided by engine" : item.operationalNote}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
