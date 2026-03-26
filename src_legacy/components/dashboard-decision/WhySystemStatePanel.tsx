import { FlaskConical } from "lucide-react";
import type { SystemStatePanelModel } from "@/lib/decisionLayerModel";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface WhySystemStatePanelProps {
  model: SystemStatePanelModel;
}

export default function WhySystemStatePanel({ model }: WhySystemStatePanelProps) {
  const rowsToRender = model.rows.filter((row) => !row.missing);

  if (rowsToRender.length === 0) return null;

  return (
    <AccordionPanel
      title="Why the system is in this state"
      icon={<FlaskConical className="h-4 w-4" />}
      badge={
        <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
          {rowsToRender.length} signals
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-4 max-w-2xl text-sm leading-6 text-muted-foreground">
        Trace each signal from cause to operational consequence so the team can explain the decision, not just quote the score.
      </p>

      <div className="space-y-3">
        {rowsToRender.map((row, index) => (
          <article
            key={row.id}
            className={`rounded-[24px] border border-border/55 bg-background/35 p-4 sm:p-5 ${row.missing ? "opacity-70 saturate-75" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/8 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{row.label}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Signal to consequence chain</p>
                </div>
              </div>
              {row.missing ? <MissingDataBadge /> : null}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-[20px] border border-border/45 bg-background/25 p-3.5">
                <p className="dashboard-kicker">Cause</p>
                <p className="mt-3 text-sm leading-6 text-foreground">{row.cause}</p>
              </div>
              <div className="rounded-[20px] border border-border/45 bg-background/25 p-3.5">
                <p className="dashboard-kicker">Impact</p>
                <p className="mt-3 text-sm leading-6 text-foreground">{row.impact}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AccordionPanel>
  );
}
