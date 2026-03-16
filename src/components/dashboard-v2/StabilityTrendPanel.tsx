import type { StabilityTrendModel } from "@/lib/dashboardModel";
import { formatPercent } from "@/lib/dashboardModel";

interface StabilityTrendPanelProps {
  model: StabilityTrendModel;
}

function trendClass(value: StabilityTrendModel["trend"]) {
  if (value === "Regressing") return "text-red-300";
  if (value === "Improving") return "text-emerald-300";
  return "text-muted-foreground";
}

function metricTrendClass(value: StabilityTrendModel["metrics"][number]["trend"]) {
  if (value === "Regressing") return "text-red-300";
  if (value === "Improving") return "text-emerald-300";
  return "text-muted-foreground";
}

export default function StabilityTrendPanel({ model }: StabilityTrendPanelProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Stability Trend</h2>
          <p className="text-sm text-muted-foreground">
            Historical comparison of behavioral stability and interaction quality.
          </p>
        </div>
        <p className={`text-sm font-medium ${trendClass(model.trend)}`}>Trend: {model.trend}</p>
      </div>

      {model.regressionDetected ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Regression Detected
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {model.metrics.map((metric) => (
          <article key={metric.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatPercent(metric.current)}</p>
            <p className={`mt-1 text-xs font-medium ${metricTrendClass(metric.trend)}`}>{metric.trend}</p>
          </article>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {model.summary}{" "}
        {model.baselineAvailable ? "Baseline deltas were available." : "No baseline run linked for this analysis."}
      </p>
    </section>
  );
}
