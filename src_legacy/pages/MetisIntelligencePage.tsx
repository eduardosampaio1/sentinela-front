import { BrainCircuit } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { metisSignals } from "@/lib/dashboardModel";
import DashboardModuleHero from "@/components/dashboard/DashboardModuleHero";
import DiagnosticPanel from "@/components/dashboard-v2/DiagnosticPanel";

export default function MetisIntelligencePage() {
  const { result } = useAnalysis();
  const items = metisSignals(result);
  const strongSignals = items.filter((item) => (item.score ?? 0) >= 45).length;

  return (
    <div className="page-stack">
      <DashboardModuleHero
        eyebrow="Optimization module"
        title="Optimization intelligence"
        description="Use long-horizon signals to decide what to tune next for stability, clarity, and cost efficiency without losing the current production context."
        icon={<BrainCircuit className="h-5 w-5" />}
        chips={[
          { label: strongSignals > 0 ? "Active optimization signals" : "Low optimization pressure", tone: strongSignals > 0 ? "watch" : "safe" },
          { label: "Decision support", tone: "primary" },
        ]}
        stats={[
          { label: "Signals", value: String(items.length), helper: "Strategic indicators computed for this run." },
          { label: "Actionable", value: String(strongSignals), helper: "Signals above the watch threshold." },
          { label: "Analysis run", value: result?.analysis_run_id ?? "Unavailable", helper: "Current run backing these optimization cues." },
        ]}
      />

      <DiagnosticPanel
        title="Optimization signals"
        subtitle="Strategic indicators over long-running behavior patterns. Use them to prioritize tuning after you finish the executive triage."
        items={items}
        emptyText="Advanced intelligence signals will appear as your dataset grows."
      />
    </div>
  );
}
