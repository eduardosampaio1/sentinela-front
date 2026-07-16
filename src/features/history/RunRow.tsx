import { useNavigate } from "react-router-dom";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AnalysisRunSummary } from "@/lib/analysisRuns";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractBehaviorScore(raw: Record<string, unknown> | null | undefined): number | null {
  if (!raw) return null;

  // Try common field paths from the API schema
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

// ─── Status badge — Sprint 5 ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; styles: string }> = {
  completed:  { label: "Completed",  styles: "bg-[rgba(52,211,153,0.08)] text-[#34D399] border-[rgba(52,211,153,0.15)]" },
  analyzing:  { label: "Analyzing",  styles: "bg-[rgba(167,139,250,0.08)] text-[#A78BFA] border-[rgba(167,139,250,0.15)]" },
  embedding:  { label: "Embedding",  styles: "bg-[rgba(79,90,232,0.08)] text-[#4F5AE8] border-[rgba(79,90,232,0.15)]" },
  finalizing: { label: "Finalizing", styles: "bg-[rgba(74,222,128,0.06)] text-[#4ADE80] border-[rgba(74,222,128,0.12)]" },
  processing: { label: "Processing", styles: "bg-[rgba(79,90,232,0.08)] text-[#4F5AE8] border-[rgba(79,90,232,0.15)]" },
  queued:     { label: "Queued",     styles: "bg-[rgba(148,163,184,0.08)] text-[#94A3B8] border-[rgba(148,163,184,0.15)]" },
  failed:     { label: "Failed",     styles: "bg-[rgba(248,113,113,0.08)] text-[#F87171] border-[rgba(248,113,113,0.15)]" },
};

function StatusBadge({ status }: { status?: string | null }) {
  const key = (status ?? "completed").toLowerCase();
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.completed;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border", cfg.styles)}>
      {cfg.label}
    </span>
  );
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level?: string | null }) {
  if (!level) return <span className="text-xs text-[#475569]">—</span>;

  const upper = level.toUpperCase();
  const styles: Record<string, string> = {
    CRITICAL: "bg-[rgba(248,113,113,0.10)] text-[#F87171] border-[rgba(248,113,113,0.18)]",
    HIGH:     "bg-[rgba(252,211,77,0.10)] text-[#FCD34D] border-[rgba(252,211,77,0.18)]",
    MEDIUM:   "bg-[rgba(251,146,60,0.10)] text-[#FB923C] border-[rgba(251,146,60,0.18)]",
    LOW:      "bg-[rgba(52,211,153,0.10)] text-[#34D399] border-[rgba(52,211,153,0.18)]",
  };
  const style = styles[upper] ?? "bg-[rgba(79,90,232,0.10)] text-[#4F5AE8] border-[rgba(79,90,232,0.18)]";

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border", style)}>
      {level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Score pill ───────────────────────────────────────────────────────────────

function ScorePill({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-xs text-[#475569]">—</span>;
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
      style={{ background: scoreBg(score) }}
    >
      <div
        className="w-4 h-1 rounded-full overflow-hidden bg-[rgba(255,255,255,0.06)]"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: scoreColor(score) }}
        />
      </div>
      <span className="text-[11px] font-semibold" style={{ color: scoreColor(score) }}>
        {score}
      </span>
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function CompareCheckbox({ checked, disabled }: { checked: boolean; disabled: boolean }) {
  return (
    <div
      className={cn(
        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all",
        checked
          ? "bg-[rgba(79,90,232,0.15)] border-[#4F5AE8]"
          : "bg-transparent border-[rgba(255,255,255,0.14)]",
        disabled && "opacity-40"
      )}
      aria-hidden="true"
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-[#4F5AE8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

// ─── RunRow ───────────────────────────────────────────────────────────────────

interface RunRowProps {
  run: AnalysisRunSummary;
  compareMode?: boolean;
  selected?: boolean;
  /** True when 2 runs are already selected and this is not one of them — dims and disables the row */
  compareDimmed?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function RunRow({ run, compareMode = false, selected = false, compareDimmed = false, onToggleSelect }: RunRowProps) {
  const navigate = useNavigate();
  const hasResult = !!run.raw_result;
  const behaviorScore = extractBehaviorScore(run.raw_result);

  const dateFormatted = new Date(run.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Dimmed when the parent signals 2 are already selected and this isn't one
  const dimmed = compareDimmed;

  function handleClick() {
    if (compareMode) {
      if (dimmed) return; // already 2 selected, this row is not one of them
      onToggleSelect?.(run.id);
    } else {
      navigate(`/dashboard/history/${run.id}`);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-4 border-b border-[rgba(255,255,255,0.04)] last:border-b-0 transition-all cursor-pointer hover:bg-[rgba(255,255,255,0.02)] group",
        !hasResult && !compareMode && "opacity-60",
        // Compare mode selection styles
        compareMode && selected && "bg-[rgba(79,90,232,0.04)] border-l-2 border-l-[#4F5AE8]",
        compareMode && dimmed && "opacity-40 pointer-events-none",
      )}
      onClick={handleClick}
      role={compareMode ? "checkbox" : "button"}
      aria-checked={compareMode ? selected : undefined}
      tabIndex={dimmed ? -1 : 0}
      aria-label={
        compareMode
          ? `${selected ? "Deselect" : "Select"} run from ${dateFormatted} for comparison`
          : `View analysis run from ${dateFormatted}`
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Checkbox (compare mode only) */}
      {compareMode && (
        <div className="flex-shrink-0">
          <CompareCheckbox checked={selected} disabled={dimmed} />
        </div>
      )}

      {/* Date / time */}
      <div className="w-32 flex-shrink-0">
        <p className="text-sm font-medium text-[#94A3B8] leading-tight">{dateFormatted}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-[#475569]">{formatRelativeTime(run.created_at)}</p>
          <StatusBadge status={run.status ?? "completed"} />
        </div>
      </div>

      {/* Risk level */}
      <div className="w-24 flex-shrink-0">
        <RiskBadge level={run.risk_level} />
      </div>

      {/* Behavior score */}
      <div className="w-20 flex-shrink-0">
        <ScorePill score={behaviorScore} />
      </div>

      {/* Conversation stats */}
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <div>
          <p className="text-[10px] text-[#475569] uppercase tracking-widest font-semibold">
            Convs
          </p>
          <p className="text-sm font-medium text-[#94A3B8]">
            {run.n_conversations ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#475569] uppercase tracking-widest font-semibold">
            Intents
          </p>
          <p className="text-sm font-medium text-[#94A3B8]">
            {run.n_intents ?? "—"}
          </p>
        </div>
        {run.engine_version && (
          <div className="hidden md:block">
            <p className="text-[10px] text-[#475569] uppercase tracking-widest font-semibold">
              Engine
            </p>
            <p className="text-xs font-mono text-[#475569]">{run.engine_version}</p>
          </div>
        )}
      </div>

      {/* CTA — hidden in compare mode */}
      {!compareMode && (
        <div className="w-16 flex-shrink-0 flex justify-end">
          <div className="flex items-center gap-1.5 text-[#94A3B8] group-hover:text-[#4F5AE8] transition-colors">
            <span className="text-xs font-medium">{hasResult ? "View" : "Details"}</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      )}

      {/* Compare mode: show selected indicator instead */}
      {compareMode && (
        <div className="w-16 flex-shrink-0 flex justify-end">
          {selected && (
            <span className="text-[11px] font-semibold text-[#4F5AE8]">Selected</span>
          )}
        </div>
      )}
    </div>
  );
}
