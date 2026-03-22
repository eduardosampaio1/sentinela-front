import type { CoreMetricCardModel } from "@/lib/decisionLayerModel";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";

interface BehaviorScoreRadialCardProps {
  behaviorMetric: CoreMetricCardModel | null;
  driftMetric: CoreMetricCardModel | null;
  costMetric: CoreMetricCardModel | null;
}

const BEHAVIOR_TARGET = 70;

function statusLabel(metric: CoreMetricCardModel | null) {
  if (!metric || metric.missing) return "Unknown";
  if (metric.tone === "risk") return "Under target";
  if (metric.tone === "watch") return "Needs attention";
  if (metric.tone === "safe") return "Operating well";
  return "Unknown";
}

function statusClass(metric: CoreMetricCardModel | null) {
  if (!metric || metric.missing) return "border-border/60 bg-background/30 text-muted-foreground";
  if (metric.tone === "risk") return "border-red-500/30 bg-red-500/12 text-red-200";
  if (metric.tone === "watch") return "border-amber-500/30 bg-amber-500/12 text-amber-200";
  if (metric.tone === "safe") return "border-emerald-500/30 bg-emerald-500/12 text-emerald-200";
  return "border-border/60 bg-background/30 text-muted-foreground";
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
  if (value === null || Number.isNaN(value)) return "Target unavailable";
  const delta = value - BEHAVIOR_TARGET;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} pts vs target`;
}

function chipValue(metric: CoreMetricCardModel | null, kind: "percent" | "cost") {
  if (!metric || metric.missing) return "Not provided";
  if (kind === "cost") return metric.displayValue;
  return metric.value === null ? "Not provided" : `${metric.value.toFixed(1)}%`;
}

export default function BehaviorScoreRadialCard({
  behaviorMetric,
  driftMetric,
  costMetric,
}: BehaviorScoreRadialCardProps) {
  const normalized = percentageValue(behaviorMetric?.value ?? null);
  const radius = 56;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const progressOffset =
    normalized === null ? circumference : circumference - (normalized / 100) * circumference;

  return (
    <article className="dashboard-panel-strong overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-md space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="dashboard-kicker">01 Priority metric</span>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${statusClass(behaviorMetric)}`}>
              {statusLabel(behaviorMetric)}
            </span>
            {behaviorMetric?.missing ? <MissingDataBadge label={behaviorMetric.missingLabel} /> : null}
          </div>

          <div>
            <h3 className="font-display text-[1.9rem] font-semibold tracking-tight text-foreground sm:text-[2.2rem]">
              Behavior Score
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
              This is the leading signal for whether the AI is still delivering useful, stable behavior.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-[20px] border border-border/55 bg-background/35 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Target gap</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatDeltaVsTarget(behaviorMetric?.value ?? null)}</p>
            </article>
            <article className="rounded-[20px] border border-border/55 bg-background/35 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Drift</p>
              <p className="mt-2 text-sm font-medium text-foreground">{chipValue(driftMetric, "percent")}</p>
            </article>
            <article className="rounded-[20px] border border-border/55 bg-background/35 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">CPUO</p>
              <p className="mt-2 text-sm font-medium text-foreground">{chipValue(costMetric, "cost")}</p>
            </article>
          </div>
        </div>

        <div className="dashboard-orb animate-float-drift mx-auto flex h-[200px] w-[200px] items-center justify-center xl:mx-0">
          <svg className="h-[200px] w-[200px] -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="hsl(var(--border) / 0.45)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx="80"
              cy="80"
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
            <p className="font-display text-[3.1rem] font-semibold leading-none text-foreground">
              {behaviorMetric?.missing || normalized === null ? "N/A" : Math.round(normalized)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">out of 100</p>
          </div>
        </div>
      </div>
    </article>
  );
}
