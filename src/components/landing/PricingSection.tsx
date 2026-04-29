import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  "Full conversation analysis",
  "Behavioral diagnostics (3 axes)",
  "Critical alerts & highlights",
  "History and run comparison",
  "Full dashboard with export",
  "No credit card required",
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-card/30 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Free while we validate together</h2>
          <p className="text-lg text-muted-foreground">
            Get full access during our early validation phase. No time limit. No credit card.
          </p>
        </div>

        <div className="mx-auto max-w-lg space-y-4">
          {/* Single plan card */}
          <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/8 to-primary/3 p-8 shadow-glow ring-1 ring-primary/20">
            {/* Glow top accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent rounded-t-2xl" />

            <div className="mb-6 flex items-center gap-2">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono-label text-xs font-semibold text-primary">
                Early Access
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono-label text-xs font-semibold text-emerald-400">
                Free
              </span>
            </div>

            <div className="mb-2 flex items-end gap-1">
              <span className="font-display text-6xl font-bold">$0</span>
              <span className="pb-2 text-sm text-muted-foreground">for now</span>
            </div>
            <p className="mb-8 text-sm text-muted-foreground">Full platform access. No strings attached.</p>

            <ul className="mb-8 space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link to="/register">
              <Button className="h-12 w-full rounded-xl bg-gradient-primary font-semibold text-primary-foreground hover:opacity-90 shadow-glow text-base">
                Start for free
              </Button>
            </Link>
          </div>

          {/* AION teaser */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/50 p-5 sm:flex-row sm:items-center hover:border-border/70 transition-colors">
            <div className="flex-1">
              <span className="mb-2 inline-block rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 font-mono-label text-xs font-semibold text-teal-400">
                Runtime Control
              </span>
              <p className="text-sm text-muted-foreground">
                Building at scale? <span className="text-foreground font-medium">AION</span> brings real-time AI governance — policy enforcement, smart routing, and cost control.
              </p>
            </div>
            <Link to="/aion" className="shrink-0">
              <Button variant="outline" size="sm" className="rounded-xl whitespace-nowrap border-teal-500/30 text-teal-400 hover:border-teal-500/60 hover:text-teal-300 cursor-pointer">
                Explore AION →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
