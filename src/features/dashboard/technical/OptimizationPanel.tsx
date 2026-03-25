import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { EmptyState } from "@/shared/states/EmptyState";

export function OptimizationPanel() {
  const { result } = useAnalysis();

  const data = useMemo(() => {
    if (!result) return null;
    const domain = adaptAnalysisResult(result);

    // Extract optimization-focused recommendations
    const optimizationRecs = (domain.recommendations ?? []).filter((rec) =>
      /(optim|effic|reduc|improv|cost|waste|verbos|compress|trim|stream)/i.test(
        `${rec.title ?? ""} ${rec.action ?? ""} ${rec.reason ?? ""}`
      )
    );

    // Token waste data
    const tokenWaste = domain.tokenWasteEstimate;
    const tokenWasteCost = domain.businessImpact?.tokenCostWaste;
    const usefulRate = domain.businessImpact?.usefulRate;
    const underrepresentedIntents = domain.underrepresentedIntents ?? [];

    // Coverage stats
    const intentCoverageScore = domain.intentCoverageScore;
    const coveredIntents = domain.coveredIntents;
    const totalIntents = domain.totalIntents;
    const minSamplesPerIntent = domain.minSamplesPerIntent;

    return {
      optimizationRecs,
      tokenWaste,
      tokenWasteCost,
      usefulRate,
      underrepresentedIntents,
      intentCoverageScore,
      coveredIntents,
      totalIntents,
      minSamplesPerIntent,
      hasData:
        optimizationRecs.length > 0 ||
        tokenWaste > 0 ||
        underrepresentedIntents.length > 0 ||
        intentCoverageScore !== null,
    };
  }, [result]);

  if (!data) return null;

  return (
    <div className="card-base p-5">
      <p className="section-label mb-4">Optimization opportunities</p>

      {!data.hasData ? (
        <EmptyState
          title="No optimization signals detected"
          description="The engine did not identify significant optimization opportunities for this run."
          size="sm"
        />
      ) : (
        <div className="space-y-4">
          {/* Token waste */}
          {(data.tokenWaste > 0 || data.tokenWasteCost !== null) && (
            <div className="rounded-xl border border-[rgba(252,211,77,0.1)] bg-[rgba(252,211,77,0.03)] px-4 py-3.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-[#FCD34D]">Token waste detected</p>
                {data.tokenWasteCost !== null && (
                  <p className="text-sm font-bold text-[#FCD34D]">
                    US$ {data.tokenWasteCost.toFixed(2)} wasted
                  </p>
                )}
              </div>
              <p className="text-xs text-[#94A3B8]">
                Estimate: {data.tokenWaste.toFixed(0)} wasteful tokens across this dataset.
                {data.usefulRate !== null && ` Useful rate: ${data.usefulRate?.toFixed(1)}%.`}
              </p>
            </div>
          )}

          {/* Intent coverage */}
          {data.intentCoverageScore !== null && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748]">Dataset coverage</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#22D3EE] opacity-70 rounded-full"
                    style={{
                      width: `${Math.max(2, (data.intentCoverageScore * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-sm font-semibold text-[#94A3B8] flex-shrink-0">
                  {(data.intentCoverageScore * 100).toFixed(1)}% coverage
                </p>
              </div>
              {data.coveredIntents !== null && data.totalIntents !== null && (
                <p className="text-xs text-[#475569]">
                  {data.coveredIntents} of {data.totalIntents} intents adequately covered.
                  {data.minSamplesPerIntent !== null && ` Min samples per intent: ${data.minSamplesPerIntent}.`}
                </p>
              )}
            </div>
          )}

          {/* Underrepresented intents */}
          {data.underrepresentedIntents.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] mb-2">
                Underrepresented intents ({data.underrepresentedIntents.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.underrepresentedIntents.map((intent) => (
                  <span
                    key={intent}
                    className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-[rgba(252,211,77,0.06)] border border-[rgba(252,211,77,0.12)] text-[#FCD34D]"
                  >
                    {intent}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[#475569] mt-2">
                Add more samples for these intents to improve model reliability.
              </p>
            </div>
          )}

          {/* Optimization recommendations */}
          {data.optimizationRecs.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] mb-2">Recommendations</p>
              <div className="space-y-2">
                {data.optimizationRecs.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-b-0">
                    <span className="w-5 h-5 rounded-full bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.12)] flex items-center justify-center text-[10px] font-bold text-[#22D3EE] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#94A3B8]">{rec.title ?? rec.action}</p>
                      {rec.reason && <p className="text-xs text-[#475569] mt-0.5">{rec.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
