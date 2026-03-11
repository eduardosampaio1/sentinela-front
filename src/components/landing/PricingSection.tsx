import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    features: ["Up to 100 conversations", "Core diagnostic metrics", "Critical alert highlights", "No retention required to test"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$149",
    period: "/month",
    features: ["Up to 10k conversations", "History and run comparison", "Full dashboard visibility", "Exportable reports for stakeholders"],
    cta: "Start Growth",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Higher-volume monitoring", "Custom governance workflows", "Dedicated support path", "Integration planning with your team"],
    cta: "Talk to us",
    highlight: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-card/30">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pricing built for staged adoption</h2>
          <p className="text-muted-foreground text-lg">
            Start with analysis, then grow into repeatable governance when the operational need is clear.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative p-8 rounded-2xl border transition-all ${
                plan.highlight
                  ? "border-primary/50 bg-gradient-card shadow-glow"
                  : "border-border/50 bg-gradient-card hover:border-primary/20"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                  Best for active teams
                </div>
              )}
              <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
              <div className="mb-6 flex items-end gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm pb-1">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-secondary-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/login">
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-gradient-primary text-primary-foreground hover:opacity-90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  } transition-opacity`}
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
};

export default PricingSection;
