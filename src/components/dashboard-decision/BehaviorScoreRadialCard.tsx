import type { CoreMetricCardModel } from "@/lib/decisionLayerModel";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";

interface BehaviorScoreRadialCardProps {
  behaviorMetric: CoreMetricCardModel | null;
  driftMetric: CoreMetricCardModel | null;
  costMetric: CoreMetricCardModel | null;
}

const BEHAVIOR_TARGET = 70;

function statusLabel(metric: CoreMetricCardModel | null) {
  if (!metric || metric.missing) return "UNKNOWN";
  if (metric.tone === "risk") return "POOR";
  if (metric.tone === "watch") return "WATCH";
  if (metric.tone === "safe") return "GOOD";
  return "UNKNOWN";
}

function statusClass(metric: CoreMetricCardModel | null) {
  if (!metric || metric.missing) return "border-border/50 bg-muted/20 text-muted-foreground";
  if (metric.tone === "risk") return "border-red-500/35 bg-red-500/10 text-red-300";
  if (metric.tone === "watch") return "border-amber-500/35 bg-amber-500/10 text-amber-300";
  if (metric.tone === "safe") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
  return "border-border/50 bg-muted/20 text-muted-foreground";
}

function ringColor(metric: CoreMetricCardModel | null) {
  if (!metric || metric.missing) return "hsl(var(--muted-foreground))";
  if (metric.tone === "risk") return "rgb(252 165 165)";
  if (metric.tone === "watch") return "rgb(252 211 77)";
  if (metric.tone === "safe") return "rgb(110 231 183)";
  return "hsl(var(--primary))";
}

function percentageValue(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function formatDeltaVsTarget(value: number | null) {
  if (value === null || Number.isNaN(value)) return "Not provided by engine";
  const delta = value - BEHAVIOR_TARGET;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function chipValue(metric: CoreMetricCardModel | null, kind: "percent" | "cost") {
  if (!metric || metric.missing) return "Not provided by engine";
  if (kind === "cost") {
    return metric.displayValue;
  }
  return metric.value === null ? "Not provided by engine" : `${metric.value.toFixed(1)}%`;
}

export default function BehaviorScoreRadialCard({
  behaviorMetric,
  driftMetric,
  costMetric,
}: BehaviorScoreRadialCardProps) {
  const normalized = percentageValue(behaviorMetric?.value ?? null);
  const radius = 46;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progressOffset =
    normalized === null ? circumference : circumference - (normalized / 100) * circumference;

  return (
    <article className="rounded-[20px] border border-primary/30 bg-[linear-gradient(140deg,rgba(13,20,37,0.9),rgba(12,24,42,0.72))] p-4 shadow-[0_24px_56px_-38px_rgba(6,182,212,0.7)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.03em] text-muted-foreground">Behavior Score</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] ${statusClass(behaviorMetric)}`}>
              {statusLabel(behaviorMetric)}
            </span>
            {behaviorMetric?.missing ? <MissingDataBadge label={behaviorMetric.missingLabel} /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Delta vs target:{" "}
            <span className="font-medium text-foreground">{formatDeltaVsTarget(behaviorMetric?.value ?? null)}</span>
          </p>
        </div>

        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="hsl(var(--border) / 0.5)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={ringColor(behaviorMetric)}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              style={{ transition: "stroke-dashoffset 420ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[1.55rem] font-semibold leading-none text-foreground">
              {behaviorMetric?.missing || normalized === null ? "N/A" : Math.round(normalized)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">/100</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <span className="rounded-md border border-border/50 bg-background/25 px-2.5 py-1.5 text-xs text-muted-foreground">
          Consistency: <span className="text-foreground">{chipValue(behaviorMetric, "percent")}</span>
        </span>
        <span className="rounded-md border border-border/50 bg-background/25 px-2.5 py-1.5 text-xs text-muted-foreground">
          Separation: <span className="text-foreground">{chipValue(driftMetric, "percent")}</span>
        </span>
        <span className="rounded-md border border-border/50 bg-background/25 px-2.5 py-1.5 text-xs text-muted-foreground">
          Efficiency: <span className="text-foreground">{chipValue(costMetric, "cost")}</span>
        </span>
      </div>
    </article>
  );
}

