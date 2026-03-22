import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  formatPercent,
  indicatorLabel,
  trendLabel,
  type SignalCardModel,
} from "@/lib/dashboardModel";

interface SignalScoreCardProps {
  item: SignalCardModel;
}

function trendIcon(trend: SignalCardModel["trend"]) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

function indicatorClass(indicator: SignalCardModel["indicator"]) {
  if (indicator === "healthy") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (indicator === "risk") return "border-red-500/30 bg-red-500/10 text-red-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

export default function SignalScoreCard({ item }: SignalScoreCardProps) {
  const progress =
    item.score === null
      ? 0
      : item.direction === "higher_better"
        ? Math.max(6, Math.min(item.score, 100))
        : Math.max(6, Math.min(100 - item.score, 100));

  return (
    <article className="dashboard-panel-muted overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Signal card</p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{item.title}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${indicatorClass(item.indicator)}`}>
          {indicatorLabel(item.indicator)}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Current score</p>
          <div className="mt-2 font-display text-[2.2rem] font-semibold tracking-tight text-foreground">
            {formatPercent(item.score)}
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/30 px-3 py-1 text-xs text-muted-foreground">
          {trendIcon(item.trend)}
          {trendLabel(item.trend)}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/65 to-sky-400/80 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </article>
  );
}
