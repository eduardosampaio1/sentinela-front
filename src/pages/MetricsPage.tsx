import type { ReactNode } from "react";
import { BarChart3, CircleDashed, Coins, ListOrdered } from "lucide-react";
import EmptyState from "@/components/dashboard/EmptyState";
import MetricInfo from "@/components/dashboard/MetricInfo";
import AccordionPanel from "@/components/ui/AccordionPanel";
import { Badge } from "@/components/ui/badge";
import { useAnalysis } from "@/contexts/AnalysisContext";
import {
  computeReliabilityIndex,
  estimateSavingsOpportunity,
  estimateWasteRate,
  formatMoney,
  formatPercent,
  getConsistencyHealth,
  getMetricNarrative,
  getSimilarityHealth,
  healthColor,
  progressColor,
} from "@/lib/metrics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">{children}</div>;
}

export default function MetricsPage() {
  const { result, dataSource } = useAnalysis();

  if (!result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Metrics</h1>
        <EmptyState />
      </div>
    );
  }

  const text = {
    title: "Metrics",
    subtitle:
      "Translate raw numbers into signals that product and operations can prioritize.",
    fresh: "Fresh",
    cached: "Cached",
    metricHealth: "Metric health map",
    metricHealthTip:
      "This radar makes trade-offs visible. A healthy run should stay balanced across dimensions.",
    optimization: "Optimization upside",
    optimizationTip:
      "Use this estimate for prioritization. Treat it as directional, not exact billing.",
    savingsBody: "Potential savings if weak response patterns are corrected.",
    wasteRate: "Estimated waste rate",
    wasteHint: "Improving this run could unlock about",
    wasteHintTail: "less waste with current heuristics.",
    weakest: "Weakest intents by stability",
    weakestTip: "Address weak intents first to reduce trust and support risk.",
    cards: [
      "Consistency score",
      "Response stability",
      "Cross-intent similarity",
      "Reliability index",
    ],
    reliabilityHelper:
      "A blended executive score useful for triage. Always confirm with base metrics.",
    radarLabels: ["Consistency", "Confidence", "Stability", "Coverage", "Separation"],
  };

  const wasteRate = estimateWasteRate(result);
  const savings = estimateSavingsOpportunity(result);
  const reliability = computeReliabilityIndex({
    consistency_score: result.consistency_score,
    cross_intent_similarity: result.cross_intent_similarity,
    waste_rate: wasteRate,
  });

  const radarData = [
    { metric: text.radarLabels[0], value: result.consistency_score ?? 0 },
    { metric: text.radarLabels[1], value: result.global_confidence ?? 0 },
    { metric: text.radarLabels[2], value: result.response_stability_score ?? 0 },
    { metric: text.radarLabels[3], value: result.intent_coverage_score ?? 0 },
    { metric: text.radarLabels[4], value: 100 - (result.cross_intent_similarity ?? 100) },
  ];

  const intentBars = [...(result.intents ?? [])]
    .map((intent) => ({
      intent: intent.intent,
      stability: intent.response_stability_score ?? intent.consistency_score ?? 0,
      variance: intent.response_variance ?? 0,
    }))
    .sort((a, b) => a.stability - b.stability)
    .slice(0, 8);

  const cards = [
    {
      title: text.cards[0],
      value: formatPercent(result.consistency_score),
      tone: getConsistencyHealth(result.consistency_score),
      helper: getMetricNarrative("consistency", result.consistency_score).detail,
    },
    {
      title: text.cards[1],
      value: formatPercent(result.response_stability_score),
      tone: getConsistencyHealth(result.response_stability_score),
      helper: getMetricNarrative("stability", result.response_stability_score).detail,
    },
    {
      title: text.cards[2],
      value: formatPercent(result.cross_intent_similarity),
      tone: getSimilarityHealth(result.cross_intent_similarity),
      helper: getMetricNarrative("similarity", result.cross_intent_similarity).detail,
    },
    {
      title: text.cards[3],
      value: `${reliability}/100`,
      tone: getConsistencyHealth(reliability),
      helper: text.reliabilityHelper,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{text.title}</h1>
          <p className="text-sm text-muted-foreground">{text.subtitle}</p>
        </div>
        <Badge variant={dataSource === "fresh" ? "default" : "secondary"} className="text-xs">
          {dataSource === "fresh" ? text.fresh : text.cached}
        </Badge>
      </div>

      <AccordionPanel
        title="Semantic Consistency"
        icon={<CircleDashed className="h-4 w-4" />}
        badge={
          <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
            {formatPercent(result.consistency_score)}
          </span>
        }
        defaultOpen={false}
      >
        <Card>
          <MetricInfo title={text.metricHealth} tooltip={text.metricHealthTip} />
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <Radar
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AccordionPanel>

      <AccordionPanel
        title="Token & Cost Breakdown"
        icon={<Coins className="h-4 w-4" />}
        badge={
          <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
            {wasteRate !== undefined ? formatPercent(wasteRate) : "N/A"}
          </span>
        }
        defaultOpen={false}
      >
        <Card>
          <MetricInfo title={text.optimization} tooltip={text.optimizationTip} />
          <div className="space-y-5">
            <div>
              <div className="text-4xl font-semibold text-foreground">
                {formatMoney(savings.monthlySavings)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{text.savingsBody}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{text.wasteRate}</span>
                <span className="font-medium text-foreground">
                  {wasteRate !== undefined ? formatPercent(wasteRate) : "N/A"}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${progressColor(String(getConsistencyHealth(100 - (wasteRate ?? 100))))}`}
                  style={{ width: `${Math.max(6, wasteRate ?? 0)}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-muted-foreground">
              {text.wasteHint} <span className="font-semibold text-foreground">{savings.savingPercent}%</span>{" "}
              {text.wasteHintTail}
            </div>
          </div>
        </Card>
      </AccordionPanel>

      <AccordionPanel
        title="Core Metric Signals"
        icon={<BarChart3 className="h-4 w-4" />}
        badge={
          <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
            {cards.length}
          </span>
        }
        defaultOpen={false}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <MetricInfo title={card.title} />
              <div className={`text-3xl font-bold ${healthColor(String(card.tone))}`}>{card.value}</div>
              <div className="mt-2 text-sm text-muted-foreground">{card.helper}</div>
            </Card>
          ))}
        </div>
      </AccordionPanel>

      <AccordionPanel
        title="Weakest Intents"
        icon={<ListOrdered className="h-4 w-4" />}
        badge={
          <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
            {intentBars.length}
          </span>
        }
        defaultOpen={false}
      >
        <Card>
          <MetricInfo title={text.weakest} tooltip={text.weakestTip} />
          <div className="h-[300px] overflow-x-auto sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intentBars} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis dataKey="intent" type="category" width={140} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="stability" radius={[0, 8, 8, 0]}>
                  {intentBars.map((item) => (
                    <Cell
                      key={item.intent}
                      fill={
                        item.stability >= 75
                          ? "#22c55e"
                          : item.stability >= 60
                            ? "#facc15"
                            : item.stability >= 40
                              ? "#fb923c"
                              : "#f87171"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </AccordionPanel>
    </div>
  );
}

