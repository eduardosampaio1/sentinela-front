import { AlertTriangle } from "lucide-react";
import type { ProblemItem } from "@/lib/dashboardModel";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface ProblemsPanelProps {
  items: ProblemItem[];
}

function severityClass(severity: ProblemItem["severity"]) {
  if (severity === "critical") return "border-red-500/35 bg-red-500/10 text-red-300";
  if (severity === "high") return "border-amber-500/35 bg-amber-500/10 text-amber-300";
  if (severity === "medium") return "border-sky-500/35 bg-sky-500/10 text-sky-300";
  return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
}

function severityLabel(severity: ProblemItem["severity"]) {
  if (severity === "critical") return "Critical";
  if (severity === "high") return "High";
  if (severity === "medium") return "Medium";
  return "Low";
}

export default function ProblemsPanel({ items }: ProblemsPanelProps) {
  const criticalCount = items.filter((item) => item.severity === "critical").length;
  const hasCritical = criticalCount > 0;

  return (
    <AccordionPanel
      title="Detected Problems"
      icon={<AlertTriangle className="h-4 w-4" />}
      badge={
        <div className="flex items-center gap-1.5">
          {hasCritical ? (
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] text-red-200">
              CRITICAL
            </span>
          ) : null}
          <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
            {items.length}
          </span>
        </div>
      }
      defaultOpen={hasCritical}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Highest-impact issues detected in this analysis run.
      </p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/20 px-4 py-8 text-sm text-muted-foreground">
          No critical problems detected in the current result.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-border/50 bg-background/35 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] ${severityClass(item.severity)}`}
                >
                  {severityLabel(item.severity)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-snug text-muted-foreground">{item.impact}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-border/45 bg-background/30 px-2 py-1">
                  Affected: {item.affectedInteractions}
                </span>
                {item.evidence ? (
                  <span className="rounded-md border border-border/45 bg-background/30 px-2 py-1">
                    {item.evidence}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </AccordionPanel>
  );
}
