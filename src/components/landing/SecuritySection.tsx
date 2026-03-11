import { Shield, Eye, Clock, Server } from "lucide-react";

const features = [
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
];

const SecuritySection = () => {
  return (
    <section id="security" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Security and trust matter as much as detection</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Observability for AI only works when teams can evaluate behavior with discipline around privacy, access, and how
            sensitive data is handled.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-4 p-6 rounded-2xl border border-border/50 bg-gradient-card">
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
