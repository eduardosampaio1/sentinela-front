import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Coins } from "lucide-react";
import type { EconomicsPanelModel } from "@/lib/economicsModel";

interface Props {
  model: EconomicsPanelModel;
}

function toneClass(tone: string) {
  if (tone === "observed") return "border-cyan-500/25 bg-cyan-500/10";
  if (tone === "derived") return "border-blue-500/25 bg-blue-500/10";
  if (tone === "projected") return "border-amber-500/25 bg-amber-500/10";
  return "border-border/45 bg-background/25";
}

function metricToneChip(tone: string) {
  if (tone === "observed") return "Observed";
  if (tone === "derived") return "Derived";
  if (tone === "projected") return "Projected";
  return "Info";
}

export default function EconomicsPanel({ model }: Props) {
  const [open, setOpen] = useState(false);
  const details = useMemo(() => model.details, [model.details]);

  return (
    <section className="dashboard-panel overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="dashboard-kicker">Cost command</span>
            <span className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary">
              Cost per useful outcome first
            </span>
          </div>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">Economics</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Connect the current system state to observed cost, useful outcomes, and projected financial pressure without losing the executive view.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-border/60 bg-background/30 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-primary/20 hover:bg-background/45"
        >
          {open ? "Hide detail deck" : "Open detail deck"}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {model.hero.map((metric, index) => (
          <article key={metric.id} className="dashboard-panel-muted overflow-hidden p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {index + 1}. {metric.label}
                </p>
                <p className="mt-3 font-display text-[2.4rem] font-semibold tracking-tight text-foreground">
                  {metric.displayValue}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/55 bg-background/35 text-primary">
                <Coins className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{metric.supportingText}</p>
          </article>
        ))}
      </div>

      {open ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {details.map((metric) => (
              <article key={metric.id} className={`rounded-[24px] border p-4 sm:p-5 ${toneClass(metric.tone)}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{metric.label}</p>
                  <span className="rounded-full border border-border/45 bg-background/30 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {metricToneChip(metric.tone)}
                  </span>
                </div>
                <p className="mt-4 font-display text-[2.1rem] font-semibold tracking-tight text-foreground">
                  {metric.displayValue}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{metric.supportingText}</p>
              </article>
            ))}
          </div>

          <div className="rounded-[26px] border border-border/55 bg-background/30 p-4 sm:p-5">
            <p className="dashboard-kicker">Notes</p>
            <div className="mt-4 space-y-2">
              {model.notes.map((note) => (
                <div key={note} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
