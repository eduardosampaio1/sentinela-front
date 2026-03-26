import type { AnalysisResult } from "@/lib/api";
import { overviewRows } from "@/lib/dashboardModel";

interface SystemOverviewBlockProps {
  workspaceName?: string | null;
  result: AnalysisResult | null;
}

export default function SystemOverviewBlock({ workspaceName, result }: SystemOverviewBlockProps) {
  const rows = overviewRows(workspaceName, result);

  return (
    <section className="dashboard-panel-muted overflow-hidden p-5">
      <div className="mb-4">
        <p className="dashboard-kicker">Context snapshot</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">System overview</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The current workspace, dataset volume, last analysis timing, and confidence posture.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <article key={row.label} className="rounded-[22px] border border-border/55 bg-background/35 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{row.label}</p>
            <p className="mt-3 text-sm font-medium leading-6 text-foreground">{row.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
