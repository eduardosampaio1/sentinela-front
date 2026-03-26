import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { EmptyState } from "@/shared/states/EmptyState";

export function DiagnosticsPanel() {
  const { result } = useAnalysis();

  const data = useMemo(() => {
    if (!result) return null;
    const domain = adaptAnalysisResult(result);
    return {
      issues: domain.issues ?? [],
      executiveSummary: domain.executiveSummary,
      engineVersion: domain.engineVersion,
      analysisId: domain.analysisId,
      analyzedAt: domain.analyzedAt,
      warnings: domain.warnings,
    };
  }, [result]);

  if (!data) return null;

  const hasIssues = data.issues.length > 0;

  return (
    <div className="card-base p-5">
      <p className="section-label mb-4">Diagnostics</p>

      {/* Engine info */}
      <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
        {data.engineVersion && (
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569]">Engine</p>
            <p className="text-xs font-mono text-[#94A3B8]">{data.engineVersion}</p>
          </div>
        )}
        {data.analysisId && (
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569]">Analysis ID</p>
            <p className="text-xs font-mono text-[#94A3B8] truncate max-w-[200px]">
              {data.analysisId.slice(0, 16)}…
            </p>
          </div>
        )}
        {data.analyzedAt && (
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569]">Analyzed at</p>
            <p className="text-xs text-[#94A3B8]">
              {new Date(data.analyzedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}
      </div>

      {/* Executive summary */}
      {data.executiveSummary && (
        <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-2">Executive summary</p>
          <p className="text-sm text-[#94A3B8] leading-relaxed">{data.executiveSummary}</p>
        </div>
      )}

      {/* Issues */}
      {!hasIssues ? (
        <EmptyState
          title="No diagnostic issues detected"
          description="The engine did not report structural or technical issues for this run."
          size="sm"
        />
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569]">
            Engine issues ({data.issues.length})
          </p>
          {data.issues.map((issue, idx) => {
            const severityStyles: Record<string, string> = {
              critical: "border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.04)]",
              high: "border-[rgba(252,211,77,0.15)] bg-[rgba(252,211,77,0.04)]",
              medium: "border-[rgba(251,146,60,0.1)] bg-[rgba(251,146,60,0.03)]",
              low: "border-[rgba(52,211,153,0.1)] bg-[rgba(52,211,153,0.03)]",
            };
            const style = severityStyles[issue.severity?.toLowerCase() ?? ""] ?? "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]";

            return (
              <div key={issue.issueId ?? idx} className={cn("rounded-xl border px-4 py-3 space-y-1", style)}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#F1F5F9]">
                    {issue.title ?? issue.issueType ?? `Issue ${idx + 1}`}
                  </p>
                  {issue.severity && (
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase">{issue.severity}</span>
                  )}
                  {issue.category && (
                    <span className="text-[10px] text-[#475569] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
                      {issue.category}
                    </span>
                  )}
                </div>
                {issue.summary && (
                  <p className="text-xs text-[#94A3B8]">{issue.summary}</p>
                )}
                {issue.recommendation && (
                  <p className="text-xs text-[#94A3B8] mt-1">
                    <span className="font-medium text-[#22D3EE]">Action: </span>
                    {issue.recommendation}
                  </p>
                )}
                {issue.confidence !== undefined && (
                  <p className="text-xs text-[#475569]">Confidence: {(issue.confidence * 100).toFixed(0)}%</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#FCD34D]">Engine warnings</p>
          {data.warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-[#FCD34D] mt-1.5 flex-shrink-0" aria-hidden="true" />
              <p className="text-xs text-[#94A3B8]">{warning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
