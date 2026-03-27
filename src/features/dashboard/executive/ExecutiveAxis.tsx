import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { buildDecisionViewModel } from "@/adapters/decisionAdapter";
import { VerdictBanner } from "./VerdictBanner";
import { RiskCard } from "./RiskCard";
import { RecommendationCard } from "./RecommendationCard";
import { EconomicsCard } from "./EconomicsCard";
import { ConfidenceCard } from "./ConfidenceCard";
import { TopRecommendationHero } from "./TopRecommendationHero";
import type { CoreMetricViewModel } from "@/domain/verdict.types";

const TONE_COLORS = {
  safe: "text-[#34D399]",
  watch: "text-[#FCD34D]",
  risk: "text-[#F87171]",
  neutral: "text-[#94A3B8]",
};

function CoreMetricCard({ metric }: { metric: CoreMetricViewModel }) {
  return (
    <div className="card-base p-4 flex flex-col gap-2">
      <p className="section-label leading-none">{metric.label}</p>
      <p
        className={cn(
          "text-2xl font-bold tracking-tight leading-none",
          metric.missing ? "text-[#475569]" : TONE_COLORS[metric.tone]
        )}
      >
        {metric.displayValue}
      </p>
      <div className="flex items-center gap-1.5">
        <span
          className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", {
            "bg-[#34D399]": metric.tone === "safe",
            "bg-[#FCD34D]": metric.tone === "watch",
            "bg-[#F87171]": metric.tone === "risk",
            "bg-[#94A3B8]": metric.tone === "neutral",
          })}
          aria-hidden="true"
        />
        <p className={cn("text-xs", TONE_COLORS[metric.tone])}>{metric.operationalNote}</p>
      </div>
    </div>
  );
}

interface ExecutiveAxisProps {
  className?: string;
}

export function ExecutiveAxis({ className }: ExecutiveAxisProps) {
  const { result } = useAnalysis();

  const viewModel = useMemo(() => {
    if (!result) return null;
    const domain = adaptAnalysisResult(result);
    return buildDecisionViewModel(domain);
  }, [result]);

  if (!viewModel) return null;

  const { verdict, topRisk, recommendation, economics, confidence, coreMetrics, sprint4 } = viewModel;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Verdict Banner - full width */}
      <VerdictBanner
        verdict={verdict}
        analyzedAt={result?.analyzed_at}
        runId={result?.analysis_run_id ?? result?.analysis_id}
      />

      {/* Core metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {coreMetrics.map((metric) => (
          <CoreMetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Risk + Recommendation row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskCard risk={topRisk} />
        <RecommendationCard recommendation={recommendation} />
      </div>

      {/* Sprint 4: Structured recommendation hero */}
      {sprint4.top && (
        <TopRecommendationHero sprint4={sprint4} />
      )}

      {/* Economics + Confidence row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EconomicsCard economics={economics} collapsed />
        <ConfidenceCard confidence={confidence} />
      </div>
    </div>
  );
}
