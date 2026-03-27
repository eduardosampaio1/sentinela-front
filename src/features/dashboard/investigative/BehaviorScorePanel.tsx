import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { adaptAnalysisResult, extractBehaviorScore, extractSemanticDrift } from "@/adapters/analysisAdapter";
import { EmptyState } from "@/shared/states/EmptyState";
import MetricTooltip from "@/components/ui/MetricTooltip";
import { METRIC_TOOLTIPS } from "@/lib/metricTooltips";

function ScoreGauge({ value, label, direction, tooltip }: { value: number | null; label: string; direction: "higher_better" | "lower_better"; tooltip?: string }) {
  const fillPercent = value !== null ? Math.max(0, Math.min(100, value)) : 0;
  const displayFill = direction === "lower_better" ? 100 - fillPercent : fillPercent;

  const color =
    value === null
      ? "#475569"
      : direction === "higher_better"
        ? value >= 70 ? "#34D399" : value >= 45 ? "#FCD34D" : "#F87171"
        : value <= 35 ? "#34D399" : value <= 55 ? "#FCD34D" : "#F87171";

  return (
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r="26"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={2 * Math.PI * 26}
            strokeDashoffset={2 * Math.PI * 26 * (1 - displayFill / 100)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color }}>
            {value !== null ? `${value.toFixed(0)}%` : "—"}
          </span>
        </div>
      </div>
      <p className="flex items-center justify-center gap-1 text-xs text-[#94A3B8]">
        {label}
        {tooltip ? <MetricTooltip text={tooltip} side="bottom" /> : null}
      </p>
    </div>
  );
}

export function BehaviorScorePanel() {
  const { result } = useAnalysis();

  const data = useMemo(() => {
    if (!result) return null;
    const domain = adaptAnalysisResult(result);
    return {
      behaviorScore: domain.behaviorScore,
      semanticDrift: domain.semanticDrift,
      consistencyScore: domain.consistencyScore,
      responseStabilityScore: domain.responseStabilityScore,
      nConversations: domain.nConversations,
      nIntents: domain.nIntents,
    };
  }, [result]);

  if (!data) return null;

  const hasAnyScore = data.behaviorScore !== null || data.semanticDrift !== null;

  return (
    <div className="card-base p-5">
      <p className="section-label mb-4">Behavior analysis</p>

      {!hasAnyScore ? (
        <EmptyState
          title="Behavior data not available"
          description="The engine did not provide behavior score or drift signals for this run."
          size="sm"
        />
      ) : (
        <>
          {/* Score gauges */}
          <div className="flex items-center justify-around gap-4 mb-5">
            <ScoreGauge value={data.behaviorScore} label="Behavior Score" direction="higher_better" tooltip={METRIC_TOOLTIPS.behaviorScore} />
            <ScoreGauge value={data.semanticDrift} label="Semantic Drift" direction="lower_better" tooltip={METRIC_TOOLTIPS.semanticDrift} />
            <ScoreGauge
              value={data.consistencyScore ?? null}
              label="Consistency"
              direction="higher_better"
              tooltip={METRIC_TOOLTIPS.consistency}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[rgba(255,255,255,0.05)] pt-4">
            {[
              { label: "Conversations", value: data.nConversations?.toString() ?? "—", tooltip: undefined },
              { label: "Intents", value: data.nIntents?.toString() ?? "—", tooltip: undefined },
              { label: "Response stability", value: data.responseStabilityScore !== null && data.responseStabilityScore !== undefined ? `${data.responseStabilityScore.toFixed(1)}%` : "—", tooltip: METRIC_TOOLTIPS.responseStability },
              { label: "Consistency score", value: data.consistencyScore !== undefined ? `${data.consistencyScore.toFixed(1)}%` : "—", tooltip: METRIC_TOOLTIPS.consistency },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-0.5">
                  {stat.label}
                  {stat.tooltip ? <MetricTooltip text={stat.tooltip} side="top" /> : null}
                </p>
                <p className="text-sm font-semibold text-[#94A3B8]">{stat.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
