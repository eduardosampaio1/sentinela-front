import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { RecommendationModel } from "@/domain/verdict.types";
import { Button } from "@/components/ui/button";

interface RecommendationCardProps {
  recommendation: RecommendationModel;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const navigate = useNavigate();

  // Re-run leva a jornada CANONICA em vez de reexecutar inline.
  //
  // O caminho inline (`/api/analyze`) exige project_id + environment_id -- o Gateway recusa
  // sem os tres (api/routes/analysis.py). Esse eixo deixa de existir quando a identidade
  // vira workspace-only, e dar a ele uma fonte propria seria persistencia paralela sem dono,
  // que a matriz proibe. A jornada canonica ja faz prepare -> upload -> submit com o
  // Orchestrator persistindo.
  const irParaNovaAnalise = () => navigate("/canonical/analyses/new");

  const isEscalated = recommendation.escalated;

  return (
    <div
      className={cn(
        "card-base p-5 relative overflow-hidden",
        isEscalated && "border-[rgba(248,113,113,0.2)]"
      )}
    >
      {/* Escalated glow */}
      {isEscalated && (
        <div
          className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-2xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #F87171 0%, transparent 70%)" }}
          aria-hidden="true"
        />
      )}

      <div className="flex items-center justify-between mb-3 relative z-10">
        <p className="section-label">Recommendation</p>
        {isEscalated && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.2)] text-[#F87171]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F87171]" aria-hidden="true" />
            Urgent
          </span>
        )}
      </div>

      {/* Headline */}
      <h3 className="text-base font-semibold text-[#F1F5F9] mb-3 leading-snug relative z-10">
        {recommendation.headline}
      </h3>

      {/* Context */}
      {recommendation.context && (
        <p className="text-sm text-[#94A3B8] leading-relaxed mb-4 relative z-10">
          {recommendation.context}
        </p>
      )}

      {/* Expected impact */}
      {recommendation.expectedImpact && (
        <div className="flex items-start gap-2 mb-4 relative z-10">
          <svg className="w-3.5 h-3.5 text-[#34D399] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
          </svg>
          <p className="text-xs text-[#94A3B8]">{recommendation.expectedImpact}</p>
        </div>
      )}

      {/* CTAs */}
      <div className="flex items-center gap-2 relative z-10">
        <Button
          size="sm"
          className={cn(
            "rounded-xl font-semibold text-xs flex-1 sm:flex-none",
            isEscalated
              ? "bg-[rgba(248,113,113,0.15)] text-[#F87171] border border-[rgba(248,113,113,0.25)] hover:bg-[rgba(248,113,113,0.25)]"
              : "bg-[#4F5AE8] text-white hover:bg-[#3E48C4]"
          )}
          onClick={() => navigate("/dashboard")}
        >
          {recommendation.primaryCtaLabel}
        </Button>

        {recommendation.secondaryCtaLabel && (
          <Button
            size="sm"
            variant="ghost"
            onClick={irParaNovaAnalise}
            className="rounded-xl text-xs text-[#94A3B8] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]"
          >
            {recommendation.secondaryCtaLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
