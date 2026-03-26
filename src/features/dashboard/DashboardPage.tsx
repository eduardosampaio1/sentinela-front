import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { useAnalysis } from "@/hooks/useAnalysis";
import { ExecutiveAxis } from "./executive/ExecutiveAxis";
import { InvestigativeAxis } from "./investigative/InvestigativeAxis";
import { TechnicalAxis } from "./technical/TechnicalAxis";
import { AIInterpretationPanel } from "./interpretation/AIInterpretationPanel";
import { EconomicsCard } from "./executive/EconomicsCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { adaptAnalysisResult } from "@/adapters/analysisAdapter";
import { buildEconomicsViewModel } from "@/adapters/economicsAdapter";

// ─── Empty state ─────────────────────────────────────────────────────────────

function NoDashboardState() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center text-center max-w-md px-6 py-16">

        <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] flex items-center justify-center mb-6">
          <svg className="w-6 h-6 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-[#94A3B8] mb-2">
          No active analysis
        </h2>
        <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
          Your decision cockpit is ready — but there's no analysis loaded yet.
          Upload a conversation dataset from the Launchpad, or restore a previous
          run from History to see diagnostics, risk signals, and recommendations.
        </p>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate("/home")}
            size="sm"
            className="rounded-xl bg-[#22D3EE] text-[#070C18] font-semibold hover:bg-[#06B6D4]"
          >
            Open Launchpad
          </Button>
          <Button
            onClick={() => navigate("/dashboard/history")}
            variant="ghost"
            size="sm"
            className="rounded-xl text-[#94A3B8] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]"
          >
            View history
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
      <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] flex-shrink-0">
        {label}
      </p>
      <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

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
            className="rounded-xl text-[#94A3B8] hover:text-[#94A3B8] text-xs"
          >
            New analysis
          </Button>
        </div>
      }
    >
      <PageFrame maxWidth="2xl">

        {/* ── Executive axis: above the fold ── */}
        <ExecutiveAxis />

        {/* ── Investigative axis: scroll zone ── */}
        <InvestigativeAxis className="mt-2" />

        {/* ── Full economic breakdown ── */}
        {economics && (
          <div className="mt-6">
            <SectionDivider label="Economic breakdown" />
            <div className="mt-4">
              <EconomicsCard economics={economics} collapsed={false} />
            </div>
          </div>
        )}

        {/* ── Technical axis: deep scroll ── */}
        <TechnicalAxis className="mt-2" />

        {/* ── AI interpretation ── */}
        <div className="mt-6">
          <SectionDivider label="AI interpretation" />
          <div className="mt-4">
            <AIInterpretationPanel />
          </div>
        </div>

        <div className="h-16" />
      </PageFrame>
    </AppShell>
  );
}
