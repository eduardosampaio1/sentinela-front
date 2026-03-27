// ============================================================
// ProcessingOverlay — Sprint 5: Operational Analysis Experience
// "The user is not waiting a loading. They are following a heavy operation."
// ============================================================

import { useAnalysis } from "@/hooks/useAnalysis";
import { cn } from "@/lib/utils";

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, {
  icon: React.ReactNode;
  brandSubtext: string;
  color: string;
}> = {
  queued: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    brandSubtext: "Your dataset is in queue and will begin processing shortly.",
    color: "#475569",
  },
  preparing: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    brandSubtext: "Validating dataset structure and preparing analysis context.",
    color: "#94A3B8",
  },
  embedding: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
      </svg>
    ),
    brandSubtext: "Mapping behavioral patterns and semantic relationships across your conversations.",
    color: "#22D3EE",
  },
  analyzing: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    brandSubtext: "Detecting hidden inconsistencies, cost inefficiencies, and behavioral drift.",
    color: "#A78BFA",
  },
  finalizing: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    brandSubtext: "Consolidating results and preparing your decision cockpit.",
    color: "#4ADE80",
  },
};

const DEFAULT_CONFIG = STAGE_CONFIG.queued;

// ── Progress bar ──────────────────────────────────────────────────────────────

function StageProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="w-full h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${progress}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Stage pipeline dots ───────────────────────────────────────────────────────

const STAGES = ["queued", "preparing", "embedding", "analyzing", "finalizing"];

function StagePipeline({ current }: { current: string }) {
  const currentIdx = STAGES.indexOf(current);
  return (
    <div className="flex items-center gap-1.5">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-500",
                done    ? "bg-[#4ADE80]" :
                active  ? "bg-[#22D3EE] scale-125 shadow-[0_0_6px_rgba(34,211,238,0.5)]" :
                          "bg-[rgba(255,255,255,0.1)]"
              )}
            />
            {i < STAGES.length - 1 && (
              <div className={cn("w-4 h-px", done ? "bg-[rgba(74,222,128,0.4)]" : "bg-[rgba(255,255,255,0.06)]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main overlay ─────────────────────────────────────────────────────────────

interface ProcessingOverlayProps {
  visible: boolean;
  // Legacy props kept for compatibility
  stage?: number;
  progress?: number;
  message?: string;
}

export function ProcessingOverlay({ visible }: ProcessingOverlayProps) {
  const { jobStage, jobStageLabel, jobStageDetail, loadingProgress, executionProfile } = useAnalysis();

  if (!visible) return null;

  const cfg = STAGE_CONFIG[jobStage] ?? DEFAULT_CONFIG;
  const isHeavy = executionProfile?.isHeavy ?? false;
  const etaLabel = executionProfile?.estimatedDurationLabel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,12,24,0.92)] backdrop-blur-sm">
      <div className="w-full max-w-md mx-auto px-6">

        {/* Icon + pulse ring */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: cfg.color }}
            />
            <div
              className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: `${cfg.color}15`,
                border: `1px solid ${cfg.color}30`,
                color: cfg.color,
              }}
            >
              {cfg.icon}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-1">
          <h2 className="text-lg font-semibold text-[#F1F5F9]">Analyzing dataset</h2>
        </div>

        {/* Stage label */}
        <div className="text-center mb-4">
          <p className="text-sm font-medium" style={{ color: cfg.color }}>
            {jobStageLabel || "Preparing analysis job"}
          </p>
          {jobStageDetail && (
            <p className="text-xs text-[#475569] mt-1 leading-relaxed max-w-sm mx-auto">
              {jobStageDetail}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <StageProgressBar progress={loadingProgress} color={cfg.color} />
        </div>

        {/* Pipeline dots */}
        <div className="flex justify-center mb-5">
          <StagePipeline current={jobStage} />
        </div>

        {/* ETA + heavy dataset notice */}
        {isHeavy && etaLabel && (
          <div className="rounded-xl bg-[rgba(252,211,77,0.06)] border border-[rgba(252,211,77,0.12)] px-4 py-3 mb-4 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-[#FCD34D] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-[#FCD34D]">
                Large dataset — estimated time: {etaLabel}
              </p>
              <p className="text-[11px] text-[#475569] mt-0.5">
                This is a heavy analysis. Progress is real — you can keep this tab open.
              </p>
            </div>
          </div>
        )}

        {/* Brand subtext */}
        <p className="text-center text-[11px] text-[#2D3748] leading-relaxed">
          {cfg.brandSubtext}
        </p>
      </div>
    </div>
  );
}
