import { Shield, Eye, Clock, Server } from "lucide-react";

const features = [
  { icon: Clock, title: "Temporary processing", desc: "Data is processed in-memory and never persisted beyond analysis." },
  { icon: Eye, title: "Automatic anonymization", desc: "PII is stripped before any metric computation begins." },
  { icon: Shield, title: "No retention in Free plan", desc: "Zero data storage for free-tier users. Full control on paid plans." },
  { icon: Server, title: "SOC2-ready architecture", desc: "Infrastructure designed to meet enterprise compliance standards." },
];

const SecuritySection = () => {
  return (
    <section id="security" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise-grade data protection</h2>
          <p className="text-muted-foreground">
            Your data never leaves the analysis pipeline. Built for compliance from day one.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-4 p-6 rounded-xl border border-border/50 bg-gradient-card">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
