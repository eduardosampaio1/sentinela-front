import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { getInterpretation, interpretAnalysis } from "@/lib/api";
import { LoadingState } from "@/shared/states/LoadingState";
import { ErrorState } from "@/shared/states/ErrorState";
import { Button } from "@/components/ui/button";
import type { AnalysisInterpretation } from "@/lib/api";

type PollingState = "idle" | "polling" | "completed" | "failed";

function InterpretationContent({ interpretation }: { interpretation: AnalysisInterpretation }) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Executive diagnosis */}
      {interpretation.executive_diagnosis && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-2">Executive diagnosis</p>
          <p className="text-sm text-[#94A3B8] leading-relaxed">{interpretation.executive_diagnosis}</p>
        </div>
      )}

      {/* Summary */}
      {interpretation.summary && interpretation.summary !== interpretation.executive_diagnosis && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-2">Summary</p>
          <p className="text-sm text-[#94A3B8] leading-relaxed">{interpretation.summary}</p>
        </div>
      )}

      {/* Main risks */}
      {interpretation.main_risks && interpretation.main_risks.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-2">Key risks</p>
          <div className="space-y-2">
            {interpretation.main_risks.map((risk, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-[#F1F5F9]">{risk.title}</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border",
                    risk.severity === "critical" ? "bg-[rgba(248,113,113,0.12)] text-[#F87171] border-[rgba(248,113,113,0.2)]" :
                    risk.severity === "high" ? "bg-[rgba(252,211,77,0.12)] text-[#FCD34D] border-[rgba(252,211,77,0.2)]" :
                    "bg-[rgba(79,90,232,0.08)] text-[#4F5AE8] border-[rgba(79,90,232,0.15)]"
                  )}>
                    {risk.severity}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8]">{risk.evidence}</p>
                {risk.impact && (
                  <p className="text-xs text-[#94A3B8] mt-1">Impact: {risk.impact}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Systemic pattern */}
      {interpretation.systemic_pattern && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-2">Systemic pattern</p>
          <p className="text-sm text-[#94A3B8] leading-relaxed">{interpretation.systemic_pattern}</p>
        </div>
      )}

      {/* Priority actions */}
      {interpretation.priority_actions && interpretation.priority_actions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-2">Priority actions</p>
          <div className="space-y-2">
            {interpretation.priority_actions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[rgba(79,90,232,0.08)] border border-[rgba(79,90,232,0.12)] flex items-center justify-center text-[10px] font-bold text-[#4F5AE8] flex-shrink-0 mt-0.5">
                  {action.priority ?? idx + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-[#94A3B8]">{action.action}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{action.reason}</p>
                  {action.expected_effect && (
                    <p className="text-xs text-[#34D399] mt-0.5">Expected: {action.expected_effect}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategic recommendation */}
      {interpretation.strategic_recommendation && (
        <div className="rounded-xl border border-[rgba(79,90,232,0.1)] bg-[rgba(79,90,232,0.04)] px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#4F5AE8] mb-2">Strategic recommendation</p>
          <p className="text-sm text-[#94A3B8] leading-relaxed">{interpretation.strategic_recommendation}</p>
        </div>
      )}

      {/* Confidence notes */}
      {interpretation.confidence_notes && (
        <p className="text-xs text-[#475569] italic">{interpretation.confidence_notes}</p>
      )}
    </div>
  );
}

export function AIInterpretationPanel() {
  const { result } = useAnalysis();
  const [status, setStatus] = useState<PollingState>("idle");
  const [interpretation, setInterpretation] = useState<AnalysisInterpretation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);

  const runId = result?.analysis_run_id ?? null;

  const startInterpretation = useCallback(async () => {
    if (!result || !runId) return;
    setStatus("polling");
    setError(null);

    try {
      const response = await interpretAnalysis(
        result,
        result.workspace_id ?? null,
        result.project_id ?? null,
        result.environment_id ?? null,
      );
      if (response.report) {
        setInterpretation(response.report);
        setStatus("completed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Interpretation request failed.");
      setStatus("failed");
    }
  }, [result, runId]);

  // Check for cached interpretation on mount
  useEffect(() => {
    if (!runId || status !== "idle") return;

    getInterpretation(runId)
      .then((res) => {
        if (res.found && res.report && res.status === "completed") {
          setInterpretation(res.report);
          setStatus("completed");
        }
      })
      .catch(() => {
        // Silently fail — user can request manually
      });
  }, [runId, status]);

  // Poll if running
  useEffect(() => {
    if (status !== "polling" || !runId || pollAttempts > 10) return;

    const timeout = window.setTimeout(async () => {
      try {
        const res = await getInterpretation(runId);
        if (res.status === "completed" && res.report) {
          setInterpretation(res.report);
          setStatus("completed");
        } else if (res.status === "failed") {
          setError(res.error ?? "Interpretation failed.");
          setStatus("failed");
        } else {
          setPollAttempts((prev) => prev + 1);
        }
      } catch {
        setPollAttempts((prev) => prev + 1);
      }
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [status, runId, pollAttempts]);

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-label">AI interpretation</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">Natural language analysis generated by AI</p>
        </div>

        {status === "idle" && runId && (
          <Button
            size="sm"
            onClick={startInterpretation}
            className="rounded-xl bg-[rgba(79,90,232,0.12)] text-[#4F5AE8] border border-[rgba(79,90,232,0.2)] hover:bg-[rgba(79,90,232,0.18)] text-xs"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            Generate interpretation
          </Button>
        )}

        {status === "completed" && (
          <Button
            size="sm"
            onClick={startInterpretation}
            variant="ghost"
            className="rounded-xl text-[#94A3B8] hover:text-[#94A3B8] text-xs"
          >
            Regenerate
          </Button>
        )}
      </div>

      {/* Content states */}
      {status === "idle" && !interpretation && (
        <div className="py-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-[rgba(79,90,232,0.06)] border border-[rgba(79,90,232,0.1)] flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-[#4F5AE8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <p className="text-sm text-[#94A3B8]">
            {runId
              ? "Request an AI-generated interpretation of this analysis."
              : "Save an analysis run to enable AI interpretation."}
          </p>
        </div>
      )}

      {status === "polling" && (
        <LoadingState
          message="Generating AI interpretation"
          description="This may take up to 30 seconds. The engine is analyzing your data."
          className="py-8"
        />
      )}

      {status === "failed" && (
        <ErrorState
          title="Interpretation failed"
          message={error ?? "The AI interpretation service returned an error. Try again."}
          onRetry={startInterpretation}
          size="sm"
        />
      )}

      {(status === "completed" || interpretation) && interpretation && (
        <InterpretationContent interpretation={interpretation} />
      )}
    </div>
  );
}
