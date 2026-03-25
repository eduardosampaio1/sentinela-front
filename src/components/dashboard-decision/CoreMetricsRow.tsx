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

function priorityLabel(index: number) {
  return `${String(index).padStart(2, "0")} Priority`;
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

function helperLabel(metric: CoreMetricCardModel) {
  if (metric.id === "drift") return "How far current behavior is moving away from the expected baseline.";
  if (metric.id === "cost-per-useful-outcome") return "Direct connection between quality and money spent.";
  if (metric.id === "confidence") return "How reliable the current analysis readout is.";
  return metric.operationalNote;
}

export default function CoreMetricsRow({ items }: CoreMetricsRowProps) {
  const behaviorMetric = items.find((item) => item.id === "behavior-score") ?? null;
  const supportMetrics = SUPPORT_METRIC_ORDER
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is CoreMetricCardModel => Boolean(item));

  return (
    <section className="rounded-[24px] border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-md sm:p-5">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Executive scorecard</p>
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">The five signals that decide the next move</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Read these in order: behavior first, then drift, cost per useful outcome, confidence, and only then the recommended action.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.25fr_0.95fr]">
        <div>
          <BehaviorScoreRadialCard behaviorMetric={behaviorMetric} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {supportMetrics.map((item, index) => (
            <article
              key={item.id}
              className={`rounded-[20px] border border-border/50 bg-background/30 p-4 ${item.missing ? "opacity-70 saturate-75" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {priorityLabel(index + 2)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{item.label}</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${supportToneClass(item.tone)}`}
                >
                  {compactMainValue(item)}
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">Current value</p>
                  <p className="mt-2 text-[1.8rem] font-semibold tracking-tight text-foreground">{item.displayValue}</p>
                </div>
                {item.missing ? <MissingDataBadge label={item.missingLabel} /> : null}
              </div>

              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                {item.missing ? "This signal was not provided by the engine for the current run." : helperLabel(item)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
