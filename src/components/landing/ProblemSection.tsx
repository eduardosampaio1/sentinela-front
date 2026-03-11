import { AlertTriangle, BadgeDollarSign, MessageSquareWarning, ShieldAlert } from "lucide-react";

const problems = [
  {
    icon: BadgeDollarSign,
    title: "Waste hides inside decent-looking answers",
    description: "Long, repetitive, or unfocused responses inflate token spend without improving task completion.",
  },
  {
    icon: MessageSquareWarning,
    title: "Logs alone do not reveal semantic drift",
    description: "A model can look healthy in throughput dashboards while quietly changing tone, structure, or quality.",
  },
  {
    icon: ShieldAlert,
    title: "Inconsistency becomes user-visible before teams notice",
    description: "What starts as subtle variance eventually turns into support friction, trust erosion, and brand instability.",
  },
  {
    icon: AlertTriangle,
    title: "Manual QA does not scale with production volume",
    description: "Sampling conversations by hand is slow, expensive, and too shallow to detect systemic behavior changes.",
  },
];

const ProblemSection = () => {
  return (
    <section id="problem" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-medium text-warning mb-4">
            Why teams need this now
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-balance">
            Most AI teams measure activity.
            <br />
            Very few measure behavior.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Sentinela exists for the gap between raw logs and real governance: the place where drift, inconsistency, and
            waste accumulate before they show up as obvious incidents.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto mb-10 text-left">
          {problems.map((problem, index) => (
            <div key={index} className="rounded-2xl border border-border/50 bg-gradient-card p-6 hover:border-primary/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 border border-warning/20">
                  <problem.icon className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-2">{problem.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{problem.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 text-center">
          <p className="text-base md:text-lg font-medium leading-relaxed">
            Sentinela helps teams answer a harder question than <span className="text-foreground font-semibold">“is the system up?”</span>:
            <span className="text-primary font-semibold"> “is the model still behaving the way we need it to?”</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
