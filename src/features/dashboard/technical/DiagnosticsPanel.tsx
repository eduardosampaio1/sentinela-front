import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAnalysis } from "@/hooks/useAnalysis";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { EmptyState } from "@/shared/states/EmptyState";
import type { DomainIssue } from "@/domain/analysis.types";

// ─── Severity styles ─────────────────────────────────────────────────────────

const SEV_STYLES: Record<string, { border: string; bg: string; badge: string; dot: string }> = {
  critical: {
    border: "border-[rgba(248,113,113,0.2)]",
    bg:     "bg-[rgba(248,113,113,0.04)]",
    badge:  "bg-[rgba(248,113,113,0.12)] text-[#F87171] border-[rgba(248,113,113,0.25)]",
    dot:    "bg-[#F87171]",
  },
  high: {
    border: "border-[rgba(251,146,60,0.2)]",
    bg:     "bg-[rgba(251,146,60,0.04)]",
    badge:  "bg-[rgba(251,146,60,0.12)] text-[#FB923C] border-[rgba(251,146,60,0.25)]",
    dot:    "bg-[#FB923C]",
  },
  medium: {
    border: "border-[rgba(252,211,77,0.2)]",
    bg:     "bg-[rgba(252,211,77,0.04)]",
    badge:  "bg-[rgba(252,211,77,0.12)] text-[#FCD34D] border-[rgba(252,211,77,0.25)]",
    dot:    "bg-[#FCD34D]",
  },
  low: {
    border: "border-[rgba(52,211,153,0.15)]",
    bg:     "bg-[rgba(52,211,153,0.03)]",
    badge:  "bg-[rgba(52,211,153,0.12)] text-[#34D399] border-[rgba(52,211,153,0.2)]",
    dot:    "bg-[#34D399]",
  },
};

function sevStyle(severity?: string) {
  return SEV_STYLES[severity?.toLowerCase() ?? ""] ?? {
    border: "border-[rgba(255,255,255,0.08)]",
    bg:     "bg-[rgba(255,255,255,0.02)]",
    badge:  "bg-[rgba(255,255,255,0.06)] text-[#94A3B8] border-[rgba(255,255,255,0.1)]",
    dot:    "bg-[#475569]",
  };
}

// ─── Evidence display ─────────────────────────────────────────────────────────

/** Format a raw evidence value to something readable. */
function fmtEvidence(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    // percentage-like
    if (val >= 0 && val <= 1) return `${(val * 100).toFixed(1)}%`;
    if (Number.isInteger(val)) return String(val);
    return val.toFixed(3);
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "string") return val.slice(0, 60);
  return "—";
}

/** Pick the most relevant evidence keys to show (skip large objects / arrays). */
function pickEvidenceEntries(evidence: Record<string, unknown>): [string, unknown][] {
  return Object.entries(evidence)
    .filter(([, v]) =>
      typeof v === "number" ||
      typeof v === "boolean" ||
      (typeof v === "string" && v.length < 80)
    )
    .slice(0, 5);
}

function labelFromKey(key: string): string {
  return key
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Issue card ───────────────────────────────────────────────────────────────

function IssueCard({ issue, index }: { issue: DomainIssue; index: number }) {
  const styles = sevStyle(issue.severity);
  const evidenceEntries = issue.evidence ? pickEvidenceEntries(issue.evidence) : [];

  return (
    <div className={cn("rounded-xl border px-5 py-4 space-y-3", styles.border, styles.bg)}>

      {/* ── Header row ── */}
      <div className="flex items-start gap-3">
        {/* Severity dot */}
        <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", styles.dot)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#F1F5F9]">
              {issue.title ?? `Issue ${index + 1}`}
            </p>
            {issue.severity && (
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border",
                styles.badge
              )}>
                {issue.severity.toUpperCase()}
              </span>
            )}
            {issue.category && (
              <span className="text-[10px] text-[#475569] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
                {issue.category}
              </span>
            )}
            {issue.confidence !== undefined && (
              <span className="text-[10px] text-[#475569] ml-auto flex-shrink-0">
                {(issue.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>

          {/* Metric trigger */}
          {issue.metric && (
            <p className="text-[10px] text-[#475569] mt-0.5">
              Triggered by: <span className="font-mono text-[#94A3B8]">{issue.metric}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Summary / description ── */}
      {issue.summary && (
        <p className="text-sm text-[#94A3B8] leading-relaxed pl-5">
          {issue.summary}
        </p>
      )}

      {/* ── Evidence metrics ── */}
      {evidenceEntries.length > 0 && (
        <div className="pl-5">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-1.5">
            Evidence
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {evidenceEntries.map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#475569]">{labelFromKey(key)}</span>
                <span className="text-[10px] font-semibold text-[#4F5AE8] font-mono">
                  {fmtEvidence(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Affected intents ── */}
      {issue.relatedIntents && issue.relatedIntents.length > 0 && (
        <div className="pl-5">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-1.5">
            Affected intents
          </p>
          <div className="flex flex-wrap gap-1.5">
            {issue.relatedIntents.slice(0, 6).map((intent) => (
              <span
                key={intent}
                className="text-[10px] font-mono text-[#94A3B8] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded"
              >
                {intent}
              </span>
            ))}
            {issue.relatedIntents.length > 6 && (
              <span className="text-[10px] text-[#475569]">
                +{issue.relatedIntents.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Recommended actions ── */}
      {(issue.recommendedActions && issue.recommendedActions.length > 0) ? (
        <div className="pl-5 pt-1 border-t border-[rgba(255,255,255,0.04)]">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#4F5AE8] mb-1.5">
            Recommended actions
          </p>
          <ul className="space-y-1">
            {issue.recommendedActions.slice(0, 3).map((action, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#4F5AE8] text-[10px] font-bold mt-0.5 flex-shrink-0">
                  {i + 1}.
                </span>
                <p className="text-xs text-[#94A3B8]">{action}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : issue.recommendation ? (
        <div className="pl-5 pt-1 border-t border-[rgba(255,255,255,0.04)]">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#4F5AE8] mb-1">
            Action
          </p>
          <p className="text-xs text-[#94A3B8]">{issue.recommendation}</p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

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

      {/* ── Engine meta ── */}
      <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
        {data.engineVersion && (
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569]">Engine</p>
            <p className="text-xs font-mono text-[#94A3B8]">{data.engineVersion}</p>
          </div>
        )}
        {data.analysisId && (
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569]">Analysis ID</p>
            <p
              className="text-xs font-mono text-[#94A3B8] truncate max-w-[280px]"
              title={data.analysisId}
            >
              {data.analysisId}
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

      {/* ── Executive summary ── */}
      {data.executiveSummary && (
        <div className="mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#475569] mb-2">
            Executive summary
          </p>
          <p className="text-sm text-[#94A3B8] leading-relaxed">{data.executiveSummary}</p>
        </div>
      )}

      {/* ── Issues ── */}
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
          {data.issues.map((issue, idx) => (
            <IssueCard
              key={issue.issueId ?? idx}
              issue={issue}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* ── Engine warnings ── */}
      {data.warnings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#FCD34D]">
            Engine warnings
          </p>
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
