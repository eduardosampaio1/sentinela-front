import { Clock, Eye, Server, Shield } from "lucide-react";

const copy = {
  title: "Security and trust matter as much as detection",
  body:
    "Observability for AI only works when teams can evaluate behavior with discipline around privacy, access, and how sensitive data is handled.",
  features: [
    {
      icon: Clock,
      title: "Data minimization mindset",
      desc: "The analysis flow is designed to limit unnecessary retention and keep handling scoped to what the diagnostic needs.",
    },
    {
      icon: Eye,
      title: "Privacy-conscious review",
      desc: "Built for teams that need visibility into model behavior without treating conversation data casually.",
    },
    {
      icon: Shield,
      title: "Access-aware product design",
      desc: "Authentication, environment separation, and protected application areas help keep analysis access controlled.",
    },
    {
      icon: Server,
      title: "Enterprise-ready direction",
      desc: "Sentinela is being shaped for organizations that need governance discipline, not just a prettier dashboard.",
    },
  ],
};

export default function SecuritySection() {
  return (
    <section id="security" className="bg-background py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono-label text-xs font-medium text-primary">
            Security &amp; Trust
          </div>
          <h2 className="mb-4 text-3xl font-bold text-balance md:text-4xl">{copy.title}</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
          {copy.features.map((feature) => (
            <div
              key={feature.title}
              className="group flex items-start gap-4 rounded-2xl border border-border/50 bg-gradient-card p-5 transition-all duration-200 hover:border-primary/25 hover:shadow-glow-sm cursor-default sm:p-6"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 transition-all duration-200 group-hover:bg-primary/20 group-hover:border-primary/35 group-hover:shadow-glow-sm">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
