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
  if (score === null) return "border-border/70 bg-background/40";
  if (score >= 70) return "border-red-500/30 bg-red-500/10";
  if (score >= 45) return "border-amber-500/30 bg-amber-500/10";
  return "border-emerald-500/30 bg-emerald-500/10";
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
        <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
          {items.length}
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-3 text-sm text-muted-foreground">{subtitle}</p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.label} className={`rounded-2xl border p-3 ${toneClass(item.score)}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-foreground">{item.label}</p>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xl font-semibold text-foreground">{formatPercent(item.score)}</p>
            </article>
          ))}
        </div>
      )}
    </AccordionPanel>
  );
}

