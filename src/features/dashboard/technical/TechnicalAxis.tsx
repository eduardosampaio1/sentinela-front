import { cn } from "@/lib/utils";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { GuardrailsPanel } from "./GuardrailsPanel";
import { OptimizationPanel } from "./OptimizationPanel";

interface TechnicalAxisProps {
  className?: string;
}

export function TechnicalAxis({ className }: TechnicalAxisProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {/* Section header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
        <p className="section-label">Technical details</p>
        <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
      </div>

      <DiagnosticsPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GuardrailsPanel />
        <OptimizationPanel />
      </div>
    </div>
  );
}
