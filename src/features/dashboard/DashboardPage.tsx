import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { useAnalysis } from "@/hooks/useAnalysis";
import { ExecutiveAxis } from "./executive/ExecutiveAxis";
import { InvestigativeAxis } from "./investigative/InvestigativeAxis";
import { TechnicalAxis } from "./technical/TechnicalAxis";
import { AIInterpretationPanel } from "./interpretation/AIInterpretationPanel";
import { EconomicsCard } from "./executive/EconomicsCard";
import { EmptyState } from "@/shared/states/EmptyState";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { buildEconomicsViewModel } from "@/adapters/economicsAdapter";

function NoDashboardState() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <EmptyState
        title="No analysis loaded"
        description="Run an analysis from the Launchpad to see your dashboard. Upload a conversation dataset to get started."
        action={{
          label: "Go to Launchpad",
          onClick: () => navigate("/home"),
        }}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
        }
      />
    </div>
  );
}

export function DashboardPage() {
  const { result, loading, dataSource } = useAnalysis();
  const navigate = useNavigate();

  const economics = useMemo(() => {
    if (!result) return null;
    const domain = adaptAnalysisResult(result);
    return buildEconomicsViewModel(domain);
  }, [result]);

  if (!result) {
    return (
      <AppShell topBarTitle="Dashboard">
        <NoDashboardState />
      </AppShell>
    );
  }

  return (
    <AppShell
      topBarTitle="Dashboard"
      topBarActions={
        <div className="flex items-center gap-2">
          {dataSource === "cached" && (
            <span className="text-[10px] uppercase tracking-wide font-semibold text-[#22D3EE] bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.12)] px-2 py-1 rounded-full">
              Cached
            </span>
          )}
          <Button
            size="sm"
            onClick={() => navigate("/home")}
            variant="ghost"
            className="rounded-xl text-[#475569] hover:text-[#94A3B8] text-xs"
          >
            New analysis
          </Button>
        </div>
      }
    >
      <PageFrame maxWidth="2xl">
        {/* Executive Axis - Above the fold */}
        <ExecutiveAxis />

        {/* Investigative Axis - Scroll */}
        <InvestigativeAxis className="mt-2" />

        {/* Full economics (expanded) */}
        {economics && (
          <div className="mt-5">
            <div className="flex items-center gap-3 pt-2 mb-5">
              <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
              <p className="section-label">Full economic analysis</p>
              <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
            </div>
            <EconomicsCard economics={economics} collapsed={false} />
          </div>
        )}

        {/* Technical Axis - Deep scroll */}
        <TechnicalAxis className="mt-2" />

        {/* AI Interpretation - Bottom */}
        <div className="mt-5">
          <div className="flex items-center gap-3 pt-2 mb-5">
            <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
            <p className="section-label">AI interpretation</p>
            <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
          </div>
          <AIInterpretationPanel />
        </div>

        {/* Bottom padding */}
        <div className="h-12" />
      </PageFrame>
    </AppShell>
  );
}
