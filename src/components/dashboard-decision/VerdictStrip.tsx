import { AlertTriangle, ShieldCheck, Siren, Sparkles } from "lucide-react";
import type { VerdictStripModel } from "@/lib/decisionLayerModel";

interface VerdictStripProps {
  model: VerdictStripModel;
}

function verdictClass(verdict: VerdictStripModel["verdict"]) {
  if (verdict === "Critical") return "border-red-500/25 bg-red-500/12 text-red-200";
  if (verdict === "Degraded") return "border-amber-500/25 bg-amber-500/12 text-amber-200";
  if (verdict === "Watch") return "border-sky-500/25 bg-sky-500/12 text-sky-200";
  return "border-emerald-500/25 bg-emerald-500/12 text-emerald-200";
}

function certaintyClass(certainty: VerdictStripModel["certainty"]) {
  if (certainty === "low") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (certainty === "unknown") return "border-border/70 bg-background/35 text-muted-foreground";
  if (certainty === "medium") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function certaintyHelper(certainty: VerdictStripModel["certainty"]) {
  if (certainty === "high") return "High confidence means the current readout is strongly supported by available engine signals.";
  if (certainty === "medium") return "Medium confidence means directionally useful, but not fully conclusive.";
  if (certainty === "low") return "Low confidence means act carefully and validate with deeper evidence before major decisions.";
  return "Confidence is unknown because the engine did not provide a stable certainty signal for this run.";
}

function verdictIcon(verdict: VerdictStripModel["verdict"]) {
  if (verdict === "Critical") return <Siren className="h-5 w-5" />;
  if (verdict === "Healthy") return <ShieldCheck className="h-5 w-5" />;
  if (verdict === "Degraded") return <AlertTriangle className="h-5 w-5" />;
  return <Sparkles className="h-5 w-5" />;
}

export default function VerdictStrip({ model }: VerdictStripProps) {
  return (
    <section className="rounded-[24px] border border-border/45 bg-card/45 p-4 backdrop-blur-md sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-primary/20 bg-primary/10 text-primary shadow-[0_20px_48px_-32px_rgba(34,211,238,0.95)]">
            {verdictIcon(model.verdict)}
          </span>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Executive verdict</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] ${verdictClass(model.verdict)}`}
              >
                {model.verdict}
              </span>
              {model.escalated ? (
                <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-red-200">
                  Escalated
                </span>
              ) : null}
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{model.message}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
          <article className="rounded-[20px] border border-border/55 bg-background/35 p-3.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Confidence</p>
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${certaintyClass(model.certainty)}`}>
              {model.certaintyLabel}
            </span>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{certaintyHelper(model.certainty)}</p>
          </article>

          <article className="rounded-[20px] border border-border/55 bg-background/35 p-3.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Decision posture</p>
            <p className="mt-3 text-sm leading-6 text-foreground">
              {model.escalated
                ? "Escalate this run before scaling traffic or assuming the system is stable."
                : "Stay in control, verify the recommendation, and move only after checking the evidence."}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
