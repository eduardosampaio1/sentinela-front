import { Activity, GitBranch, Layers, Zap, BarChart3 } from "lucide-react";

const metrics = [
  {
    icon: Activity,
    title: "Consistency Score",
    description: "Overall measure of response uniformity across similar intents and contexts.",
    value: "78%",
    color: "text-primary",
  },
  {
    icon: GitBranch,
    title: "Structural Drift Index",
    description: "Tracks deviation in response structure and format over time.",
    value: "0.34",
    color: "text-warning",
  },
  {
    icon: Layers,
    title: "Cross-Intent Similarity",
    description: "Detects when different intents produce indistinguishable responses.",
    value: "18%",
    color: "text-critical",
  },
  {
    icon: Zap,
    title: "Token Efficiency Rate",
    description: "Measures useful content per token against baseline thresholds.",
    value: "62%",
    color: "text-success",
  },
  {
    icon: BarChart3,
    title: "Behavioral Oscillation Detection",
    description: "Identifies erratic swings in tone, length, or structure between sessions.",
    value: "3 flags",
    color: "text-warning",
  },
];

const MetricsSection = () => {
  return (
    <section id="metrics" className="py-24 bg-card/30">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Built for measurable governance</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-lg mx-auto">
          Every metric is designed to surface actionable insights from your AI operations.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((m, i) => (
            <div
              key={i}
              className="p-6 rounded-xl border border-border/50 bg-gradient-card hover:border-primary/20 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <m.icon className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</span>
              </div>
              <h3 className="text-base font-semibold mb-2">{m.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>
              {/* Mini chart placeholder */}
              <div className="mt-4 h-8 flex items-end gap-[2px]">
                {Array.from({ length: 20 }).map((_, j) => (
                  <div
                    key={j}
                    className="flex-1 rounded-sm bg-primary/20 group-hover:bg-primary/30 transition-colors"
                    style={{ height: `${Math.random() * 100}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetricsSection;
