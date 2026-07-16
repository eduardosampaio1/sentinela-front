// ============================================================
// PotentialSavingsCard — Sprint 3: ROI Engine
// Primary economic element: shows potential savings opportunity
// ============================================================

import { cn } from "@/lib/utils";
import type { PotentialSavingsViewModel, SavingsDriver } from "@/domain/verdict.types";

// ── Confidence badge ──────────────────────────────────────────────────────────

const CONFIDENCE_STYLES: Record<string, string> = {
  high:   "text-[#4ADE80] bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.15)]",
  medium: "text-[#FCD34D] bg-[rgba(252,211,77,0.08)] border-[rgba(252,211,77,0.15)]",
  low:    "text-[#94A3B8] bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.15)]",
};

function ConfidenceBadge({ level, label }: { level: string; label: string }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
        CONFIDENCE_STYLES[level] ?? CONFIDENCE_STYLES.low
      )}
    >
      {label}
    </span>
  );
}

// ── Cost comparison row ───────────────────────────────────────────────────────

function CostRow({
  label,
  value,
  accent,
  large,
}: {
  label: string;
  value: string;
  accent?: "savings" | "current" | "optimized";
  large?: boolean;
}) {
  const valueColor =
    accent === "savings"
      ? "text-[#4ADE80]"
      : accent === "current"
      ? "text-[#F1F5F9]"
      : "text-[#4F5AE8]";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2",
        large && "py-3"
      )}
    >
      <span className={cn("text-xs text-[#94A3B8]", large && "text-sm font-medium text-[#F1F5F9]")}>
        {label}
      </span>
      <span
        className={cn(
          "font-bold tabular-nums",
          large ? "text-2xl" : "text-sm",
          valueColor
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Savings driver row ────────────────────────────────────────────────────────

function DriverRow({ driver }: { driver: SavingsDriver }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#FCD34D] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-xs font-medium text-[#F1F5F9]">{driver.label}</span>
          <span className="text-xs font-semibold text-[#FCD34D] tabular-nums flex-shrink-0">
            {driver.displayValue}
          </span>
        </div>
        <p className="text-[11px] text-[#475569] leading-snug">{driver.description}</p>
        {driver.recommendationHint && (
          <p className="text-[10px] text-[#4F5AE8] mt-0.5 leading-snug">
            → {driver.recommendationHint}
          </p>
        )}
      </div>
    </div>
  );
}

// ── No savings state ──────────────────────────────────────────────────────────

function NoSavingsState() {
  return (
    <div className="py-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.1)] flex items-center justify-center mx-auto mb-3">
        <svg className="w-5 h-5 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-[#4ADE80] mb-1">
        No significant savings opportunity detected
      </p>
      <p className="text-xs text-[#475569] max-w-xs mx-auto leading-relaxed">
        Based on current data, your AI system is operating efficiently. Run with more data for a more precise assessment.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface PotentialSavingsCardProps {
  savings: PotentialSavingsViewModel;
}

export function PotentialSavingsCard({ savings }: PotentialSavingsCardProps) {
  if (!savings.available) {
    return (
      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">Potential savings</p>
        </div>
        <NoSavingsState />
        <p className="text-[10px] text-[#2D3748] mt-4">
          Add cost and outcome signals to your dataset to enable savings estimation.
        </p>
      </div>
    );
  }

  const rangeText =
    savings.avoidedCostRange
      ? `US$ ${savings.avoidedCostRange.min.toFixed(2)} – US$ ${savings.avoidedCostRange.max.toFixed(2)}`
      : null;

  return (
    <div className="card-base p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="section-label mb-1">Potential savings</p>
          <p className="text-xs text-[#475569]">
            Based on inefficiencies detected in your AI system
          </p>
        </div>
        <ConfidenceBadge level={savings.confidence} label={savings.confidenceLabel} />
      </div>

      {/* Main savings hero */}
      <div className="rounded-2xl bg-[rgba(74,222,128,0.04)] border border-[rgba(74,222,128,0.10)] px-4 py-4 mb-4">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#4ADE80] mb-1">
          Estimated potential saving / run
        </p>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-extrabold text-[#4ADE80] tabular-nums leading-none">
            {savings.displayAvoidedCost}
          </span>
          {savings.savingsPercent !== null && (
            <span className="text-sm font-semibold text-[#4ADE80] opacity-70 pb-1">
              ({savings.savingsPercent}% reduction)
            </span>
          )}
        </div>
        {rangeText && (
          <p className="text-[10px] text-[#4ADE80] opacity-50 mt-1">
            Estimated range: {rangeText}
          </p>
        )}
      </div>

      {/* Cost comparison */}
      <div className="rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] px-4 py-1 mb-4">
        <CostRow label="Current (observed)" value={savings.displayCurrentCost} accent="current" />
        <div className="h-px bg-[rgba(255,255,255,0.05)]" />
        <CostRow label="Optimized (estimated)" value={savings.displayOptimizedCost} accent="optimized" />
        <div className="h-px bg-[rgba(74,222,128,0.15)]" />
        <CostRow label="Potential savings" value={savings.displayAvoidedCost} accent="savings" large />
      </div>

      {/* Drivers breakdown */}
      {savings.drivers.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] mb-2">
            Cost drivers
          </p>
          <div className="rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] px-3 py-1">
            {savings.drivers.map((d) => (
              <DriverRow key={d.id} driver={d} />
            ))}
          </div>
        </div>
      )}

      {/* Low data warning */}
      {savings.lowDataWarning && (
        <div className="rounded-xl bg-[rgba(252,211,77,0.06)] border border-[rgba(252,211,77,0.12)] px-3 py-2 mb-3 flex items-start gap-2">
          <svg className="w-3.5 h-3.5 text-[#FCD34D] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-[11px] text-[#FCD34D] leading-snug">{savings.lowDataWarning}</p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-[#2D3748] leading-snug">
        ⚠ {savings.disclaimer} Model version: {savings.modelVersion}.
      </p>
    </div>
  );
}
