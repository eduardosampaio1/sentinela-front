// ============================================================
// TopRecommendationHero — Sprint 4: Recommendation Engine
// "Do this first — and here's the impact."
// ============================================================

import { cn } from "@/lib/utils";
import type { Sprint4ViewModel, StructuredRecommendation } from "@/domain/verdict.types";

// ── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  COST_OPTIMIZATION: {
    label: "Cost Optimization",
    color: "text-[#4ADE80]",
    bg: "bg-[rgba(74,222,128,0.08)]",
    border: "border-[rgba(74,222,128,0.15)]",
  },
  REDUCE_HANDOFF: {
    label: "Reduce Handoff",
    color: "text-[#4F5AE8]",
    bg: "bg-[rgba(79,90,232,0.08)]",
    border: "border-[rgba(79,90,232,0.15)]",
  },
  PROMPT_FIX: {
    label: "Prompt Fix",
    color: "text-[#A78BFA]",
    bg: "bg-[rgba(167,139,250,0.08)]",
    border: "border-[rgba(167,139,250,0.15)]",
  },
  INTENT_RESTRUCTURE: {
    label: "Intent Restructure",
    color: "text-[#FCD34D]",
    bg: "bg-[rgba(252,211,77,0.08)]",
    border: "border-[rgba(252,211,77,0.15)]",
  },
  CONSISTENCY_FIX: {
    label: "Consistency Fix",
    color: "text-[#94A3B8]",
    bg: "bg-[rgba(148,163,184,0.08)]",
    border: "border-[rgba(148,163,184,0.15)]",
  },
};

const RISK_REDUCTION_CONFIG = {
  high:   { label: "High risk reduction", dot: "bg-[#4ADE80]", text: "text-[#4ADE80]" },
  medium: { label: "Medium risk reduction", dot: "bg-[#FCD34D]", text: "text-[#FCD34D]" },
  low:    { label: "Low risk reduction", dot: "bg-[#475569]", text: "text-[#475569]" },
};

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.CONSISTENCY_FIX;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
        cfg.color, cfg.bg, cfg.border
      )}
    >
      {cfg.label}
    </span>
  );
}

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? "#4ADE80" : value >= 0.4 ? "#FCD34D" : "#475569";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// ── Evidence chips ────────────────────────────────────────────────────────────

function EvidenceChips({ rec }: { rec: StructuredRecommendation }) {
  const chips: { label: string; value: string }[] = [];
  if (rec.evidence.usefulRate !== undefined) {
    chips.push({ label: "Useful rate", value: `${(rec.evidence.usefulRate * 100).toFixed(1)}%` });
  }
  if (rec.evidence.actualHandoffs !== undefined) {
    chips.push({ label: "Handoffs", value: String(rec.evidence.actualHandoffs) });
  }
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2.5 py-1"
        >
          <span className="text-[10px] text-[#475569]">{chip.label}</span>
          <span className="text-[10px] font-semibold text-[#94A3B8]">{chip.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Top recommendation card ───────────────────────────────────────────────────

function TopCard({ rec }: { rec: StructuredRecommendation }) {
  const riskCfg = RISK_REDUCTION_CONFIG[rec.impact.riskReduction] ?? RISK_REDUCTION_CONFIG.low;
  const hasSavings = rec.impact.estimatedSavings !== null && rec.impact.estimatedSavings > 0.001;

  return (
    <div className="card-base p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-5 h-5 rounded-full bg-[rgba(79,90,232,0.12)] border border-[rgba(79,90,232,0.2)] flex items-center justify-center text-[10px] font-bold text-[#4F5AE8] flex-shrink-0">
            1
          </span>
          <CategoryBadge category={rec.actionCategory} />
        </div>
        {hasSavings && (
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#4ADE80] opacity-70">
              Est. savings
            </p>
            <p className="text-lg font-extrabold text-[#4ADE80] tabular-nums leading-none">
              US$ {rec.impact.estimatedSavings!.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Title / Problem */}
      <div>
        <h3 className="text-sm font-semibold text-[#F1F5F9] leading-snug mb-1">
          {rec.title}
        </h3>
        {rec.problem !== rec.title && (
          <p className="text-xs text-[#475569] leading-relaxed">{rec.problem}</p>
        )}
      </div>

      {/* Impact row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", riskCfg.dot)} />
          <span className={cn("text-xs font-medium", riskCfg.text)}>{riskCfg.label}</span>
        </div>
        <span className="text-[10px] text-[#2D3748]">·</span>
        <span className="text-xs text-[#475569]">
          Impact type: <span className="text-[#94A3B8] font-medium">{rec.impact.type}</span>
        </span>
      </div>

      {/* Evidence chips */}
      <EvidenceChips rec={rec} />

      {/* Action */}
      <div className="rounded-xl bg-[rgba(79,90,232,0.04)] border border-[rgba(79,90,232,0.08)] px-4 py-3 space-y-2">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#4F5AE8]">
          Recommended action
        </p>
        <p className="text-xs font-medium text-[#F1F5F9] leading-snug">{rec.action.summary}</p>
        {rec.action.steps.length > 0 && (
          <ol className="space-y-1.5 mt-2">
            {rec.action.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-[rgba(79,90,232,0.1)] flex items-center justify-center text-[9px] font-bold text-[#4F5AE8] flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-[11px] text-[#94A3B8] leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Confidence */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#2D3748] mb-1.5">
          Engine confidence
        </p>
        <ConfidenceBar value={rec.confidence} />
      </div>
    </div>
  );
}

// ── Secondary recommendation mini-card ───────────────────────────────────────

function SecondaryCard({ rec, rank }: { rec: StructuredRecommendation; rank: number }) {
  const catCfg = CATEGORY_CONFIG[rec.actionCategory] ?? CATEGORY_CONFIG.CONSISTENCY_FIX;
  return (
    <div className="card-base p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[9px] font-bold text-[#475569] flex-shrink-0">
          {rank}
        </span>
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider", catCfg.color)}>
          {catCfg.label}
        </span>
      </div>
      <p className="text-xs font-medium text-[#94A3B8] leading-snug">{rec.title}</p>
      {rec.action.summary && (
        <p className="text-[11px] text-[#475569] leading-snug">{rec.action.summary}</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TopRecommendationHeroProps {
  sprint4: Sprint4ViewModel;
  className?: string;
}

export function TopRecommendationHero({ sprint4, className }: TopRecommendationHeroProps) {
  if (!sprint4.top) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Section label */}
      <div className="flex items-center gap-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#4F5AE8]">
          Priority action
        </p>
        <div className="h-px flex-1 bg-[rgba(79,90,232,0.08)]" aria-hidden="true" />
        <p className="text-[10px] text-[#2D3748]">{sprint4.modelVersion}</p>
      </div>

      {/* Top recommendation */}
      <TopCard rec={sprint4.top} />

      {/* Secondary recommendations */}
      {sprint4.secondary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sprint4.secondary.map((rec, i) => (
            <SecondaryCard key={rec.id} rec={rec} rank={i + 2} />
          ))}
        </div>
      )}
    </div>
  );
}
