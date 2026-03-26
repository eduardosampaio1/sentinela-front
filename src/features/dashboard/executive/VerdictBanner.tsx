import { cn } from "@/lib/utils";
import type { VerdictModel } from "@/domain/verdict.types";

interface VerdictConfig {
  bg: string;
  border: string;
  text: string;
  badge: string;
  dot: string;
  glow: string;
}

const VERDICT_CONFIG: Record<string, VerdictConfig> = {
  Healthy: {
    bg: "bg-[rgba(52,211,153,0.05)]",
    border: "border-[rgba(52,211,153,0.15)]",
    text: "text-[#34D399]",
    badge: "bg-[rgba(52,211,153,0.12)] border-[rgba(52,211,153,0.2)] text-[#34D399]",
    dot: "bg-[#34D399]",
    glow: "shadow-[0_0_32px_rgba(52,211,153,0.1)]",
  },
  Watch: {
    bg: "bg-[rgba(252,211,77,0.05)]",
    border: "border-[rgba(252,211,77,0.15)]",
    text: "text-[#FCD34D]",
    badge: "bg-[rgba(252,211,77,0.12)] border-[rgba(252,211,77,0.2)] text-[#FCD34D]",
    dot: "bg-[#FCD34D]",
    glow: "shadow-[0_0_32px_rgba(252,211,77,0.1)]",
  },
  Degraded: {
    bg: "bg-[rgba(251,146,60,0.05)]",
    border: "border-[rgba(251,146,60,0.15)]",
    text: "text-[#FB923C]",
    badge: "bg-[rgba(251,146,60,0.12)] border-[rgba(251,146,60,0.2)] text-[#FB923C]",
    dot: "bg-[#FB923C]",
    glow: "shadow-[0_0_32px_rgba(251,146,60,0.1)]",
  },
  Critical: {
    bg: "bg-[rgba(248,113,113,0.06)]",
    border: "border-[rgba(248,113,113,0.2)]",
    text: "text-[#F87171]",
    badge: "bg-[rgba(248,113,113,0.15)] border-[rgba(248,113,113,0.25)] text-[#F87171]",
    dot: "bg-[#F87171]",
    glow: "shadow-[0_0_40px_rgba(248,113,113,0.15)]",
  },
};

interface VerdictBannerProps {
  verdict: VerdictModel;
  analyzedAt?: string;
  runId?: string;
}

export function VerdictBanner({ verdict, analyzedAt, runId }: VerdictBannerProps) {
  const config = VERDICT_CONFIG[verdict.verdict] ?? VERDICT_CONFIG.Watch;

  return (
    <div
      className={cn(
        "rounded-2xl border px-6 py-5 transition-all",
        config.bg,
        config.border,
        config.glow
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="section-label mb-2">System status</p>

          {/* Verdict */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span
                className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", config.dot)}
                aria-hidden="true"
              />
              <h2 className={cn("text-3xl font-bold tracking-tight", config.text)}>
                {verdict.verdict}
              </h2>
            </div>

            {verdict.escalated && (
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border", config.badge)}>
                ESCALATED
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-[#94A3B8] leading-relaxed">{verdict.message}</p>

          {/* Certainty */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-[#94A3B8]">{verdict.certaintyLabel}</span>
            {verdict.score !== null && verdict.score !== undefined && (
              <>
                <span className="text-[#475569]">·</span>
                <span className="text-xs text-[#94A3B8]">
                  Score: <span className={cn("font-semibold", config.text)}>{verdict.score.toFixed(1)}%</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Meta info */}
        {(analyzedAt || runId) && (
          <div className="text-right flex-shrink-0 hidden sm:block">
            {analyzedAt && (
              <p className="text-xs text-[#94A3B8]">
                {new Date(analyzedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {runId && (
              <p className="text-[10px] font-mono text-[#475569] mt-0.5 truncate max-w-[140px]">
                {runId.slice(0, 8)}…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
