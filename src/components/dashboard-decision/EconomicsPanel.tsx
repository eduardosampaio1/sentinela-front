import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { EconomicsPanelModel } from "@/lib/economicsModel";

interface Props {
  model: EconomicsPanelModel;
}

function toneClass(tone: string) {
  if (tone === "observed") return "border-cyan-500/30 bg-cyan-500/8";
  if (tone === "derived") return "border-blue-500/30 bg-blue-500/8";
  if (tone === "projected") return "border-amber-500/30 bg-amber-500/8";
  return "border-border/40 bg-card/35";
}

function metricToneChip(tone: string) {
  if (tone === "observed") return "Observed";
  if (tone === "derived") return "Derived";
  if (tone === "projected") return "Projected";
  return "Info";
}

export default function EconomicsPanel({ model }: Props) {
  const [open, setOpen] = useState(true);
  const details = useMemo(() => model.details, [model.details]);

  return (
    <section className="space-y-4 rounded-2xl border border-border/40 bg-card/35 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">Economics</div>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">Economics</h3>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Connect the current system state to observed cost, useful outcomes, and projected financial pressure.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm text-foreground transition hover:bg-muted/30"
        >
          {open ? "Hide details" : "Show details"}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {model.hero.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-border/40 bg-background/40 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {metric.label}
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
              {metric.displayValue}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{metric.supportingText}</p>
          </div>
        ))}
      </div>

      {open ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {details.map((metric) => (
              <div key={metric.id} className={`rounded-2xl border p-5 ${toneClass(metric.tone)}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-semibold text-foreground">{metric.label}</div>
                  <div className="rounded-full border border-border/40 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {metricToneChip(metric.tone)}
                  </div>
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                  {metric.displayValue}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{metric.supportingText}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/25 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">Notes</div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {model.notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </section>
  );
}
