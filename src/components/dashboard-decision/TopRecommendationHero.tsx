import { AlertTriangle } from "lucide-react";
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
    <section className="relative overflow-hidden rounded-[30px] border border-primary/25 bg-[linear-gradient(145deg,rgba(10,16,30,0.92),rgba(9,20,36,0.86))] p-6 shadow-[0_30px_70px_-38px_rgba(7,172,215,0.65)] sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(6,182,212,0.2),transparent_42%),radial-gradient(circle_at_92%_88%,rgba(59,130,246,0.12),transparent_40%)]" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/35 bg-primary/12 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.04em] text-primary">
                Top recommendation
              </span>
              {model.escalated ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.04em] text-red-200">
                  Act now
                </span>
              ) : null}
            </div>
            <h1 className="max-w-4xl text-[1.8rem] font-semibold leading-[1.16] tracking-tight text-foreground sm:text-[2.2rem]">
              {model.headline}
            </h1>
          </div>

          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-primary/90" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {model.supportingBlocks.slice(0, 2).map((text) => (
            <p
              key={text}
              className="rounded-xl border border-border/45 bg-background/40 px-3.5 py-2.5 text-sm leading-snug text-muted-foreground"
            >
              {text}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onPrimaryAction}>{model.primaryCtaLabel}</Button>
          {model.secondaryCtaLabel && onSecondaryAction ? (
            <Button variant="ghost" onClick={onSecondaryAction} disabled={secondaryDisabled}>
              {model.secondaryCtaLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
