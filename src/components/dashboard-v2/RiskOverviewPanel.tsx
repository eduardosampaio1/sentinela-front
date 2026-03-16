import type { RiskOverviewModel } from "@/lib/dashboardModel";
import { formatPercent } from "@/lib/dashboardModel";

interface RiskOverviewPanelProps {
  model: RiskOverviewModel;
}

function severityBadgeClass(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "high") {
    return "border-red-500/40 bg-red-500/10 text-red-200";
  }
  if (normalized === "medium") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  }
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
}

function trendTone(trend: RiskOverviewModel["trend"]) {
  if (trend === "Regressing") return "text-red-300";
  if (trend === "Improving") return "text-emerald-300";
  return "text-muted-foreground";
}

export default function RiskOverviewPanel({ model }: RiskOverviewPanelProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">AI System Risk Overview</h2>
          <p className="text-sm text-muted-foreground">
            Consolidated health, confidence, and top risks from the current analysis.
          </p>
        </div>
        <p className={`text-sm font-medium ${trendTone(model.trend)}`}>Trend: {model.trend}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-border/70 bg-background/50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Risk Level</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{model.riskLevel}</p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-background/50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">AI Health Score</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatPercent(model.aiHealthScore)}</p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-background/50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Confidence</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatPercent(model.confidence)}</p>
        </article>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-medium text-foreground">Top 3 risks detected</h3>
        {model.topRisks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No major risks reported in this analysis.</p>
        ) : (
          model.topRisks.map((risk) => (
            <article
              key={risk.id}
              className="rounded-2xl border border-border/70 bg-background/50 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] ${severityBadgeClass(risk.severity)}`}
                >
                  {risk.severity}
                </span>
                <p className="text-sm font-medium text-foreground">{risk.title}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Impact: {risk.impact} • Affected: {risk.affectedInteractions}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
