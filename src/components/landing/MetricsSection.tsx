import { Activity, GitBranch, Layers, Zap, BarChart3 } from "lucide-react";

const metrics = [
  {
    icon: Activity,
    title: "Consistency score",
    description: "Measures how stable answers remain across semantically similar conversations and repeated scenarios.",
    value: "78%",
    color: "text-primary",
    bars: [32, 38, 42, 48, 58, 54, 61, 68, 72, 78],
  },
  {
    icon: GitBranch,
    title: "Structural drift index",
    description: "Highlights when the response format, ordering, or answer pattern starts deviating from the expected baseline.",
    value: "0.34",
    color: "text-warning",
    bars: [18, 24, 20, 28, 26, 34, 31, 37, 33, 40],
  },
  {
    icon: Layers,
    title: "Cross-intent overlap",
    description: "Flags when supposedly different intents begin producing near-identical outputs and weaker task separation.",
    value: "18%",
    color: "text-critical",
    bars: [55, 51, 48, 45, 39, 35, 30, 26, 22, 18],
  },
  {
    icon: Zap,
    title: "Token efficiency",
    description: "Estimates whether answer length is justified by useful content, instead of verbosity or duplication.",
    value: "62%",
    color: "text-success",
    bars: [24, 28, 34, 39, 44, 49, 53, 56, 60, 62],
  },
  {
    icon: BarChart3,
    title: "Behavioral volatility",
    description: "Detects unstable swings in tone, length, confidence, or structure between similar sessions.",
    value: "3 flags",
    color: "text-warning",
    bars: [12, 14, 26, 18, 32, 22, 41, 29, 36, 24],
  },
  {
    icon: Activity,
    title: "Alert density",
    description: "Shows how concentrated high-severity findings are in a run, helping prioritize the most fragile areas first.",
    value: "4 high",
    color: "text-critical",
    bars: [8, 12, 15, 19, 25, 22, 31, 29, 36, 40],
  },
];

const MetricsSection = () => {
  return (
    <section id="detection" className="py-24 bg-card/30">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
            What Sentinela detects
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">From raw conversations to operational signal.</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Sentinela turns conversation history into measurable indicators your team can act on: instability, wasted spend,
            overlap, drift, and emerging risk.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl border border-border/50 bg-gradient-card hover:border-primary/20 transition-all group"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <metric.icon className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-2xl font-bold font-mono ${metric.color}`}>{metric.value}</span>
              </div>

              <h3 className="text-base font-semibold mb-2">{metric.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed min-h-[72px]">{metric.description}</p>

              <div className="mt-5">
                <div className="flex items-end gap-1.5 h-14">
                  {metric.bars.map((bar, barIndex) => (
                    <div
                      key={barIndex}
                      className="flex-1 rounded-sm bg-primary/20 group-hover:bg-primary/30 transition-colors"
                      style={{ height: `${bar}%` }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Baseline</span>
                  <span>Latest run</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetricsSection;
