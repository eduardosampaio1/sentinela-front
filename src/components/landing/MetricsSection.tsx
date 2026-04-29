import { Activity, BarChart3, GitBranch, Layers, Zap } from "lucide-react";

const copy = {
  badge: "What Sentinela detects",
  title: "From raw conversations to operational signal.",
  body:
    "Sentinela turns conversation history into measurable indicators your team can act on: instability, wasted spend, overlap, drift, and emerging risk.",
  baseline: "Baseline",
  latest: "Latest run",
  metrics: [
    {
      icon: Activity,
      title: "Consistency score",
      description:
        "Measures how stable answers remain across semantically similar conversations and repeated scenarios.",
      value: "78%",
      color: "text-primary",
      bars: [32, 38, 42, 48, 58, 54, 61, 68, 72, 78],
    },
    {
      icon: GitBranch,
      title: "Structural drift index",
      description:
        "Highlights when the response format, ordering, or answer pattern starts deviating from the expected baseline.",
      value: "0.34",
      color: "text-warning",
      bars: [18, 24, 20, 28, 26, 34, 31, 37, 33, 40],
    },
    {
      icon: Layers,
      title: "Cross-intent overlap",
      description:
        "Flags when supposedly different intents begin producing near-identical outputs and weaker task separation.",
      value: "18%",
      color: "text-critical",
      bars: [55, 51, 48, 45, 39, 35, 30, 26, 22, 18],
    },
    {
      icon: Zap,
      title: "Token efficiency",
      description:
        "Estimates whether answer length is justified by useful content, instead of verbosity or duplication.",
      value: "62%",
      color: "text-success",
      bars: [24, 28, 34, 39, 44, 49, 53, 56, 60, 62],
    },
    {
      icon: BarChart3,
      title: "Behavioral volatility",
      description:
        "Detects unstable swings in tone, length, confidence, or structure between similar sessions.",
      value: "3 flags",
      color: "text-warning",
      bars: [12, 14, 26, 18, 32, 22, 41, 29, 36, 24],
    },
    {
      icon: Activity,
      title: "Alert density",
      description:
        "Shows how concentrated high-severity findings are in a run, helping prioritize the most fragile areas first.",
      value: "4 high",
      color: "text-critical",
      bars: [8, 12, 15, 19, 25, 22, 31, 29, 36, 40],
    },
  ],
};

export default function MetricsSection() {
  return (
    <section id="detection" className="bg-card/30 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {copy.badge}
          </div>
          <h2 className="mb-4 text-3xl font-bold text-balance md:text-4xl">{copy.title}</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {copy.metrics.map((metric, i) => (
            <div
              key={metric.title}
              className={`group rounded-2xl border border-border/50 bg-gradient-card p-6 transition-all duration-200 hover:border-primary/25 hover:shadow-card cursor-default
                ${i === 0 ? "xl:col-span-2" : ""}`}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 transition-colors duration-200 group-hover:bg-primary/20">
                  <metric.icon className="h-5 w-5 text-primary" />
                </div>
                <span className={`font-mono-label text-2xl font-bold ${metric.color}`}>{metric.value}</span>
              </div>

              <h3 className="mb-2 text-base font-semibold">{metric.title}</h3>
              <p className={`text-sm leading-relaxed text-muted-foreground ${i === 0 ? "" : "min-h-[72px]"}`}>
                {metric.description}
              </p>

              <div className={`mt-5 ${i === 0 ? "xl:mt-7" : ""}`}>
                <div className={`flex items-end gap-1.5 ${i === 0 ? "h-16 xl:h-20" : "h-14"}`}>
                  {metric.bars.map((bar, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 rounded-sm transition-all duration-200
                        ${idx === metric.bars.length - 1
                          ? `${metric.color.replace("text-", "bg-")} opacity-80 group-hover:opacity-100`
                          : "bg-primary/15 group-hover:bg-primary/25"}`}
                      style={{ height: `${bar}%` }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between font-mono-label text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <span>{copy.baseline}</span>
                  <span>{copy.latest}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
