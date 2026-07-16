import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/shared/states/LoadingState";
import { ErrorState } from "@/shared/states/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";
import { getAnalysisRunById } from "@/lib/analysisRuns";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AnalysisRunSummary } from "@/lib/analysisRuns";
import type { DomainAnalysis } from "@/domain/analysis.types";
import type { AnalysisResult } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "#34D399";
  if (score >= 60) return "#FCD34D";
  if (score >= 40) return "#FB923C";
  return "#F87171";
}

function scoreBg(score: number): string {
  if (score >= 80) return "rgba(52,211,153,0.08)";
  if (score >= 60) return "rgba(252,211,77,0.08)";
  if (score >= 40) return "rgba(251,146,60,0.08)";
  return "rgba(248,113,113,0.08)";
}

function riskStyle(level?: string | null) {
  switch (level?.toUpperCase()) {
    case "CRITICAL": return { color: "#F87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.18)" };
    case "HIGH":     return { color: "#FCD34D", bg: "rgba(252,211,77,0.10)",  border: "rgba(252,211,77,0.18)" };
    case "MEDIUM":   return { color: "#FB923C", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.18)" };
    case "LOW":      return { color: "#34D399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.18)" };
    default:         return { color: "#4F5AE8", bg: "rgba(79,90,232,0.10)",  border: "rgba(79,90,232,0.18)" };
  }
}

// ─── Metric tile ──────────────────────────────────────────────────────────────

function MetricTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card-base p-4 flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">{label}</p>
      <div className="text-xl font-bold text-[#F1F5F9] leading-tight">{value}</div>
      {sub && <p className="text-xs text-[#94A3B8]">{sub}</p>}
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = scoreColor(score);
  const bg = scoreBg(score);
  const circumference = 2 * Math.PI * 20;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16" style={{ background: bg, borderRadius: "50%" }}>
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3.5" />
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-sm font-bold"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <p className="text-[11px] text-[#94A3B8] text-center">{label}</p>
    </div>
  );
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: DomainAnalysis["alerts"][number] }) {
  const severityColor: Record<string, string> = {
    critical: "#F87171",
    high: "#FCD34D",
    medium: "#FB923C",
    low: "#34D399",
    info: "#4F5AE8",
  };
  const color = severityColor[alert.severity?.toLowerCase() ?? "info"] ?? "#4F5AE8";

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-b-0">
      <span
        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
        style={{ background: color }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#94A3B8]">{alert.title}</p>
        {alert.problem && alert.problem !== alert.title && (
          <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{alert.problem}</p>
        )}
        {alert.recommendation && (
          <p className="text-xs text-[#475569] mt-1 leading-relaxed">
            <span className="text-[#4F5AE8] font-medium">Action: </span>{alert.recommendation}
          </p>
        )}
      </div>
      {alert.severity && (
        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full border flex-shrink-0"
          style={{ color, background: `${color}18`, borderColor: `${color}30` }}>
          {alert.severity}
        </span>
      )}
    </div>
  );
}

// ─── Recommendation row ───────────────────────────────────────────────────────

function RecommendationRow({ rec, index }: { rec: DomainAnalysis["recommendations"][number]; index: number }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-b-0">
      <span className="w-5 h-5 rounded-full bg-[rgba(79,90,232,0.08)] border border-[rgba(79,90,232,0.12)] flex items-center justify-center text-[10px] font-bold text-[#4F5AE8] flex-shrink-0 mt-0.5">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#94A3B8]">{rec.title ?? rec.action}</p>
        {rec.reason && (
          <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{rec.reason}</p>
        )}
        {rec.expectedImpact && (
          <p className="text-xs text-[#475569] mt-1">
            <span className="text-[#34D399] font-medium">Expected: </span>{rec.expectedImpact}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── RunDetailPage ────────────────────────────────────────────────────────────

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { workspace, project, environment } = useAuth();
  const { loadStoredAnalysis } = useAnalysis();
  const navigate = useNavigate();

  const [run, setRun] = useState<AnalysisRunSummary | null>(null);
  const [domain, setDomain] = useState<DomainAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError("No run ID provided."); setLoading(false); return; }

    setLoading(true);
    setError(null);

    getAnalysisRunById(id, {
      workspaceId: workspace?.id,
      projectId: project?.id,
      environmentId: environment?.id,
    })
      .then((data) => {
        if (!data) {
          setError("This analysis run could not be found. It may have been deleted or belong to a different workspace context.");
          return;
        }
        setRun(data);
        if (data.raw_result) {
          try {
            setDomain(adaptAnalysisResult(data.raw_result as AnalysisResult));
          } catch {
            // Adapter failed — show metadata only, no domain data
          }
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load this analysis run. Check your connection and try again.");
      })
      .finally(() => setLoading(false));
  }, [id, workspace?.id, project?.id, environment?.id]);

  function handleRestore() {
    if (run?.raw_result) {
      loadStoredAnalysis(run.raw_result as AnalysisResult);
      navigate("/dashboard");
    }
  }

  const dateFormatted = run
    ? new Date(run.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  const timeFormatted = run
    ? new Date(run.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  const risk = riskStyle(run?.risk_level);

  return (
    <AppShell topBarTitle="Run detail">
      <PageFrame maxWidth="2xl">

        {/* ── Back link ── */}
        <div className="mb-6">
          <Link
            to="/dashboard/history"
            className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#94A3B8] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to history
          </Link>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <LoadingState
            message="Loading analysis run"
            description="Retrieving run data and results…"
            className="py-20"
          />
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <ErrorState
            title="Run could not be loaded"
            message={error}
            hint="Your other analysis runs and workspace data are unaffected."
            onRetry={() => window.location.reload()}
            onDismiss={() => navigate("/dashboard/history")}
          />
        )}

        {/* ── Content ── */}
        {!loading && !error && run && (
          <div className="space-y-6">

            {/* Header row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-lg font-bold text-[#F1F5F9]">
                    {dateFormatted}
                  </h1>
                  {run.risk_level && (
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                      style={{ color: risk.color, background: risk.bg, borderColor: risk.border }}
                    >
                      {run.risk_level.charAt(0).toUpperCase() + run.risk_level.slice(1).toLowerCase()} risk
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <p className="text-sm text-[#94A3B8]">{timeFormatted}</p>
                  {run.engine_version && (
                    <span className="text-xs font-mono text-[#475569] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded">
                      {run.engine_version}
                    </span>
                  )}
                  <span className="text-xs text-[#1A2540] font-mono">{run.id.slice(0, 16)}…</span>
                </div>
              </div>

              {run.raw_result && (
                <Button
                  onClick={handleRestore}
                  className="rounded-xl bg-[#4F5AE8] text-[#070C18] font-semibold hover:bg-[#67E8F9] flex-shrink-0"
                >
                  Restore to dashboard
                </Button>
              )}
            </div>

            {/* Executive summary */}
            {domain?.executiveSummary && (
              <div className="card-base p-5">
                <p className="section-label mb-3">Executive summary</p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{domain.executiveSummary}</p>
              </div>
            )}

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricTile
                label="Conversations"
                value={run.n_conversations ?? "—"}
                sub="analyzed in this run"
              />
              <MetricTile
                label="Intents"
                value={run.n_intents ?? "—"}
                sub="distinct intent types"
              />
              <MetricTile
                label="Critical alerts"
                value={
                  <span style={{ color: (domain?.criticalAlertsCount ?? 0) > 0 ? "#F87171" : "#34D399" }}>
                    {domain?.criticalAlertsCount ?? 0}
                  </span>
                }
                sub="requiring attention"
              />
              <MetricTile
                label="Recommendations"
                value={domain?.recommendations?.length ?? "—"}
                sub="action items"
              />
            </div>

            {/* Score rings */}
            {domain && (
              (() => {
                const rings: Array<{ score: number; label: string }> = [];
                if (domain.behaviorScore !== null && domain.behaviorScore !== undefined)
                  rings.push({ score: domain.behaviorScore, label: "Behavior" });
                if (domain.aiHealthScore !== null && domain.aiHealthScore !== undefined)
                  rings.push({ score: domain.aiHealthScore, label: "AI Health" });
                if (domain.globalConfidence !== null && domain.globalConfidence !== undefined)
                  rings.push({ score: domain.globalConfidence, label: "Confidence" });
                if (domain.semanticDrift !== null && domain.semanticDrift !== undefined)
                  rings.push({ score: domain.semanticDrift, label: "Semantic drift" });

                if (rings.length === 0) return null;

                return (
                  <div className="card-base p-5">
                    <p className="section-label mb-4">Scores</p>
                    <div className="flex items-start gap-8 flex-wrap">
                      {rings.map((r) => <ScoreRing key={r.label} {...r} />)}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Business impact */}
            {domain?.businessImpact && (
              (() => {
                const bi = domain.businessImpact;
                const tiles = [
                  { label: "Cost / useful outcome", value: bi.costPerUsefulOutcome !== null && bi.costPerUsefulOutcome !== undefined ? `$${bi.costPerUsefulOutcome.toFixed(4)}` : null },
                  { label: "Useful outcome rate", value: bi.usefulRate !== null && bi.usefulRate !== undefined ? `${bi.usefulRate.toFixed(1)}%` : null },
                  { label: "Useful outcomes", value: bi.usefulOutcomes ?? null },
                  { label: "Conversion risk", value: bi.conversionRisk !== null && bi.conversionRisk !== undefined ? `${bi.conversionRisk.toFixed(1)}%` : null },
                ].filter((t) => t.value !== null);

                if (tiles.length === 0) return null;

                return (
                  <div className="card-base p-5">
                    <p className="section-label mb-4">Business impact</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {tiles.map((t) => (
                        <div key={t.label} className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">{t.label}</p>
                          <p className="text-base font-bold text-[#F1F5F9]">{String(t.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Two-column: alerts + recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Alerts */}
              {domain && domain.alerts.length > 0 && (
                <div className="card-base overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <p className="section-label">Alerts</p>
                    <span className="text-xs text-[#94A3B8]">{domain.alerts.length} total</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {domain.alerts.slice(0, 20).map((alert) => (
                      <AlertRow key={alert.id} alert={alert} />
                    ))}
                    {domain.alerts.length > 20 && (
                      <p className="text-xs text-[#475569] text-center py-3">
                        +{domain.alerts.length - 20} more alerts — restore to dashboard to see all
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {domain && domain.recommendations.length > 0 && (
                <div className="card-base overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <p className="section-label">Recommendations</p>
                    <span className="text-xs text-[#94A3B8]">{domain.recommendations.length} actions</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {domain.recommendations.slice(0, 10).map((rec, i) => (
                      <RecommendationRow key={i} rec={rec} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* No domain data but run exists */}
            {!domain && run.raw_result === null && (
              <div className="card-base p-6 text-center">
                <p className="text-sm text-[#94A3B8]">
                  This run was recorded without result data — it may have been a partial or failed analysis.
                </p>
              </div>
            )}

            {/* Bottom restore CTA */}
            {run.raw_result && (
              <div className="flex justify-center pt-2 pb-6">
                <Button
                  onClick={handleRestore}
                  variant="outline"
                  className="rounded-xl border-[rgba(79,90,232,0.25)] text-[#4F5AE8] hover:bg-[rgba(79,90,232,0.08)] hover:text-[#4F5AE8]"
                >
                  Restore this analysis to the dashboard
                </Button>
              </div>
            )}

          </div>
        )}
      </PageFrame>
    </AppShell>
  );
}
