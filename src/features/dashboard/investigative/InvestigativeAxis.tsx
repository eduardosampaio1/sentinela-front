import { cn } from "@/lib/utils";
import { BehaviorScorePanel } from "./BehaviorScorePanel";
import { DriftPanel } from "./DriftPanel";
import { AlertsPanel } from "./AlertsPanel";
import { IntentsBreakdown } from "./IntentsBreakdown";

interface InvestigativeAxisProps {
  className?: string;
}

export function InvestigativeAxis({ className }: InvestigativeAxisProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {/* Section header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
        <p className="section-label">Deep analysis</p>
        <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" aria-hidden="true" />
      </div>

      {/* Behavior + Drift */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BehaviorScorePanel />
        <DriftPanel />
      </div>

      {/* Alerts */}
      <AlertsPanel />

      {/* Intents breakdown */}
      <IntentsBreakdown />
    </div>
  );
}
