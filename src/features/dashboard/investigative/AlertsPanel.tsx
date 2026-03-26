import { useMemo } from "react";
import { cn, severityOrder } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { EmptyState } from "@/shared/states/EmptyState";
import type { DomainAlert } from "@/domain/analysis.types";

const SEVERITY_STYLES: Record<string, { badge: string; dot: string; rowBg: string }> = {
  critical: {
    badge: "bg-[rgba(248,113,113,0.12)] text-[#F87171] border-[rgba(248,113,113,0.2)]",
    dot: "bg-[#F87171]",
    rowBg: "bg-[rgba(248,113,113,0.03)] border-[rgba(248,113,113,0.08)]",
  },
  high: {
    badge: "bg-[rgba(252,211,77,0.12)] text-[#FCD34D] border-[rgba(252,211,77,0.2)]",
    dot: "bg-[#FCD34D]",
    rowBg: "bg-[rgba(252,211,77,0.02)] border-[rgba(252,211,77,0.08)]",
  },
  warning: {
    badge: "bg-[rgba(251,146,60,0.12)] text-[#FB923C] border-[rgba(251,146,60,0.2)]",
    dot: "bg-[#FB923C]",
    rowBg: "bg-[rgba(251,146,60,0.02)] border-[rgba(251,146,60,0.06)]",
  },
  info: {
    badge: "bg-[rgba(34,211,238,0.12)] text-[#22D3EE] border-[rgba(34,211,238,0.2)]",
    dot: "bg-[#22D3EE]",
    rowBg: "bg-[rgba(34,211,238,0.02)] border-[rgba(34,211,238,0.06)]",
  },
};

function AlertRow({ alert }: { alert: DomainAlert }) {
  const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;

  return (
    <div className={cn("rounded-xl border px-4 py-3.5 space-y-2", style.rowBg)}>
      <div className="flex items-start gap-3">
        {/* Severity indicator */}
        <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", style.dot)} aria-hidden="true" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-[#F1F5F9] leading-tight">{alert.title}</p>
            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border", style.badge)}>
              {alert.severity.toUpperCase()}
            </span>
            {alert.intent && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[#94A3B8]">
                {alert.intent}
              </span>
            )}
          </div>

          {alert.problem && (
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-1.5">{alert.problem}</p>
          )}

          {alert.recommendation && (
            <div className="flex items-start gap-1.5">
              <svg className="w-3 h-3 text-[#34D399] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
              <p className="text-xs text-[#94A3B8]">{alert.recommendation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AlertsPanel() {
  const { result } = useAnalysis();

  const alerts = useMemo(() => {
    if (!result) return [];
    const domain = adaptAnalysisResult(result);
    return [...domain.alerts].sort(
      (a, b) => severityOrder(b.severity) - severityOrder(a.severity)
    );
  }, [result]);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-label">Alerts</p>
          {alerts.length > 0 && (
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {alerts.length} total
              {criticalCount > 0 && ` · ${criticalCount} critical`}
              {highCount > 0 && ` · ${highCount} high`}
            </p>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[rgba(248,113,113,0.12)] text-[#F87171] border border-[rgba(248,113,113,0.2)]">
                {criticalCount} critical
              </span>
            )}
          </div>
        )}
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          title="No alerts detected"
          description="The engine did not generate alerts for this run. System behavior appears within normal parameters."
          size="sm"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
