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
  const style = styles[upper] ?? "bg-[rgba(34,211,238,0.10)] text-[#22D3EE] border-[rgba(34,211,238,0.18)]";

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

// ─── RunRow ───────────────────────────────────────────────────────────────────

interface RunRowProps {
  run: AnalysisRunSummary;
}

export function RunRow({ run }: RunRowProps) {
  const navigate = useNavigate();
  const hasResult = !!run.raw_result;
  const behaviorScore = extractBehaviorScore(run.raw_result);

  const dateFormatted = new Date(run.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function handleClick() {
    navigate(`/dashboard/history/${run.id}`);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-4 border-b border-[rgba(255,255,255,0.04)] last:border-b-0 transition-colors cursor-pointer hover:bg-[rgba(255,255,255,0.02)] group",
        !hasResult && "opacity-60"
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`View analysis run from ${dateFormatted}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Date / time */}
      <div className="w-32 flex-shrink-0">
        <p className="text-sm font-medium text-[#94A3B8] leading-tight">{dateFormatted}</p>
        <p className="text-[11px] text-[#475569] mt-0.5">{formatRelativeTime(run.created_at)}</p>
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

      {/* CTA */}
      <div className="w-16 flex-shrink-0 flex justify-end">
        <div className="flex items-center gap-1.5 text-[#94A3B8] group-hover:text-[#22D3EE] transition-colors">
          <span className="text-xs font-medium">{hasResult ? "View" : "Details"}</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
