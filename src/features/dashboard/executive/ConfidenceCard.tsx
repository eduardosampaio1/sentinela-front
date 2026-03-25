import { cn } from "@/lib/utils";
import type { ConfidenceModel } from "@/domain/verdict.types";

const TONE_RING_COLOR = {
  safe: "#34D399",
  watch: "#FCD34D",
  risk: "#F87171",
  neutral: "#475569",
};

const CERTAINTY_LABEL = {
  high: "High certainty",
  medium: "Moderate certainty",
  low: "Low certainty",
  unknown: "Confidence unknown",
};

interface ConfidenceCardProps {
  confidence: ConfidenceModel;
}

function CircleGauge({ percent, tone }: { percent: number | null; tone: ConfidenceModel["tone"] }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const fillPercent = percent !== null ? Math.max(0, Math.min(100, percent)) : 0;
  const strokeDashoffset = circumference - (fillPercent / 100) * circumference;
  const color = TONE_RING_COLOR[tone];

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
        {/* Background track */}
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="6"
        />
        {/* Fill */}
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>

      {/* Center value */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-sm font-bold"
          style={{ color }}
        >
          {percent !== null ? `${percent.toFixed(0)}%` : "—"}
        </span>
      </div>
    </div>
  );
}

export function ConfidenceCard({ confidence }: ConfidenceCardProps) {
  return (
    <div className="card-base p-5">
      <p className="section-label mb-4">Reading reliability</p>

      <div className="flex items-center gap-4 mb-4">
        <CircleGauge percent={confidence.percent} tone={confidence.tone} />

        <div className="min-w-0 flex-1">
          <p
            className="text-lg font-bold leading-tight mb-0.5"
            style={{ color: TONE_RING_COLOR[confidence.tone] }}
          >
            {CERTAINTY_LABEL[confidence.certainty]}
          </p>
          <p className="text-xs text-[#475569]">
            Global confidence score for this analysis run
          </p>
        </div>
      </div>

      {/* Limiting factors */}
      {confidence.limitingFactors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#2D3748]">Factors</p>
          {confidence.limitingFactors.map((factor, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 text-xs",
                confidence.tone === "safe" ? "text-[#475569]" : "text-[#94A3B8]"
              )}
            >
              <span
                className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: TONE_RING_COLOR[confidence.tone] }}
                aria-hidden="true"
              />
              {factor}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
