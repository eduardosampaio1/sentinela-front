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
  const insightLabels = ["Problem", "Why it matters", "Recommended action"];

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-primary/25 bg-[linear-gradient(145deg,rgba(10,16,30,0.92),rgba(9,20,36,0.86))] p-6 shadow-[0_30px_70px_-38px_rgba(7,172,215,0.65)] sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(6,182,212,0.2),transparent_42%),radial-gradient(circle_at_92%_88%,rgba(59,130,246,0.12),transparent_40%)]" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/35 bg-primary/12 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.04em] text-primary">
                5. Top recommendation
              </span>
              {model.escalated ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.04em] text-red-200">
                  Act now
                </span>
              ) : null}
            </div>
            <h2 className="max-w-4xl text-[1.8rem] font-semibold leading-[1.16] tracking-tight text-foreground sm:text-[2.2rem]">
              {model.headline}
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              This is the highest-leverage move based on the current run. Use it to decide what changes now, and what can wait.
            </p>
          </div>

          <div className="rounded-[22px] border border-border/45 bg-background/30 p-4 xl:max-w-[280px]">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium text-foreground">Action framing</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Treat this as the next operational move, not a generic suggestion list.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {model.supportingBlocks.slice(0, 3).map((text, index) => (
            <article
              key={text}
              className="rounded-[22px] border border-border/45 bg-background/30 p-4"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {insightLabels[index] ?? `Action note ${index + 1}`}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground">{text}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onPrimaryAction} className="rounded-2xl px-5">
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
