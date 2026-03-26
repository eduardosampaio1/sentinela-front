import { cn } from "@/lib/utils";
import type { RiskModel } from "@/domain/verdict.types";

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  critical: {
    bg: "bg-[rgba(248,113,113,0.08)]",
    border: "border-[rgba(248,113,113,0.15)]",
    text: "text-[#F87171]",
    label: "Critical",
  },
  high: {
    bg: "bg-[rgba(252,211,77,0.06)]",
    border: "border-[rgba(252,211,77,0.12)]",
    text: "text-[#FCD34D]",
    label: "High",
  },
  medium: {
    bg: "bg-[rgba(251,146,60,0.06)]",
    border: "border-[rgba(251,146,60,0.12)]",
    text: "text-[#FB923C]",
    label: "Medium",
  },
  low: {
    bg: "bg-[rgba(52,211,153,0.05)]",
    border: "border-[rgba(52,211,153,0.12)]",
    text: "text-[#34D399]",
    label: "Low",
  },
};

interface RiskCardProps {
  risk: RiskModel | null;
}

export function RiskCard({ risk }: RiskCardProps) {
  if (!risk) {
    return (
      <div className="card-base p-5">
        <p className="section-label mb-3">Dominant risk</p>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-9 h-9 rounded-xl bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.12)] flex items-center justify-center mb-3">
            <svg className="w-4.5 h-4.5 text-[#34D399]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#34D399]">No dominant risk detected</p>
          <p className="text-xs text-[#475569] mt-1">System appears to be within safe operating range.</p>
        </div>
      </div>
    );
  }

  const config = SEVERITY_CONFIG[risk.severity] ?? SEVERITY_CONFIG.medium;

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Dominant risk</p>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border",
            config.bg,
            config.border,
            config.text
          )}
        >
          {config.label}
        </span>
      </div>

      <h3 className="text-base font-semibold text-[#F1F5F9] mb-2 leading-snug">{risk.title}</h3>

      <div className="space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-[#2D3748] mb-1">Evidence</p>
          <p className="text-sm text-[#94A3B8] leading-relaxed">{risk.evidence}</p>
        </div>

        <div className={cn("rounded-xl px-3 py-2.5 border", config.bg, config.border)}>
          <p className="text-[11px] uppercase tracking-wide font-semibold mb-1 opacity-70" style={{ color: "inherit" }}>Impact</p>
          <p className={cn("text-sm font-medium", config.text)}>{risk.impact}</p>
        </div>
      </div>
    </div>
  );
}
