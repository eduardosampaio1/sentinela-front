import EmptyState from "@/components/dashboard/EmptyState";
import MetricInfo from "@/components/dashboard/MetricInfo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  estimateSavingsOpportunity,
  formatDate,
  formatMoney,
  formatPercent,
  getExecutiveSummary,
  getTopRecommendations,
  getTopUnstableIntents,
} from "@/lib/metrics";
import { Copy, Download } from "lucide-react";
import { useMemo } from "react";

export default function ReportsPage() {
  const { result, dataSource } = useAnalysis();
  const { toast } = useToast();
  const { t } = useLanguage();

  const reportText = useMemo(() => {
    if (!result) return "";
    const summary = getExecutiveSummary(result);
    const savings = estimateSavingsOpportunity(result);
    const weakIntents = getTopUnstableIntents(result.intents, 3);
    const recommendations = getTopRecommendations(result.alerts, 4);

    return [
      "SENTINELA EXECUTIVE SUMMARY",
      `${t("reports.generatedAt")}: ${formatDate(new Date().toISOString())}`,
      "",
      `${t("reports.headlineLabel")}: ${summary.title}`,
      summary.detail,
      "",
      `${t("metrics.consistencyScore")}: ${formatPercent(result.consistency_score)}`,
      `${t("metrics.responseStability")}: ${formatPercent(result.response_stability_score)}`,
      `${t("metrics.crossIntentSimilarity")}: ${formatPercent(result.cross_intent_similarity)}`,
      `Potential savings: ${formatMoney(savings.monthlySavings)} (~${savings.savingPercent}%)`,
      "",
      `${t("reports.topWeakIntents")}:`,
      ...weakIntents.map(
        (intent, index) =>
          `${index + 1}. ${intent.intent} - ${t("metrics.responseStability").toLowerCase()} ${formatPercent(
            intent.response_stability_score ?? intent.consistency_score,
          )}`,
      ),
      "",
      `${t("reports.recommendations")}:`,
      ...recommendations.map((item, index) => `${index + 1}. ${item}`),
    ].join("\n");
  }, [result, t]);

  if (!result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
        <EmptyState />
      </div>
    );
  }

  const summary = getExecutiveSummary(result);
  const savings = estimateSavingsOpportunity(result);
  const recommendations = getTopRecommendations(result.alerts, 4);

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    toast({ title: t("reports.copied") });
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
        </div>
        <Badge variant={dataSource === "fresh" ? "default" : "secondary"} className="text-xs">
          {dataSource === "fresh" ? t("common.fresh") : t("common.cached")}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" size="sm" onClick={copyReport}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> {t("reports.copySummary")}
        </Button>
        <Button variant="outline" size="sm" onClick={downloadJson}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> {t("reports.downloadJson")}
        </Button>
      </div>

      <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
        <MetricInfo title={t("reports.headline")} tooltip={t("reports.headlineTip")} />
        <h2 className="text-2xl font-semibold text-foreground">{summary.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{summary.detail}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
          <MetricInfo title={t("reports.framing")} tooltip={t("reports.framingTip")} />
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              {t("reports.savingsPrefix")} <span className="font-semibold text-foreground">{formatMoney(savings.monthlySavings)}</span> {t("reports.savingsSuffix")}
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">{t("reports.riskBody")}</div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              {t("reports.datasetPrefix")} <span className="font-semibold text-foreground">{result.n_conversations ?? 0}</span> {t("reports.datasetConversations")}{" "}
              <span className="font-semibold text-foreground">{result.n_intents ?? 0}</span> {t("reports.datasetIntents")}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
          <MetricInfo title={t("reports.recommendations")} />
          <div className="space-y-3 text-sm text-muted-foreground">
            {recommendations.map((recommendation) => (
              <div key={recommendation} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                {recommendation}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
