import type { ProblemItem } from "@/lib/dashboardModel";

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
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">Detected Problems</h2>
        <p className="text-sm text-muted-foreground">
          Highest-impact issues detected in this analysis run.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          No critical problems detected in the current result.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${severityClass(item.severity)}`}
                >
                  {severityLabel(item.severity)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.impact}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-border/70 bg-card/70 px-2 py-1">
                  Affected: {item.affectedInteractions}
                </span>
                {item.evidence ? (
                  <span className="rounded-md border border-border/70 bg-card/70 px-2 py-1">
                    {item.evidence}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
