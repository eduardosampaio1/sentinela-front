import { cn } from "@/lib/utils";
import type { EconomicsViewModel } from "@/domain/verdict.types";

const TONE_COLORS = {
  observed: "text-[#22D3EE]",
  derived: "text-[#FCD34D]",
  projected: "text-[#94A3B8]",
  neutral: "text-[#475569]",
};

const TONE_LABELS = {
  observed: "Observed",
  derived: "Derived",
  projected: "Projected",
  neutral: "",
};

interface EconomicsCardProps {
  economics: EconomicsViewModel;
  collapsed?: boolean;
}

export function EconomicsCard({ economics, collapsed = false }: EconomicsCardProps) {
  if (!economics.available) {
    return (
      <div className="card-base p-5">
        <p className="section-label mb-3">Economic impact</p>
        <div className="py-4 text-center">
          <p className="text-sm text-[#475569]">Economic data not available for this run.</p>
          <p className="text-xs text-[#2D3748] mt-1">Add cost and outcome signals to your dataset to enable this view.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-5">
      <p className="section-label mb-4">Economic impact</p>

      {/* Hero metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {economics.hero.map((metric) => (
          <div
            key={metric.id}
            className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] px-3 py-3"
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[#475569] mb-1.5 leading-tight">
              {metric.label}
            </p>
            <p
              className={cn(
                "font-bold leading-none mb-1",
                metric.value === null ? "text-[#2D3748] text-sm" : "text-[#F1F5F9] text-base"
              )}
            >
              {metric.displayValue}
            </p>
            <p className="text-[10px] text-[#2D3748] leading-snug">{metric.supportingText}</p>
          </div>
        ))}
      </div>

      {/* Detail metrics (collapsed by default) */}
      {!collapsed && (
        <div className="space-y-2 border-t border-[rgba(255,255,255,0.05)] pt-4">
          {economics.details
            .filter((m) => m.value !== null)
            .map((metric) => (
              <div
                key={metric.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                      TONE_COLORS[metric.tone],
                      "bg-current opacity-100"
                    )}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: metric.tone === "observed" ? "#22D3EE" : metric.tone === "derived" ? "#FCD34D" : "#94A3B8",
                    }}
                  >
                    {TONE_LABELS[metric.tone]}
                  </span>
                  <p className="text-xs text-[#475569] truncate">{metric.label}</p>
                </div>
                <p className="text-sm font-semibold text-[#94A3B8] flex-shrink-0">{metric.displayValue}</p>
              </div>
            ))}
        </div>
      )}

      {/* Notes */}
      {economics.notes.length > 0 && !collapsed && (
        <div className="mt-4 space-y-0.5">
          {economics.notes.map((note) => (
            <p key={note} className="text-[10px] text-[#2D3748]">{note}</p>
          ))}
        </div>
      )}
    </div>
  );
}
