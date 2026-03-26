import type { RiskOverviewModel } from "@/lib/dashboardModel";
import { formatPercent } from "@/lib/dashboardModel";

interface RiskOverviewPanelProps {
  model: RiskOverviewModel;
}

function severityBadgeClass(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "high") {
    return "border-red-500/35 bg-red-500/10 text-red-200";
  }
  if (normalized === "medium") {
    return "border-amber-500/35 bg-amber-500/10 text-amber-200";
  }
  return "border-emerald-500/35 bg-emerald-500/10 text-emerald-200";
}

function trendTone(trend: RiskOverviewModel["trend"]) {
  if (trend === "Regressing") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (trend === "Improving") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return "border-border/55 bg-background/35 text-muted-foreground";
}

export default function RiskOverviewPanel({ model }: RiskOverviewPanelProps) {
  return (
    <section className="dashboard-panel-muted overflow-hidden p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-kicker">Risk posture</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">AI system risk overview</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${trendTone(model.trend)}`}>
            Trend {model.trend}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Risk level</p>
            <p className="mt-3 text-lg font-semibold text-foreground">{model.riskLevel}</p>
          </article>
          <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">AI health score</p>
            <p className="mt-3 text-lg font-semibold text-foreground">{formatPercent(model.aiHealthScore)}</p>
          </article>
          <article className="rounded-[22px] border border-border/55 bg-background/35 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Confidence</p>
            <p className="mt-3 text-lg font-semibold text-foreground">{formatPercent(model.confidence)}</p>
          </article>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Top risks detected</p>
          {model.topRisks.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border/60 bg-background/20 px-4 py-5 text-sm text-muted-foreground">
              No major risks reported in this analysis.
            </div>
          ) : (
            model.topRisks.map((risk) => (
              <article key={risk.id} className="rounded-[22px] border border-border/55 bg-background/35 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${severityBadgeClass(risk.severity)}`}>
                    {risk.severity}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{risk.title}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{risk.impact}</p>
                <p className="mt-2 text-xs text-muted-foreground">Affected {risk.affectedInteractions}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
