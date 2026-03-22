import { AlertTriangle } from "lucide-react";
import type { ProblemItem } from "@/lib/dashboardModel";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface ProblemsPanelProps {
  items: ProblemItem[];
}

function severityClass(severity: ProblemItem["severity"]) {
  if (severity === "critical") return "border-red-500/35 bg-red-500/10 text-red-200";
  if (severity === "high") return "border-amber-500/35 bg-amber-500/10 text-amber-200";
  if (severity === "medium") return "border-sky-500/35 bg-sky-500/10 text-sky-200";
  return "border-emerald-500/35 bg-emerald-500/10 text-emerald-200";
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
      title="Detected problems"
      icon={<AlertTriangle className="h-4 w-4" />}
      badge={
        <div className="flex items-center gap-1.5">
          {hasCritical ? (
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-200">
              {criticalCount} critical
            </span>
          ) : null}
          <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
            {items.length} issues
          </span>
        </div>
      }
      defaultOpen={hasCritical}
    >
      <p className="mb-4 text-sm leading-6 text-muted-foreground">
        Highest-impact issues detected in the current analysis run.
      </p>

      {items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border/60 bg-background/20 px-4 py-8 text-sm text-muted-foreground">
          No critical problems detected in the current result.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <article key={item.id} className="rounded-[24px] border border-border/55 bg-background/35 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/50 bg-background/30 text-sm font-semibold text-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.impact}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${severityClass(item.severity)}`}>
                  {severityLabel(item.severity)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/45 bg-background/30 px-3 py-1.5">
                  Affected {item.affectedInteractions}
                </span>
                {item.evidence ? (
                  <span className="rounded-full border border-border/45 bg-background/30 px-3 py-1.5">
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
