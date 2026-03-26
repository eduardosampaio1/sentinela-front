import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { EmptyState } from "@/shared/states/EmptyState";

export function DriftPanel() {
  const { result } = useAnalysis();

  const data = useMemo(() => {
    if (!result) return null;
    const domain = adaptAnalysisResult(result);
    const signals = domain.signals ?? {};
    const semantic = signals.semantic ?? {};

    return {
      semanticDrift: domain.semanticDrift,
      crossIntentSimilarity: domain.crossIntentSimilarity,
      signals: Object.entries(semantic).map(([key, value]) => ({
        key,
        value: typeof value === "number" ? value : null,
        label: key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    };
  }, [result]);

  if (!data) return null;

  const hasDriftData = data.semanticDrift !== null || data.signals.length > 0;

  const driftLevel =
    data.semanticDrift === null
      ? "unknown"
      : data.semanticDrift > 55
        ? "high"
        : data.semanticDrift > 35
          ? "medium"
          : "low";

  const driftConfig = {
    high: { text: "text-[#F87171]", label: "High drift — system regressing vs baseline", bg: "bg-[rgba(248,113,113,0.06)] border-[rgba(248,113,113,0.12)]" },
    medium: { text: "text-[#FCD34D]", label: "Moderate drift — monitor trend closely", bg: "bg-[rgba(252,211,77,0.06)] border-[rgba(252,211,77,0.12)]" },
    low: { text: "text-[#34D399]", label: "Drift controlled — within safe operating range", bg: "bg-[rgba(52,211,153,0.05)] border-[rgba(52,211,153,0.1)]" },
    unknown: { text: "text-[#475569]", label: "Drift data not available for this run", bg: "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]" },
  }[driftLevel];

  return (
    <div className="card-base p-5">
      <p className="section-label mb-4">Semantic drift</p>

      {!hasDriftData ? (
        <EmptyState
          title="Drift data not available"
          description="The engine did not provide semantic drift signals for this run."
          size="sm"
        />
      ) : (
        <>
          {/* Primary metric */}
          <div className={cn("rounded-xl border px-4 py-3.5 mb-4", driftConfig.bg)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#475569] mb-1">Semantic drift magnitude</p>
                <p className={cn("text-3xl font-bold", driftConfig.text)}>
                  {data.semanticDrift !== null ? `${data.semanticDrift.toFixed(1)}%` : "N/A"}
                </p>
              </div>
              <div className="text-right">
                <p className={cn("text-xs font-medium", driftConfig.text)}>{driftConfig.label}</p>
              </div>
            </div>
          </div>

          {/* Cross-intent similarity */}
          {data.crossIntentSimilarity !== undefined && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs text-[#475569]">Cross-intent similarity</p>
              <p className="text-sm font-semibold text-[#94A3B8]">
                {data.crossIntentSimilarity.toFixed(1)}%
              </p>
            </div>
          )}

          {/* Signal breakdown */}
          {data.signals.length > 0 && (
            <div className="space-y-2 border-t border-[rgba(255,255,255,0.05)] pt-3">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] mb-2">Signal breakdown</p>
              {data.signals.map((signal) => {
                const pct = signal.value !== null
                  ? (signal.value >= 0 && signal.value <= 1 ? signal.value * 100 : signal.value)
                  : null;
                return (
                  <div key={signal.key} className="flex items-center gap-3">
                    <p className="text-xs text-[#475569] w-36 flex-shrink-0 truncate">{signal.label}</p>
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#22D3EE] opacity-60"
                        style={{ width: pct !== null ? `${Math.max(2, pct)}%` : "2%" }}
                      />
                    </div>
                    <p className="text-xs text-[#475569] w-12 text-right flex-shrink-0">
                      {pct !== null ? `${pct.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
