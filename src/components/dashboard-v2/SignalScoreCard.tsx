import { TrendingDown, TrendingUp, Minus } from "lucide-react";
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
  if (indicator === "healthy") return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  if (indicator === "risk") return "text-red-300 border-red-500/30 bg-red-500/10";
  return "text-amber-300 border-amber-500/30 bg-amber-500/10";
}

export default function SignalScoreCard({ item }: SignalScoreCardProps) {
  const progress =
    item.score === null
      ? 0
      : item.direction === "higher_better"
        ? Math.max(6, Math.min(item.score, 100))
        : Math.max(6, Math.min(100 - item.score, 100));

  return (
    <article className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${indicatorClass(item.indicator)}`}>
          {indicatorLabel(item.indicator)}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-2xl font-semibold text-foreground">{formatPercent(item.score)}</div>
        <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {trendIcon(item.trend)}
          {trendLabel(item.trend)}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/70">
        <div
          className="h-full rounded-full bg-primary/80 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </article>
  );
}

