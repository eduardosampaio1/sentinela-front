import { Activity } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { nomosDiagnostics } from "@/lib/dashboardModel";
import DashboardModuleHero from "@/components/dashboard/DashboardModuleHero";
import DiagnosticPanel from "@/components/dashboard-v2/DiagnosticPanel";

export default function NomosDiagnosticsPage() {
  const { result } = useAnalysis();
  const items = nomosDiagnostics(result);
  const highSignals = items.filter((item) => (item.score ?? 0) >= 70).length;

  return (
    <div className="page-stack">
      <DashboardModuleHero
        eyebrow="Diagnostics module"
        title="Behavioral diagnostics"
        description="Inspect drift, instability, collapse, and degeneration patterns before they turn into trust loss or avoidable operating cost."
        icon={<Activity className="h-5 w-5" />}
        chips={[
          { label: highSignals > 0 ? "Critical diagnostics present" : "No critical diagnostic spike", tone: highSignals > 0 ? "risk" : "safe" },
          { label: "Progressive disclosure", tone: "primary" },
        ]}
        stats={[
          { label: "Signals", value: String(items.length), helper: "Diagnostic dimensions computed for this run." },
          { label: "High severity", value: String(highSignals), helper: "Signals currently above the critical threshold." },
          { label: "Analysis run", value: result?.analysis_run_id ?? "Unavailable", helper: "Source run attached to the current page." },
        ]}
      />

      <DiagnosticPanel
        title="Behavioral diagnostics"
        subtitle="Intent-level and system-level behavior shifts. Open the panel to verify where degradation is concentrated and how severe it is."
        items={items}
        emptyText="Diagnostic signals will appear after analysis."
      />
    </div>
  );
}
