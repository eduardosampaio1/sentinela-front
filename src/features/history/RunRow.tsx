import { cn, formatRelativeTime } from "@/lib/utils";
import type { AnalysisRunSummary } from "@/lib/analysisRuns";
import type { AnalysisResult } from "@/lib/api";

interface RunRowProps {
  run: AnalysisRunSummary;
  onLoad?: (result: AnalysisResult) => void;
}

function RiskBadge({ level }: { level?: string | null }) {
  if (!level) return <span className="text-xs text-[#2D3748]">—</span>;

  const styles: Record<string, string> = {
    CRITICAL: "bg-[rgba(248,113,113,0.12)] text-[#F87171] border-[rgba(248,113,113,0.2)]",
    HIGH: "bg-[rgba(252,211,77,0.12)] text-[#FCD34D] border-[rgba(252,211,77,0.2)]",
    MEDIUM: "bg-[rgba(251,146,60,0.12)] text-[#FB923C] border-[rgba(251,146,60,0.2)]",
    LOW: "bg-[rgba(52,211,153,0.12)] text-[#34D399] border-[rgba(52,211,153,0.2)]",
  };
  const style = styles[level.toUpperCase()] ?? "bg-[rgba(34,211,238,0.12)] text-[#22D3EE] border-[rgba(34,211,238,0.2)]";

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border", style)}>
      {level}
    </span>
  );
}

export function RunRow({ run, onLoad }: RunRowProps) {
  const hasResult = !!run.raw_result;

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-3.5 border-b border-[rgba(255,255,255,0.04)] last:border-b-0 group transition-colors",
        hasResult && "hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
      )}
      onClick={() => {
        if (hasResult && run.raw_result && onLoad) {
          onLoad(run.raw_result as AnalysisResult);
        }
      }}
      role={hasResult ? "button" : undefined}
      tabIndex={hasResult ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasResult && (e.key === "Enter" || e.key === " ") && run.raw_result && onLoad) {
          e.preventDefault();
          onLoad(run.raw_result as AnalysisResult);
        }
      }}
    >
      {/* Date */}
      <div className="w-28 flex-shrink-0">
        <p className="text-xs text-[#94A3B8]">{formatRelativeTime(run.created_at)}</p>
        <p className="text-[10px] text-[#2D3748] mt-0.5">
          {new Date(run.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>

      {/* Risk */}
      <div className="w-24 flex-shrink-0">
        <RiskBadge level={run.risk_level} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <div>
          <p className="text-[10px] text-[#2D3748] uppercase tracking-wide">Conv.</p>
          <p className="text-sm font-medium text-[#475569]">{run.n_conversations ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#2D3748] uppercase tracking-wide">Intents</p>
          <p className="text-sm font-medium text-[#475569]">{run.n_intents ?? "—"}</p>
        </div>
        {run.engine_version && (
          <div className="hidden sm:block">
            <p className="text-[10px] text-[#2D3748] uppercase tracking-wide">Engine</p>
            <p className="text-xs font-mono text-[#2D3748]">{run.engine_version}</p>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        {hasResult ? (
          <div className="flex items-center gap-1.5 text-[#22D3EE] opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-medium">Load</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        ) : (
          <span className="text-[10px] text-[#2D3748]">No data</span>
        )}
      </div>
    </div>
  );
}
