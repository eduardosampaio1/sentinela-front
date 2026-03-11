import { Upload, Search, FileText } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Ingest conversation data",
    description: "Start with exported JSON or pipeline output. No heavyweight setup is required to run a first analysis.",
  },
  {
    icon: Search,
    title: "Detect behavioral patterns",
    description: "Sentinela evaluates consistency, drift, overlap, structure, and efficiency across intents and repeated situations.",
  },
  {
    icon: FileText,
    title: "Prioritize what needs action",
    description: "Get an executive-readable diagnostic with risk signals your team can compare, monitor, and improve over time.",
  },
];

const HowItWorks = () => {
  return (
    <section id="workflow" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
            Workflow
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How Sentinela works</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Designed to make model behavior legible without forcing your team into another complex observability rollout.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative p-8 rounded-2xl border border-border/50 bg-gradient-card hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3">0{i + 1}</div>
              <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
