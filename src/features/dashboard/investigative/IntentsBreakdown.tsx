import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { EmptyState } from "@/shared/states/EmptyState";
import type { DomainIntentScore } from "@/domain/analysis.types";

function scoreColor(score: number): string {
  if (score >= 70) return "text-[#34D399]";
  if (score >= 45) return "text-[#FCD34D]";
  return "text-[#F87171]";
}

function scoreBarColor(score: number): string {
  if (score >= 70) return "bg-[#34D399]";
  if (score >= 45) return "bg-[#FCD34D]";
  return "bg-[#F87171]";
}

function severityBadge(severity?: string) {
  if (!severity) return null;
  const lower = severity.toLowerCase();
  const styles: Record<string, string> = {
    critical: "bg-[rgba(248,113,113,0.12)] text-[#F87171] border-[rgba(248,113,113,0.2)]",
    high: "bg-[rgba(252,211,77,0.12)] text-[#FCD34D] border-[rgba(252,211,77,0.2)]",
    medium: "bg-[rgba(251,146,60,0.12)] text-[#FB923C] border-[rgba(251,146,60,0.2)]",
    low: "bg-[rgba(52,211,153,0.12)] text-[#34D399] border-[rgba(52,211,153,0.2)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border",
        styles[lower] ?? styles.low
      )}
    >
      {severity}
    </span>
  );
}

function IntentRow({ intent }: { intent: DomainIntentScore }) {
  const displayScore =
    intent.score >= 0 && intent.score <= 1 ? intent.score * 100 : intent.score;
  const normalizedScore = Math.max(0, Math.min(100, displayScore));

  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-b-0">
      {/* Intent name */}
      <div className="flex items-center gap-2 min-w-0 w-36 flex-shrink-0">
        <p className="text-sm text-[#94A3B8] truncate">{intent.intent}</p>
        {severityBadge(intent.severity)}
      </div>

      {/* Score bar */}
      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", scoreBarColor(normalizedScore))}
            style={{ width: `${Math.max(2, normalizedScore)}%`, opacity: 0.7 }}
          />
        </div>
        <span className={cn("text-sm font-semibold w-12 text-right flex-shrink-0", scoreColor(normalizedScore))}>
          {normalizedScore.toFixed(1)}%
        </span>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
        {intent.nConversations !== undefined && (
          <div className="text-right">
            <p className="text-xs text-[#2D3748]">Conv.</p>
            <p className="text-xs font-medium text-[#475569]">{intent.nConversations}</p>
          </div>
        )}
        {intent.responseVariance !== undefined && (
          <div className="text-right">
            <p className="text-xs text-[#2D3748]">Variance</p>
            <p className="text-xs font-medium text-[#475569]">
              {intent.responseVariance.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function IntentsBreakdown() {
  const { result } = useAnalysis();

  const intents = useMemo(() => {
    if (!result) return [];
    const domain = adaptAnalysisResult(result);
    if (!domain.intents?.length) return [];
    return [...domain.intents].sort((a, b) => {
      const scoreA = a.score >= 0 && a.score <= 1 ? a.score * 100 : a.score;
      const scoreB = b.score >= 0 && b.score <= 1 ? b.score * 100 : b.score;
      return scoreA - scoreB; // worst first
    });
  }, [result]);

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-label">Intents breakdown</p>
          {intents.length > 0 && (
            <p className="text-xs text-[#475569] mt-0.5">{intents.length} intents analyzed</p>
          )}
        </div>
      </div>

      {intents.length === 0 ? (
        <EmptyState
          title="No intent data available"
          description="The engine did not provide per-intent scores for this run. Ensure your dataset includes intent labels."
          size="sm"
        />
      ) : (
        <div>
          {/* Header */}
          <div className="flex items-center gap-4 pb-2 border-b border-[rgba(255,255,255,0.06)] mb-1">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] w-36 flex-shrink-0">Intent</p>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] flex-1">Score</p>
            <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] w-12 text-right">Conv.</p>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] w-14 text-right">Variance</p>
            </div>
          </div>

          {intents.map((intent) => (
            <IntentRow key={intent.intent} intent={intent} />
          ))}
        </div>
      )}
    </div>
  );
}
