import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { EmptyState } from "@/shared/states/EmptyState";
import { ErrorState } from "@/shared/states/ErrorState";
import { SkeletonHistoryTable } from "@/shared/states/SkeletonState";
import { useAuth } from "@/hooks/useAuth";
import { listAnalysisRuns } from "@/lib/analysisRuns";
import type { AnalysisRunSummary } from "@/lib/analysisRuns";
import { cn } from "@/lib/utils";
import { RunRow } from "./RunRow";

// ─── Filter types ─────────────────────────────────────────────────────────────

type RiskFilter = "all" | "critical" | "high" | "medium" | "low";
type ScoreFilter = "all" | "high" | "good" | "moderate" | "poor";

function extractScore(raw: Record<string, unknown> | null | undefined): number | null {
  if (!raw) return null;
  const candidates = [
    raw.behavior_score,
    raw.consistency_score,
    (raw.argos_v2 as Record<string, unknown> | null)?.behavior_score,
    (raw.argos_v2 as Record<string, unknown> | null)?.consistency_score,
  ];
  for (const v of candidates) {
    if (typeof v === "number" && v >= 0 && v <= 100) return Math.round(v);
  }
  return null;
}

function matchesRisk(run: AnalysisRunSummary, filter: RiskFilter): boolean {
  if (filter === "all") return true;
  return run.risk_level?.toLowerCase() === filter;
}

function matchesScore(run: AnalysisRunSummary, filter: ScoreFilter): boolean {
  if (filter === "all") return true;
  const score = extractScore(run.raw_result);
  if (score === null) return false;
  switch (filter) {
    case "high":     return score >= 80;
    case "good":     return score >= 60 && score < 80;
    case "moderate": return score >= 40 && score < 60;
    case "poor":     return score < 40;
  }
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterChip<T extends string>({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
        active
          ? "bg-[rgba(34,211,238,0.10)] text-[#22D3EE] border-[rgba(34,211,238,0.20)]"
          : "bg-transparent text-[#94A3B8] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:text-[#94A3B8]"
      )}
      style={active && color ? { color, background: `${color}18`, borderColor: `${color}35` } : undefined}
    >
      {label}
    </button>
  );
}

interface FilterBarProps {
  riskFilter: RiskFilter;
  scoreFilter: ScoreFilter;
  onRiskChange: (v: RiskFilter) => void;
  onScoreChange: (v: ScoreFilter) => void;
  totalCount: number;
  filteredCount: number;
}

function FilterBar({ riskFilter, scoreFilter, onRiskChange, onScoreChange, totalCount, filteredCount }: FilterBarProps) {
  const isFiltered = riskFilter !== "all" || scoreFilter !== "all";

  return (
    <div className="flex items-center gap-4 flex-wrap mb-4">
      {/* Risk filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] mr-1">Risk</span>
        {(["all", "critical", "high", "medium", "low"] as RiskFilter[]).map((v) => {
          const riskColors: Record<string, string> = {
            critical: "#F87171",
            high: "#FCD34D",
            medium: "#FB923C",
            low: "#34D399",
          };
          return (
            <FilterChip
              key={v}
              label={v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
              active={riskFilter === v}
              onClick={() => onRiskChange(v)}
              color={riskColors[v]}
            />
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-[rgba(255,255,255,0.06)] hidden sm:block" />

      {/* Score filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] mr-1">Score</span>
        {([
          { v: "all" as ScoreFilter, label: "All" },
          { v: "high" as ScoreFilter,     label: "≥80", color: "#34D399" },
          { v: "good" as ScoreFilter,     label: "60–79", color: "#FCD34D" },
          { v: "moderate" as ScoreFilter, label: "40–59", color: "#FB923C" },
          { v: "poor" as ScoreFilter,     label: "<40",   color: "#F87171" },
        ]).map(({ v, label, color }) => (
          <FilterChip
            key={v}
            label={label}
            active={scoreFilter === v}
            onClick={() => onScoreChange(v)}
            color={color}
          />
        ))}
      </div>

      {/* Result count + clear */}
      {isFiltered && (
        <>
          <div className="w-px h-4 bg-[rgba(255,255,255,0.06)] hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#94A3B8]">
              {filteredCount} of {totalCount}
            </span>
            <button
              onClick={() => { onRiskChange("all"); onScoreChange("all"); }}
              className="text-[11px] text-[#475569] hover:text-[#94A3B8] transition-colors"
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Table header ─────────────────────────────────────────────────────────────

function TableHeader() {
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
      <div className="w-32 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">Date</p>
      </div>
      <div className="w-24 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">Risk</p>
      </div>
      <div className="w-20 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">Score</p>
      </div>
      <div className="flex items-center gap-5 flex-1">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">Conversations</p>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">Intents</p>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] hidden md:block">Engine</p>
      </div>
      <div className="w-16 flex-shrink-0" />
    </div>
  );
}

// ─── HistoryPage ──────────────────────────────────────────────────────────────

export function HistoryPage() {
  const { workspace, project, environment } = useAuth();
  const navigate = useNavigate();

  const [runs, setRuns] = useState<AnalysisRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");

  const noContext = !workspace?.id || !project?.id || !environment?.id;

  const fetchRuns = useCallback(() => {
    if (noContext) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    listAnalysisRuns(workspace!.id, project!.id, environment!.id, 50)
      .then(setRuns)
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Analysis history could not be retrieved. Check your connection and try again."
        );
      })
      .finally(() => setLoading(false));
  }, [workspace?.id, project?.id, environment?.id, noContext]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Reset filters when runs change
  useEffect(() => {
    setRiskFilter("all");
    setScoreFilter("all");
  }, [workspace?.id, project?.id, environment?.id]);

  const filteredRuns = useMemo(() => {
    return runs.filter(
      (r) => matchesRisk(r, riskFilter) && matchesScore(r, scoreFilter)
    );
  }, [runs, riskFilter, scoreFilter]);

  const hasActiveFilters = riskFilter !== "all" || scoreFilter !== "all";

  return (
    <AppShell topBarTitle="History">
      <PageFrame maxWidth="2xl">
        <PageHeader
          title="Analysis history"
          description={
            noContext
              ? "Select an active workspace, project, and environment to view runs."
              : `Showing up to 50 runs · ${workspace?.name ?? ""} · ${project?.name ?? ""} · ${environment?.name ?? ""}`
          }
          actions={
            !noContext && (
              <button
                onClick={fetchRuns}
                className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#94A3B8] transition-colors"
                aria-label="Refresh history"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </button>
            )
          }
        />

        {/* No workspace context */}
        {noContext && (
          <EmptyState
            title="Workspace context required"
            description="History is scoped to a workspace, project, and environment. Configure your active context in Workspaces to see past analysis runs."
            action={{
              label: "Configure workspaces",
              onClick: () => navigate("/workspaces"),
            }}
          />
        )}

        {/* Loading — skeleton table */}
        {!noContext && loading && <SkeletonHistoryTable rows={6} />}

        {/* Error */}
        {!noContext && !loading && error && (
          <ErrorState
            title="History could not be loaded"
            message={error}
            onRetry={fetchRuns}
          />
        )}

        {/* No runs yet */}
        {!noContext && !loading && !error && runs.length === 0 && (
          <EmptyState
            title="No analysis runs yet"
            description={`No analyses have been recorded for ${project?.name ?? "this project"} in the ${environment?.name ?? "current"} environment. Run your first analysis from the Launchpad to start building a history.`}
            action={{
              label: "Run first analysis",
              onClick: () => navigate("/home"),
            }}
            secondaryAction={{
              label: "Switch context",
              onClick: () => navigate("/workspaces"),
            }}
          />
        )}

        {/* Table + filters */}
        {!noContext && !loading && !error && runs.length > 0 && (
          <>
            <FilterBar
              riskFilter={riskFilter}
              scoreFilter={scoreFilter}
              onRiskChange={setRiskFilter}
              onScoreChange={setScoreFilter}
              totalCount={runs.length}
              filteredCount={filteredRuns.length}
            />

            <div className="card-base overflow-hidden">
              <TableHeader />

              {filteredRuns.length > 0 ? (
                filteredRuns.map((run) => <RunRow key={run.id} run={run} />)
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-[#94A3B8]">No runs match the selected filters.</p>
                  <button
                    onClick={() => { setRiskFilter("all"); setScoreFilter("all"); }}
                    className="text-xs text-[#22D3EE] mt-2 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </PageFrame>
    </AppShell>
  );
}
