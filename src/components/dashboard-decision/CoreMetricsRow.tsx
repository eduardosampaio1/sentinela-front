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
  if (tone === "risk") return "border-red-500/25 bg-red-500/10 text-red-200";
  if (tone === "watch") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  if (tone === "safe") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  return "border-border/55 bg-background/35 text-muted-foreground";
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
  return metric.displayValue;
}

function priorityLabel(index: number) {
  return `${String(index).padStart(2, "0")} Priority`;
}

export default function CoreMetricsRow({ items }: CoreMetricsRowProps) {
  const behaviorMetric = items.find((item) => item.id === "behavior-score") ?? null;
  const driftMetric = items.find((item) => item.id === "drift") ?? null;
  const costMetric = items.find((item) => item.id === "cost-per-useful-outcome") ?? null;
  const supportMetrics = SUPPORT_METRIC_ORDER
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is CoreMetricCardModel => Boolean(item));

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="dashboard-kicker">Executive scoreboard</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">The five signals that decide the next move</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Read these in order: behavior first, then drift, cost per useful outcome, confidence, and only then the recommended action.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <BehaviorScoreRadialCard
          behaviorMetric={behaviorMetric}
          driftMetric={driftMetric}
          costMetric={costMetric}
        />

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          {supportMetrics.map((item, index) => (
            <article
              key={item.id}
              className={`dashboard-panel-muted overflow-hidden p-4 sm:p-5 ${item.missing ? "opacity-75 saturate-75" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{priorityLabel(index + 2)}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">{item.label}</h3>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${supportToneClass(item.tone)}`}>
                  {compactMainValue(item)}
                </span>
              </div>

              <div className="mt-6 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">Current value</p>
                  <p className="mt-2 font-display text-[2.35rem] font-semibold tracking-tight text-foreground">
                    {item.displayValue}
                  </p>
                </div>
                {item.missing ? <MissingDataBadge label={item.missingLabel} /> : null}
              </div>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {item.missing ? "This signal was not provided by the engine for the current run." : item.operationalNote}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
