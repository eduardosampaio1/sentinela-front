import type { StabilityTrendModel } from "@/lib/dashboardModel";
import { formatPercent } from "@/lib/dashboardModel";

interface StabilityTrendPanelProps {
  model: StabilityTrendModel;
}

function trendClass(value: StabilityTrendModel["trend"]) {
  if (value === "Regressing") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (value === "Improving") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return "border-border/55 bg-background/35 text-muted-foreground";
}

function metricTrendClass(value: StabilityTrendModel["metrics"][number]["trend"]) {
  if (value === "Regressing") return "text-red-200";
  if (value === "Improving") return "text-emerald-200";
  return "text-muted-foreground";
}

export default function StabilityTrendPanel({ model }: StabilityTrendPanelProps) {
  return (
    <section className="dashboard-panel-muted overflow-hidden p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-kicker">Trend layer</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">Stability trend</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${trendClass(model.trend)}`}>
            {model.trend}
          </span>
        </div>

        {model.regressionDetected ? (
          <div className="rounded-[22px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Regression detected in the current stability layer.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {model.metrics.map((metric) => (
            <article key={metric.id} className="rounded-[22px] border border-border/55 bg-background/35 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{formatPercent(metric.current)}</p>
              <p className={`mt-2 text-xs font-medium uppercase tracking-[0.16em] ${metricTrendClass(metric.trend)}`}>
                {metric.trend}
              </p>
            </article>
          ))}
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          {model.summary} {model.baselineAvailable ? "Baseline deltas were available." : "No baseline run linked for this analysis."}
        </p>
      </div>
    </section>
  );
}
