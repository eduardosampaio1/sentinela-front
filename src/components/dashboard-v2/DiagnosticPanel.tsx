import { AlertTriangle } from "lucide-react";
import { formatPercent } from "@/lib/dashboardModel";

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
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

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
    </section>
  );
}

