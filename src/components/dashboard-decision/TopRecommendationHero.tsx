import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import type { TopRecommendationHeroModel } from "@/lib/decisionLayerModel";
import { Button } from "@/components/ui/button";

interface TopRecommendationHeroProps {
  model: TopRecommendationHeroModel;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  secondaryDisabled?: boolean;
}

export default function TopRecommendationHero({
  model,
  onPrimaryAction,
  onSecondaryAction,
  secondaryDisabled,
}: TopRecommendationHeroProps) {
  return (
    <section className="dashboard-panel-strong dashboard-subtle-grid overflow-hidden p-6 sm:p-7">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                05 Top recommendation
              </span>
              {model.escalated ? (
                <span className="animate-signal-pulse rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-200">
                  Immediate action
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 max-w-4xl font-display text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[2.85rem]">
              {model.headline}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              This is the highest-leverage move based on the current run. Use it to decide what changes now, and what can wait.
            </p>
          </div>

          <div className="rounded-[24px] border border-border/55 bg-background/35 p-4 xl:max-w-[300px]">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">Action framing</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Treat this as the next operational move, not a generic suggestion list.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {model.supportingBlocks.slice(0, 3).map((text, index) => (
            <article key={text} className="rounded-[22px] border border-border/55 bg-background/35 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Action note {index + 1}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground">{text}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={onPrimaryAction}
            className="rounded-2xl px-5 shadow-[0_24px_48px_-28px_rgba(34,211,238,0.9)]"
          >
            {model.primaryCtaLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {model.secondaryCtaLabel && onSecondaryAction ? (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              disabled={secondaryDisabled}
              className="rounded-2xl border-border/60 bg-background/30"
            >
              <RefreshCw className="h-4 w-4" />
              {model.secondaryCtaLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
