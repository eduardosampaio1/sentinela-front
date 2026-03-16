import { BrainCircuit } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { metisSignals } from "@/lib/dashboardModel";
import DiagnosticPanel from "@/components/dashboard-v2/DiagnosticPanel";

export default function MetisIntelligencePage() {
  const { result } = useAnalysis();
  const items = metisSignals(result);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <BrainCircuit className="mt-1 h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Optimization</h1>
          <p className="text-sm text-muted-foreground">
            Optimization insights for stability, clarity, and cost efficiency.
          </p>
        </div>
      </div>

      <DiagnosticPanel
        title="Optimization Signals"
        subtitle="Strategic indicators over long-running behavior patterns."
        items={items}
        emptyText="Advanced intelligence signals will appear as your dataset grows."
      />

      <p className="text-sm text-muted-foreground">
        Advanced intelligence signals will appear as your dataset grows.
      </p>
    </div>
  );
}
