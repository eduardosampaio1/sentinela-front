import type { AnalysisResult } from "@/lib/api";
import { overviewRows } from "@/lib/dashboardModel";

interface SystemOverviewBlockProps {
  workspaceName?: string | null;
  result: AnalysisResult | null;
}

export default function SystemOverviewBlock({ workspaceName, result }: SystemOverviewBlockProps) {
  const rows = overviewRows(workspaceName, result);

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">System Overview</h2>
        <p className="text-sm text-muted-foreground">
          High-level status of your current Sentinela workspace.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <article key={row.label} className="rounded-2xl border border-border/70 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{row.label}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{row.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

