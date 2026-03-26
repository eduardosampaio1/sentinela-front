import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const copy = {
  title: "Pricing built for staged adoption",
  body:
    "Start with analysis, then grow into repeatable governance when the operational need is clear.",
  highlight: "Best for active teams",
  plans: [
    {
      name: "Free",
      price: "$0",
      period: "",
      features: [
        "Up to 100 conversations",
        "Core diagnostic metrics",
        "Critical alert highlights",
        "No retention required to test",
      ],
      cta: "Start free",
      highlight: false,
    },
    {
      name: "Growth",
      price: "$149",
      period: "/month",
      features: [
        "Up to 10k conversations",
        "History and run comparison",
        "Full dashboard visibility",
        "Exportable reports for stakeholders",
      ],
      cta: "Start Growth",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: [
        "Higher-volume monitoring",
        "Custom governance workflows",
        "Dedicated support path",
        "Integration planning with your team",
      ],
      cta: "Talk to us",
      highlight: false,
    },
  ],
};

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-card/30 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">{copy.title}</h2>
          <p className="text-lg text-muted-foreground">{copy.body}</p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {copy.plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 transition-all sm:p-8 ${
                plan.highlight
                  ? "border-primary/50 bg-gradient-card shadow-glow"
                  : "border-border/50 bg-gradient-card hover:border-primary/20"
              }`}
            >
              {plan.highlight ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {copy.highlight}
                </div>
              ) : null}
              <h3 className="mb-2 text-lg font-semibold">{plan.name}</h3>
              <div className="mb-6 flex items-end gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="pb-1 text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-secondary-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/login">
                <Button
                  className={`w-full transition-opacity ${
                    plan.highlight
                      ? "bg-gradient-primary text-primary-foreground hover:opacity-90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
