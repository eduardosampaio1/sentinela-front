import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthHighlight = {
  title: string;
  description: string;
};

interface AuthExperienceShellProps {
  eyebrow: string;
  title: string;
  description: string;
  highlights: AuthHighlight[];
  children: ReactNode;
  status?: string | null;
  error?: string | null;
  cardClassName?: string;
}

export default function AuthExperienceShell({
  eyebrow,
  title,
  description,
  highlights,
  children,
  status,
  error,
  cardClassName,
}: AuthExperienceShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <div className="pointer-events-none absolute inset-0 dashboard-subtle-grid opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-[-12rem] w-[28rem] bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_62%)] blur-3xl" />

      <div className="page-shell flex min-h-screen items-center py-10 sm:py-12">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:gap-8">
          <section className="dashboard-panel-muted relative overflow-hidden p-7 sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%)]" />
            <div className="relative">
              <div className="dashboard-kicker">{eyebrow}</div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-sm font-semibold text-primary shadow-glow">
                  S
                </div>
                <div>
                  <div className="font-display text-lg font-semibold text-foreground">Sentinela</div>
                  <div className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
                    Access Security Layer
                  </div>
                </div>
              </div>

              <h1 className="mt-8 max-w-xl font-display text-3xl font-semibold leading-tight text-foreground sm:text-[2.5rem]">
                {title}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                {description}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {highlights.map((highlight) => (
                  <div
                    key={highlight.title}
                    className="rounded-3xl border border-border/60 bg-background/45 p-4 backdrop-blur"
                  >
                    <div className="text-sm font-semibold text-foreground">{highlight.title}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {highlight.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className={cn(
              "dashboard-panel-strong relative overflow-hidden p-6 sm:p-8",
              cardClassName,
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_28%)]" />
            <div className="relative">
              {status ? (
                <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground">
                  {status}
                </div>
              ) : null}

              {error ? (
                <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {children}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
