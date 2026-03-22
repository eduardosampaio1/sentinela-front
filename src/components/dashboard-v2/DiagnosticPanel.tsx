import { AlertTriangle } from "lucide-react";
import { formatPercent } from "@/lib/dashboardModel";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface DiagnosticPanelProps {
  title: string;
  subtitle: string;
  items: Array<{ label: string; score: number | null }>;
  emptyText: string;
}

function toneClass(score: number | null) {
  if (score === null) return "border-border/60 bg-background/25";
  if (score >= 70) return "border-red-500/25 bg-red-500/10";
  if (score >= 45) return "border-amber-500/25 bg-amber-500/10";
  return "border-emerald-500/25 bg-emerald-500/10";
}

function summaryLabel(items: Array<{ score: number | null }>) {
  const critical = items.filter((item) => (item.score ?? 0) >= 70).length;
  if (critical > 0) return `${critical} critical`;
  const watch = items.filter((item) => (item.score ?? 0) >= 45).length;
  if (watch > 0) return `${watch} watch`;
  return `${items.length} signals`;
}

export default function DiagnosticPanel({
  title,
  subtitle,
  items,
  emptyText,
}: DiagnosticPanelProps) {
  return (
    <AccordionPanel
      title={title}
      icon={<AlertTriangle className="h-4 w-4" />}
      badge={
        <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
          {summaryLabel(items)}
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-4 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>

      {items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.label} className={`rounded-[22px] border p-4 ${toneClass(item.score)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Diagnostic signal</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{item.label}</p>
                </div>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-4 font-display text-[2rem] font-semibold tracking-tight text-foreground">
                {formatPercent(item.score)}
              </p>
            </article>
          ))}
        </div>
      )}
    </AccordionPanel>
  );
}
