import { Upload, Search, FileText } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload conversations",
    description: "Import your AI conversation logs via JSON upload or direct API integration.",
  },
  {
    icon: Search,
    title: "Analyze structure and semantic variation",
    description: "Our engine evaluates response consistency, structural patterns, and token efficiency across intents.",
  },
  {
    icon: FileText,
    title: "Receive governance diagnosis",
    description: "Get actionable metrics, drift alerts, and executive-ready reports in seconds.",
  },
];

const HowItWorks = () => {
  return (
    <section id="product" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-md mx-auto">Three steps to governance clarity.</p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative p-8 rounded-xl border border-border/50 bg-gradient-card hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-xs font-mono text-muted-foreground mb-2">0{i + 1}</div>
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
