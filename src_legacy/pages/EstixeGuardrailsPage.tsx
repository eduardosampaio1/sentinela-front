import { ShieldAlert } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { estixeSignals } from "@/lib/dashboardModel";
import DashboardModuleHero from "@/components/dashboard/DashboardModuleHero";
import SignalSummaryPanel from "@/components/dashboard-v2/SignalSummaryPanel";

export default function EstixeGuardrailsPage() {
  const { result } = useAnalysis();
  const items = estixeSignals(result);

  return (
    <div className="page-stack">
      <DashboardModuleHero
        eyebrow="Guardrails module"
        title="Safety and policy pressure"
        description="Review the safety signals, policy drift indicators, and intervention thresholds that decide whether this system can still be trusted in production."
        icon={<ShieldAlert className="h-5 w-5" />}
        chips={[
          { label: items.length > 0 ? "Signals detected" : "Awaiting safety signal", tone: items.length > 0 ? "watch" : "neutral" },
          { label: "Intervention-ready", tone: "primary" },
        ]}
        stats={[
          { label: "Guardrail signals", value: String(items.length), helper: "Signals currently exposed by the engine." },
          { label: "Analysis run", value: result?.analysis_run_id ?? "Unavailable", helper: "Current run backing this safety surface." },
          { label: "Purpose", value: "Trust", helper: "Use this module before shipping changes or increasing traffic." },
        ]}
      />

      <SignalSummaryPanel
        title="Guardrail signals"
        subtitle="Safety signals, risk patterns, and policy drift indicators. Open the deck to inspect each current pressure point."
        items={items}
        emptyText="Signals will appear when detected."
      />
    </div>
  );
}
