import { AlertTriangle } from "lucide-react";
import type { ProblemItem } from "@/lib/dashboardModel";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface ProblemsPanelProps {
  items: ProblemItem[];
}

function severityWeight(severity: ProblemItem["severity"]) {
  if (severity === "critical") return 100;
  if (severity === "high") return 78;
  if (severity === "medium") return 56;
  return 34;
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

function impactTags(item: ProblemItem) {
  const text = `${item.title} ${item.impact} ${item.evidence ?? ""}`.toLowerCase();
  const tags: string[] = [];

  if (/(risk|policy|guardrail|safety|compliance|critical)/.test(text)) tags.push("Highest risk");
  if (/(waste|cost|token|verbosity|handoff|efficiency)/.test(text)) tags.push("Highest waste");
  if (/(drift|instability|collapse|variance|mutation|retention)/.test(text)) tags.push("Highest instability");
  if (tags.length === 0) tags.push("Operational pressure");

  return tags.slice(0, 2);
}

export default function ProblemsPanel({ items }: ProblemsPanelProps) {
  const criticalCount = items.filter((item) => item.severity === "critical").length;
  const hasCritical = criticalCount > 0;

  return (
    <AccordionPanel
      title="Ranked risk and impact"
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
        Ranked by current severity so the team can scan which intents or behaviors are creating the most immediate risk, waste, or instability.
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/50 bg-background/30 text-sm font-semibold text-foreground">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                        {impactTags(item).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-border/45 bg-background/20 px-2.5 py-1 text-[11px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.impact}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <span>Severity rank</span>
                      <span>{severityLabel(item.severity)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-background/45">
                      <div
                        className={`h-full rounded-full ${item.severity === "critical" ? "bg-red-400" : item.severity === "high" ? "bg-amber-300" : item.severity === "medium" ? "bg-sky-300" : "bg-emerald-300"}`}
                        style={{ width: `${severityWeight(item.severity)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${severityClass(item.severity)}`}>
                    {severityLabel(item.severity)}
                  </span>
                  <span className="rounded-full border border-border/45 bg-background/30 px-3 py-1.5 text-xs text-muted-foreground">
                    Affected {item.affectedInteractions}
                  </span>
                </div>
              </div>

              {item.evidence ? (
                <div className="mt-4 rounded-[18px] border border-border/45 bg-background/25 px-3.5 py-3 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">Evidence:</span> {item.evidence}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </AccordionPanel>
  );
}
