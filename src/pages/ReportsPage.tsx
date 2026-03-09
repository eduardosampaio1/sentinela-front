import { useMemo } from "react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import EmptyState from "@/components/dashboard/EmptyState";
import MetricInfo from "@/components/dashboard/MetricInfo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { estimateSavingsOpportunity, formatDate, formatMoney, formatPercent, getExecutiveSummary, getTopRecommendations, getTopUnstableIntents } from "@/lib/metrics";

const ReportsPage = () => {
  const { result, dataSource } = useAnalysis();
  const { toast } = useToast();

  const reportText = useMemo(() => {
    if (!result) return "";
    const summary = getExecutiveSummary(result);
    const savings = estimateSavingsOpportunity(result);
    const weakIntents = getTopUnstableIntents(result.intents, 3);
    const recommendations = getTopRecommendations(result.alerts, 4);

    return [
      "SENTINELA EXECUTIVE SUMMARY",
      `Generated at: ${formatDate(new Date().toISOString())}`,
      "",
      `Headline: ${summary.title}`,
      summary.detail,
      "",
      `Consistency: ${formatPercent(result.consistency_score)}`,
      `Response stability: ${formatPercent(result.response_stability_score)}`,
      `Cross-intent similarity: ${formatPercent(result.cross_intent_similarity)}`,
      `Potential savings: ${formatMoney(savings.monthlySavings)} (~${savings.savingPercent}%)`,
      "",
      "Top weak intents:",
      ...weakIntents.map((intent, index) => `${index + 1}. ${intent.intent} - stability ${formatPercent(intent.response_stability_score ?? intent.consistency_score)}`),
      "",
      "Recommended next moves:",
      ...recommendations.map((item, index) => `${index + 1}. ${item}`),
    ].join("\n");
  }, [result]);

  if (!result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <EmptyState />
      </div>
    );
  }

  const summary = getExecutiveSummary(result);
  const savings = estimateSavingsOpportunity(result);
  const recommendations = getTopRecommendations(result.alerts, 4);

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    toast({ title: "Report copied to clipboard" });
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sentinela-report-${result.analysis_id || "latest"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Turn the run into something a leader can forward without adding a two-paragraph explanation.</p>
        </div>
        <Badge variant={dataSource === "fresh" ? "default" : "secondary"} className="text-xs">
          {dataSource === "fresh" ? "Fresh" : "Cached"}
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copyReport}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy summary</Button>
        <Button variant="outline" size="sm" onClick={downloadJson}><Download className="mr-1.5 h-3.5 w-3.5" /> Download JSON</Button>
      </div>

      <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
        <MetricInfo title="Executive headline" tooltip="A report should lead with the problem, not with a wall of metrics." />
        <h2 className="text-2xl font-semibold text-foreground">{summary.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{summary.detail}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
          <MetricInfo title="Business framing" tooltip="Use this section when you need to explain why the issue matters, not just what the metric is." />
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">This run suggests around <span className="font-semibold text-foreground">{formatMoney(savings.monthlySavings)}</span> in optimization upside.</div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">The largest risk is not a single bad answer. It is the repetition of generic answers across different intents.</div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">This analysis used <span className="font-semibold text-foreground">{result.n_conversations ?? 0}</span> conversations and <span className="font-semibold text-foreground">{result.n_intents ?? 0}</span> intents.</div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
          <MetricInfo title="Recommended next moves" />
          <div className="space-y-3 text-sm text-muted-foreground">
            {recommendations.map((recommendation) => (
              <div key={recommendation} className="rounded-2xl border border-border/70 bg-background/60 p-4">{recommendation}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
