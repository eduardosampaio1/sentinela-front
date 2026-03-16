import { Activity } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { nomosDiagnostics } from "@/lib/dashboardModel";
import DiagnosticPanel from "@/components/dashboard-v2/DiagnosticPanel";

export default function NomosDiagnosticsPage() {
  const { result } = useAnalysis();
  const items = nomosDiagnostics(result);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Activity className="mt-1 h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Behavioral diagnostics for drift, instability, collapse, and degeneration.
          </p>
        </div>
      </div>

      <DiagnosticPanel
        title="Behavioral Diagnostics"
        subtitle="Intent-level and system-level behavior shifts."
        items={items}
        emptyText="Diagnostic signals will appear after analysis."
      />
    </div>
  );
}
