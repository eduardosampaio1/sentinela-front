import type { ReactNode } from "react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import EmptyState from "@/components/dashboard/EmptyState";
import MetricInfo from "@/components/dashboard/MetricInfo";
import { Badge } from "@/components/ui/badge";
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
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from "recharts";

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">{children}</div>;
}

const MetricsPage = () => {
  const { result, dataSource } = useAnalysis();

  if (!result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Metrics</h1>
        <EmptyState />
      </div>
    );
  }

  const wasteRate = estimateWasteRate(result);
  const savings = estimateSavingsOpportunity(result);
  const reliability = computeReliabilityIndex({
    consistency_score: result.consistency_score,
    cross_intent_similarity: result.cross_intent_similarity,
    waste_rate: wasteRate,
  });

  const radarData = [
    { metric: "Consistency", value: result.consistency_score ?? 0 },
    { metric: "Confidence", value: result.global_confidence ?? 0 },
    { metric: "Stability", value: result.response_stability_score ?? 0 },
    { metric: "Coverage", value: result.intent_coverage_score ?? 0 },
    { metric: "Separation", value: 100 - (result.cross_intent_similarity ?? 100) },
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
      title: "Consistency score",
      value: formatPercent(result.consistency_score),
      tone: getConsistencyHealth(result.consistency_score),
      helper: getMetricNarrative("consistency", result.consistency_score).detail,
    },
    {
      title: "Response stability",
      value: formatPercent(result.response_stability_score),
      tone: getConsistencyHealth(result.response_stability_score),
      helper: getMetricNarrative("stability", result.response_stability_score).detail,
    },
    {
      title: "Cross-intent similarity",
      value: formatPercent(result.cross_intent_similarity),
      tone: getSimilarityHealth(result.cross_intent_similarity),
      helper: getMetricNarrative("similarity", result.cross_intent_similarity).detail,
    },
    {
      title: "Reliability index",
      value: `${reliability}/100`,
      tone: getConsistencyHealth(reliability),
      helper: "A blended executive score. Useful for triage, but never better than reading the underlying metrics.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metrics</h1>
          <p className="text-sm text-muted-foreground">Translate the raw numbers into something a product or operations leader can actually act on.</p>
        </div>
        <Badge variant={dataSource === "fresh" ? "default" : "secondary"} className="text-xs">
          {dataSource === "fresh" ? "Fresh" : "Cached"}
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <MetricInfo title="Metric health map" tooltip="This radar makes trade-offs visible. A good run should stay balanced, not spike in only one area." />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <MetricInfo title="Optimization upside" tooltip="This is an estimate to help prioritization. Treat it as directional, not as exact billing." />
          <div className="space-y-5">
            <div>
              <div className="text-4xl font-semibold text-foreground">{formatMoney(savings.monthlySavings)}</div>
              <div className="mt-1 text-sm text-muted-foreground">Potential savings if the weakest patterns are corrected.</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated waste rate</span>
                <span className="font-medium text-foreground">{wasteRate !== undefined ? formatPercent(wasteRate) : "N/A"}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${progressColor(String(getConsistencyHealth(100 - (wasteRate ?? 100))))}`} style={{ width: `${Math.max(6, wasteRate ?? 0)}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-muted-foreground">
              Improving this run could unlock about <span className="font-semibold text-foreground">{savings.savingPercent}% less waste</span> according to the current heuristics.
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <MetricInfo title={card.title} />
            <div className={`text-3xl font-bold ${healthColor(String(card.tone))}`}>{card.value}</div>
            <div className="mt-2 text-sm text-muted-foreground">{card.helper}</div>
          </Card>
        ))}
      </div>

      <Card>
        <MetricInfo title="Weakest intents by stability" tooltip="The worst intents deserve attention first because they can drag user trust down quickly." />
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={intentBars} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis dataKey="intent" type="category" width={140} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Bar dataKey="stability" radius={[0, 8, 8, 0]}>
                {intentBars.map((item) => (
                  <Cell key={item.intent} fill={item.stability >= 75 ? "#22c55e" : item.stability >= 60 ? "#facc15" : item.stability >= 40 ? "#fb923c" : "#f87171"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default MetricsPage;
