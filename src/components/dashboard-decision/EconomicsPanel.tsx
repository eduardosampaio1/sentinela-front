import { Coins } from "lucide-react";
import type { EconomicsPanelModel } from "@/lib/economicsModel";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface Props {
  model: EconomicsPanelModel;
}

interface SummaryMetric {
  id: string;
  label: string;
  value: number | null;
  displayValue: string;
  supportingText: string;
}

function toneClass(tone: string) {
  if (tone === "observed") return "border-cyan-500/30 bg-cyan-500/10";
  if (tone === "derived") return "border-blue-500/30 bg-blue-500/10";
  if (tone === "projected") return "border-amber-500/30 bg-amber-500/10";
  return "border-border/40 bg-card/35";
}

function metricToneChip(tone: string) {
  if (tone === "observed") return "Observed";
  if (tone === "derived") return "Derived";
  if (tone === "projected") return "Projected";
  return "Info";
}

export default function EconomicsPanel({ model }: Props) {
  const cpuoMetric = model.hero.find((metric) => metric.id === "cpuo") ?? null;
  const usefulRateMetric = model.hero.find((metric) => metric.id === "useful-rate") ?? null;
  const observedTotalMetric = model.hero.find((metric) => metric.id === "observed-total-cost") ?? null;
  const wasteMetric = model.details.find((metric) => metric.id === "token-waste-cost") ?? null;
  const summaryMetrics: SummaryMetric[] = [cpuoMetric, usefulRateMetric, wasteMetric].filter(
    (metric): metric is SummaryMetric => Boolean(metric),
  );
  const primaryMetric = cpuoMetric ?? usefulRateMetric ?? wasteMetric ?? model.hero[0] ?? null;

  return (
    <AccordionPanel
      title="Economics"
      icon={<Coins className="h-4 w-4" />}
      badge={
        <div className="flex items-center gap-1.5">
          {primaryMetric ? (
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] text-primary">
              {primaryMetric.displayValue}
            </span>
          ) : null}
          <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
            {model.details.length}
          </span>
        </div>
      }
      defaultOpen={false}
    >
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        This block answers one question: are you buying useful outcomes, or paying for waste?
      </p>

      {model.available ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {summaryMetrics.map((metric, index) => (
              <div key={metric.id} className="rounded-2xl border border-border/40 bg-background/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {index + 1}. {metric.label}
                    </div>
                    <div className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
                      {metric.displayValue}
                    </div>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/45 bg-background/35 text-primary">
                    <Coins className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{metric.supportingText}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-border/40 bg-background/30 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">Spending signal</div>
              <p className="mt-3 text-sm leading-6 text-foreground">
                Cost per useful outcome, useful rate, and waste cost together show whether quality is translating into efficient spend.
              </p>
            </div>

            <div className="rounded-2xl border border-border/40 bg-background/30 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">Observed total cost</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {observedTotalMetric?.displayValue ?? "Unavailable"}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Total observed token plus handoff cost for the analyzed dataset.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {model.details.map((metric) => (
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

          <div className="mt-4 rounded-2xl border border-border/40 bg-background/25 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">Notes</div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {model.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/20 px-4 py-8 text-sm text-muted-foreground">
          No economics signals were available in this analysis run.
        </div>
      )}
    </AccordionPanel>
  );
}
