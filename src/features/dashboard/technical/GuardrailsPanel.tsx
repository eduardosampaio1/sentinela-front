import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { EmptyState } from "@/shared/states/EmptyState";

export function GuardrailsPanel() {
  const { result } = useAnalysis();

  const data = useMemo(() => {
    if (!result) return null;
    const domain = adaptAnalysisResult(result);

    // Extract guardrail/compliance-related issues
    const guardrailIssues = (domain.issues ?? []).filter((issue) =>
      /(guardrail|compliance|safety|policy|restrict|block|moderat|contain|harm|prohibit)/i.test(
        `${issue.title ?? ""} ${issue.category ?? ""} ${issue.issueType ?? ""}`
      )
    );

    // Extract compliance-related alerts
    const complianceAlerts = domain.alerts.filter((alert) =>
      /(guardrail|compliance|safety|policy|contain|harm)/i.test(
        `${alert.title} ${alert.problem}`
      )
    );

    // Structural compliance signals from the engine
    const signals = domain.signals ?? {};
    const structural = signals.structural ?? {};
    const guardrailSignals = Object.entries(structural).filter(([key]) =>
      /(guardrail|compliance|contain|safety)/i.test(key)
    );

    return {
      guardrailIssues,
      complianceAlerts,
      guardrailSignals,
      hasData: guardrailIssues.length > 0 || complianceAlerts.length > 0 || guardrailSignals.length > 0,
    };
  }, [result]);

  if (!data) return null;

  return (
    <div className="card-base p-5">
      <p className="section-label mb-4">Guardrails & compliance</p>

      {!data.hasData ? (
        <EmptyState
          title="No guardrail signals detected"
          description="The engine did not detect safety, compliance, or containment issues in this run."
          size="sm"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Guardrail signals */}
          {data.guardrailSignals.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] mb-2">Engine signals</p>
              <div className="space-y-1.5">
                {data.guardrailSignals.map(([key, value]) => {
                  const pct = typeof value === "number"
                    ? (value >= 0 && value <= 1 ? value * 100 : value)
                    : null;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <p className="text-xs text-[#475569] w-40 flex-shrink-0 capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#22D3EE] opacity-60"
                          style={{ width: pct !== null ? `${Math.max(2, pct)}%` : "2%" }}
                        />
                      </div>
                      <p className="text-xs text-[#475569] w-12 text-right">
                        {pct !== null ? `${pct.toFixed(1)}%` : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guardrail issues */}
          {data.guardrailIssues.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] mb-2">Issues</p>
              <div className="space-y-2">
                {data.guardrailIssues.map((issue, idx) => (
                  <div key={idx} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                    <p className="text-sm font-semibold text-[#F1F5F9]">{issue.title}</p>
                    {issue.summary && <p className="text-xs text-[#94A3B8] mt-1">{issue.summary}</p>}
                    {issue.recommendation && (
                      <p className="text-xs text-[#475569] mt-1">
                        <span className="text-[#22D3EE]">Action: </span>
                        {issue.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance alerts */}
          {data.complianceAlerts.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748] mb-2">Alerts</p>
              <div className="space-y-2">
                {data.complianceAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-[rgba(252,211,77,0.1)] bg-[rgba(252,211,77,0.03)] px-4 py-3">
                    <p className="text-sm font-semibold text-[#F1F5F9]">{alert.title}</p>
                    {alert.problem && <p className="text-xs text-[#94A3B8] mt-1">{alert.problem}</p>}
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
