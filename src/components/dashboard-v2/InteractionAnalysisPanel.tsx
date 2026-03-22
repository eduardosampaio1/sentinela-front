import { Activity } from "lucide-react";
import type { InteractionPanelModel } from "@/lib/dashboardModel";
import { formatPercent } from "@/lib/dashboardModel";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface InteractionAnalysisPanelProps {
  model: InteractionPanelModel;
}

function metricClass(preferred: "higher_better" | "lower_better", value: number | null) {
  if (value === null) return "border-border/55 bg-background/25";
  const normalized = preferred === "higher_better" ? value : 100 - value;
  if (normalized >= 70) return "border-emerald-500/25 bg-emerald-500/10";
  if (normalized >= 45) return "border-amber-500/25 bg-amber-500/10";
  return "border-red-500/25 bg-red-500/10";
}

export default function InteractionAnalysisPanel({ model }: InteractionAnalysisPanelProps) {
  const samplingActive = model.mode === "sampled";

  return (
    <AccordionPanel
      title="Intent analysis"
      icon={<Activity className="h-4 w-4" />}
      badge={
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
            samplingActive
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {samplingActive ? "Sampled mode" : "Full mode"}
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">{model.explanation}</p>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {model.metrics.map((metric) => (
            <article
              key={metric.id}
              className={`rounded-[22px] border p-4 ${metricClass(metric.preferred, metric.value)} ${metric.value === null ? "opacity-75 saturate-75" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{metric.label}</p>
                {metric.value === null ? <MissingDataBadge /> : null}
              </div>
              <p className="mt-4 font-display text-[2rem] font-semibold tracking-tight text-foreground">
                {formatPercent(metric.value)}
              </p>
            </article>
          ))}
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-border/55 bg-background/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sample size</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{model.sampleSize.toLocaleString()}</p>
            </div>
            <div className="rounded-[22px] border border-border/55 bg-background/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Population size</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{model.populationSize.toLocaleString()}</p>
            </div>
            <div className="rounded-[22px] border border-border/55 bg-background/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Confidence</p>
              <div className={`mt-3 flex items-center justify-between gap-2 ${model.confidence === null ? "opacity-75" : ""}`}>
                <p className="text-lg font-semibold text-foreground">{formatPercent(model.confidence)}</p>
                {model.confidence === null ? <MissingDataBadge /> : null}
              </div>
            </div>
            <div className="rounded-[22px] border border-border/55 bg-background/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Pseudo-intent mode</p>
              <p className="mt-3 text-lg font-semibold text-foreground">
                {model.pseudoIntentMode === "explicit" ? "Explicit labels" : "Inferred clusters"}
              </p>
            </div>
          </div>

          <div className="rounded-[22px] border border-border/55 bg-background/30 p-4">
            <p className="dashboard-kicker">Inference method</p>
            <p className="mt-3 text-sm leading-6 text-foreground">{model.pseudoIntentMethod}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Confidence{" "}
              {model.pseudoIntentConfidence !== null ? (
                <span className="text-foreground">{formatPercent(model.pseudoIntentConfidence)}</span>
              ) : (
                <MissingDataBadge />
              )}
            </p>
          </div>

          {model.pseudoIntentLimitations.length > 0 ? (
            <div className="rounded-[22px] border border-border/55 bg-background/30 p-4">
              <p className="dashboard-kicker">Limitations</p>
              <div className="mt-3 space-y-2">
                {model.pseudoIntentLimitations.map((item) => (
                  <p key={item} className="text-sm leading-6 text-muted-foreground">
                    - {item}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AccordionPanel>
  );
}
