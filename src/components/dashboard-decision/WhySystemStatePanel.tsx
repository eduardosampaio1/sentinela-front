import { FlaskConical } from "lucide-react";
import type { SystemStatePanelModel } from "@/lib/decisionLayerModel";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface WhySystemStatePanelProps {
  model: SystemStatePanelModel;
}

export default function WhySystemStatePanel({ model }: WhySystemStatePanelProps) {
  const hasActionableRows = model.rows.some((row) => !row.missing);
  const shouldRender = hasActionableRows;
  const rowsToRender = hasActionableRows ? model.rows : [];

  if (!shouldRender) return null;

  return (
    <AccordionPanel
      title="Why the system is in this state"
      icon={<FlaskConical className="h-4 w-4" />}
      badge={
        <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
          {rowsToRender.length}
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-3 text-sm text-muted-foreground">Signal to cause to impact, in operational terms.</p>

      <div className="space-y-3">
        {rowsToRender.map((row) => (
          <article
            key={row.id}
            className={`rounded-xl border border-border/50 bg-background/35 px-3 py-3 ${row.missing ? "opacity-70 saturate-75" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{row.label}</p>
              {row.missing ? <MissingDataBadge /> : null}
            </div>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              <span className="font-medium text-foreground">Cause:</span> {row.cause}
            </p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              <span className="font-medium text-foreground">Impact:</span> {row.impact}
            </p>
          </article>
        ))}
      </div>
    </AccordionPanel>
  );
}
