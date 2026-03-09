import { AlertTriangle } from "lucide-react";

const problems = [
  "Excessively long responses increase token spend",
  "Generic patterns reduce quality",
  "Intent drift harms brand consistency",
  "Lack of structure reduces reliability",
];

const ProblemSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            AI without governance increases hidden costs.
          </h2>
          <p className="text-muted-foreground mb-12 text-lg">
            Unmonitored models generate drift, waste, and inconsistency at scale.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-12 text-left">
            {problems.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-card/50">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <span className="text-sm text-secondary-foreground">{p}</span>
              </div>
            ))}
          </div>

          <div className="inline-block px-6 py-4 rounded-xl border border-warning/30 bg-warning/5">
            <p className="text-base font-semibold">
              Teams waste up to <span className="text-warning font-bold">15%</span> of LLM budget due to inconsistency.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
