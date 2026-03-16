import type { InteractionPanelModel } from "@/lib/dashboardModel";
import { formatPercent } from "@/lib/dashboardModel";

interface InteractionAnalysisPanelProps {
  model: InteractionPanelModel;
}

function metricClass(preferred: "higher_better" | "lower_better", value: number | null) {
  if (value === null) return "border-border/70 bg-background/40";
  const normalized = preferred === "higher_better" ? value : 100 - value;
  if (normalized >= 70) return "border-emerald-500/30 bg-emerald-500/10";
  if (normalized >= 45) return "border-amber-500/30 bg-amber-500/10";
  return "border-red-500/30 bg-red-500/10";
}

export default function InteractionAnalysisPanel({ model }: InteractionAnalysisPanelProps) {
  const samplingActive = model.mode === "sampled";

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Interaction Analysis</h2>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              samplingActive
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {samplingActive ? "Sampled" : "Full"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{model.explanation}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {model.metrics.map((metric) => (
          <article key={metric.id} className={`rounded-2xl border p-3 ${metricClass(metric.preferred, metric.value)}`}>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{formatPercent(metric.value)}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Sample Size</p>
          <p className="text-sm text-foreground">{model.sampleSize.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Population Size</p>
          <p className="text-sm text-foreground">{model.populationSize.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Confidence</p>
          <p className="text-sm text-foreground">{formatPercent(model.confidence)}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Pseudo-Intent Mode</p>
          <p className="text-sm text-foreground">
            {model.pseudoIntentMode === "explicit" ? "Explicit labels" : "Inferred clusters"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
        Inference method: <span className="text-foreground">{model.pseudoIntentMethod}</span>
        {model.pseudoIntentConfidence !== null ? (
          <>
            {" "}
            · Confidence: <span className="text-foreground">{formatPercent(model.pseudoIntentConfidence)}</span>
          </>
        ) : null}
      </div>

      {model.pseudoIntentLimitations.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {model.pseudoIntentLimitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
