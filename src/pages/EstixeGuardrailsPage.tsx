import { ShieldAlert } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { estixeSignals } from "@/lib/dashboardModel";
import SignalSummaryPanel from "@/components/dashboard-v2/SignalSummaryPanel";

export default function EstixeGuardrailsPage() {
  const { result } = useAnalysis();
  const items = estixeSignals(result);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-1 h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Guardrails</h1>
          <p className="text-sm text-muted-foreground">
            Safety and policy signals that indicate where intervention may be needed.
          </p>
        </div>
      </div>

      <SignalSummaryPanel
        title="Guardrail Signals"
        subtitle="Safety signals, risk patterns, and policy drift indicators."
        items={items}
        emptyText="Signals will appear when detected."
      />
    </div>
  );
}
