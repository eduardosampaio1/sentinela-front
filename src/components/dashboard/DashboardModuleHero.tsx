import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type HeroTone = "neutral" | "safe" | "watch" | "risk" | "primary";

interface ModuleHeroStat {
  label: string;
  value: string;
  helper?: string;
}

interface ModuleHeroChip {
  label: string;
  tone?: HeroTone;
}

interface DashboardModuleHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  chips?: ModuleHeroChip[];
  stats?: ModuleHeroStat[];
  className?: string;
}

function toneClass(tone: HeroTone = "neutral") {
  if (tone === "risk") return "border-red-500/30 bg-red-500/12 text-red-200";
  if (tone === "watch") return "border-amber-500/30 bg-amber-500/12 text-amber-200";
  if (tone === "safe") return "border-emerald-500/30 bg-emerald-500/12 text-emerald-200";
  if (tone === "primary") return "border-primary/30 bg-primary/10 text-primary";
  return "border-border/60 bg-background/35 text-muted-foreground";
}

export default function DashboardModuleHero({
  eyebrow,
  title,
  description,
  icon,
  chips = [],
  stats = [],
  className,
}: DashboardModuleHeroProps) {
  return (
    <section className={cn("dashboard-panel-strong dashboard-subtle-grid overflow-hidden p-6 sm:p-7", className)}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-primary/25 bg-background/35 text-primary shadow-[0_20px_40px_-24px_rgba(79,90,232,0.8)]">
              {icon}
            </span>
            <div>
              <p className="dashboard-kicker">{eyebrow}</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
                {title}
              </h1>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[0.98rem]">
            {description}
          </p>

          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Badge key={chip.label} variant="outline" className={cn("rounded-full px-3 py-1", toneClass(chip.tone))}>
                  {chip.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {stats.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px] xl:max-w-[420px] xl:flex-1">
            {stats.map((stat) => (
              <article key={stat.label} className="rounded-[22px] border border-border/55 bg-background/38 p-4 backdrop-blur-xl">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">{stat.value}</p>
                {stat.helper ? (
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{stat.helper}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
