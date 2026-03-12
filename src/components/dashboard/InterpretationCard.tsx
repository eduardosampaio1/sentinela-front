import { Badge } from "@/components/ui/badge";
import { Bot, ShieldAlert, Sparkles, Target } from "lucide-react";
import type { AnalysisInterpretation } from "@/lib/api";

function severityTone(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return "text-red-400 border-red-500/20 bg-red-500/5";
  if (normalized === "high") return "text-amber-300 border-amber-500/20 bg-amber-500/5";
  if (normalized === "medium") return "text-sky-300 border-sky-500/20 bg-sky-500/5";
  return "text-emerald-300 border-emerald-500/20 bg-emerald-500/5";
}

type Props = {
  interpretation: AnalysisInterpretation;
  model: string;
  promptVersion: string;
  cached?: boolean;
};

export default function InterpretationCard({
  interpretation,
  model,
  promptVersion,
  cached = false,
}: Props) {
  return (
    <div className="mt-5 rounded-3xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-primary/30 bg-background/60 text-primary">
          <Bot className="mr-1 h-3.5 w-3.5" />
          LLM interpretation
        </Badge>
        <Badge variant="secondary">{model}</Badge>
        <Badge variant="secondary">Prompt {promptVersion}</Badge>
        <Badge variant="secondary">{cached ? "Cached result" : "Fresh result"}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Strategic diagnosis
          </span>
        </div>
        <h3 className="text-2xl font-semibold text-foreground">
          {interpretation.executive_diagnosis}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {interpretation.systemic_pattern}
        </p>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Main risks
          </div>

          <div className="space-y-3">
            {interpretation.main_risks.length > 0 ? interpretation.main_risks.map((risk, index) => (
              <div
                key={`${risk.title}-${index}`}
                className={`rounded-2xl border p-4 ${severityTone(risk.severity)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{risk.title}</div>
                  <Badge variant="secondary">{risk.severity}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">Evidence:</span> {risk.evidence}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">Impact:</span> {risk.impact}
                </p>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No explicit risks were returned by the model.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Priority actions
          </div>

          <div className="space-y-3">
            {interpretation.priority_actions.length > 0 ? interpretation.priority_actions.map((action) => (
              <div key={`${action.priority}-${action.action}`} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted-foreground">
                    {action.priority}
                  </div>
                  <div className="font-medium text-foreground">{action.action}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">Reason:</span> {action.reason}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">Expected effect:</span> {action.expected_effect}
                </p>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No priority actions were returned by the model.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="text-sm font-medium text-emerald-300">Strategic recommendation</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {interpretation.strategic_recommendation}
        </p>
      </div>
    </div>
  );
}