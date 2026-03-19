import { Activity } from "lucide-react";
import type { InteractionPanelModel } from "@/lib/dashboardModel";
import { formatPercent } from "@/lib/dashboardModel";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface InteractionAnalysisPanelProps {
  model: InteractionPanelModel;
}

function metricClass(preferred: "higher_better" | "lower_better", value: number | null) {
  if (value === null) return "border-border/60 bg-background/25";
  const normalized = preferred === "higher_better" ? value : 100 - value;
  if (normalized >= 70) return "border-emerald-500/25 bg-emerald-500/10";
  if (normalized >= 45) return "border-amber-500/25 bg-amber-500/10";
  return "border-red-500/25 bg-red-500/10";
}

export default function InteractionAnalysisPanel({ model }: InteractionAnalysisPanelProps) {
  const samplingActive = model.mode === "sampled";

  return (
    <AccordionPanel
      title="Intent Analysis"
      icon={<Activity className="h-4 w-4" />}
      badge={
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] ${
            samplingActive
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {samplingActive ? "Sampled" : "Full"}
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-4 text-sm text-muted-foreground">{model.explanation}</p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {model.metrics.map((metric) => (
          <article
            key={metric.id}
            className={`rounded-xl border p-3 ${metricClass(metric.preferred, metric.value)} ${metric.value === null ? "opacity-70 saturate-75" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
              {metric.value === null ? <MissingDataBadge /> : null}
            </div>
            <p className="mt-1 text-xl font-semibold text-foreground">{formatPercent(metric.value)}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-background/30 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Sample Size</p>
          <p className="text-sm text-foreground">{model.sampleSize.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/30 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Population Size</p>
          <p className="text-sm text-foreground">{model.populationSize.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/30 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Confidence</p>
          <div className={`flex items-center justify-between gap-2 ${model.confidence === null ? "opacity-70" : ""}`}>
            <p className="text-sm text-foreground">{formatPercent(model.confidence)}</p>
            {model.confidence === null ? <MissingDataBadge /> : null}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/30 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Pseudo-Intent Mode</p>
          <p className="text-sm text-foreground">
            {model.pseudoIntentMode === "explicit" ? "Explicit labels" : "Inferred clusters"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border/50 bg-background/25 px-3 py-2 text-xs text-muted-foreground">
        Inference method: <span className="text-foreground">{model.pseudoIntentMethod}</span>
        {model.pseudoIntentConfidence !== null ? (
          <>
            {" "}
            | Confidence: <span className="text-foreground">{formatPercent(model.pseudoIntentConfidence)}</span>
          </>
        ) : (
          <>
            {" "}
            <MissingDataBadge />
          </>
        )}
      </div>

      {model.pseudoIntentLimitations.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {model.pseudoIntentLimitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </AccordionPanel>
  );
}

