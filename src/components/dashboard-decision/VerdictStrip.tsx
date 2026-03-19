import type { VerdictStripModel } from "@/lib/decisionLayerModel";

interface VerdictStripProps {
  model: VerdictStripModel;
}

function verdictClass(verdict: VerdictStripModel["verdict"]) {
  if (verdict === "Critical") return "border-red-500/25 bg-red-500/10 text-red-200";
  if (verdict === "Degraded") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  if (verdict === "Watch") return "border-sky-500/25 bg-sky-500/10 text-sky-200";
  return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
}

function certaintyClass(certainty: VerdictStripModel["certainty"]) {
  if (certainty === "low") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (certainty === "unknown") return "border-border/70 bg-muted/50 text-muted-foreground";
  if (certainty === "medium") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

export default function VerdictStrip({ model }: VerdictStripProps) {
  return (
    <section className="rounded-xl border border-border/45 bg-card/45 px-3 py-2 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] ${verdictClass(model.verdict)}`}
          >
            {model.verdict}
          </span>
          <p className="truncate text-xs text-muted-foreground sm:text-[0.82rem]">{model.message}</p>
        </div>

        <div className="flex items-center gap-2">
          {model.escalated ? (
            <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] text-red-200">
              Escalated
            </span>
          ) : null}
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] tracking-[0.05em] ${certaintyClass(model.certainty)}`}
          >
            {model.certaintyLabel}
          </span>
        </div>
      </div>
    </section>
  );
}
