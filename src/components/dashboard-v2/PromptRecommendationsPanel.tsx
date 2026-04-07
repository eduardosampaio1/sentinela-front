import { Wand2 } from "lucide-react";
import type { AnalysisResult } from "@/lib/api";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface PromptRecommendationsPanelProps {
  result: AnalysisResult | null;
}

function priorityBadgeClass(priority: number) {
  if (priority === 1) return "border-red-500/30 bg-red-500/10 text-red-200";
  if (priority === 2) return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-border/60 bg-background/35 text-muted-foreground";
}

function priorityLabel(priority: number) {
  if (priority === 1) return "P1 — urgent";
  if (priority === 2) return "P2 — important";
  return "P3 — nice to have";
}

export default function PromptRecommendationsPanel({ result }: PromptRecommendationsPanelProps) {
  const recs = result?.prompt_recommendations;
  if (!recs || recs.length === 0) return null;

  const urgentCount = recs.filter((r) => r.priority === 1).length;

  return (
    <AccordionPanel
      title="Prompt improvement recommendations"
      icon={<Wand2 className="h-4 w-4" />}
      badge={
        <div className="flex items-center gap-1.5">
          {urgentCount > 0 ? (
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-200">
              {urgentCount} urgent
            </span>
          ) : null}
          <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
            {recs.length} recommendation{recs.length !== 1 ? "s" : ""}
          </span>
        </div>
      }
      defaultOpen={urgentCount > 0}
    >
      <p className="mb-4 text-sm leading-6 text-muted-foreground">
        Concrete prompt changes derived from the issues detected in this run. Apply the highest-priority
        items first for maximum impact.
      </p>

      <div className="space-y-4">
        {recs.map((rec, index) => (
          <article
            key={rec.id || index}
            className="rounded-[24px] border border-border/55 bg-background/35 p-4 sm:p-5"
          >
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/30 text-sm font-semibold text-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{rec.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">Problem:</span>{" "}
                    {rec.problem}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium ${priorityBadgeClass(rec.priority)}`}
              >
                {priorityLabel(rec.priority)}
              </span>
            </div>

            {/* Action */}
            <div className="mt-4 rounded-[20px] border border-border/45 bg-background/25 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Recommended action
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{rec.action}</p>
            </div>

            {/* Prompt snippet */}
            {rec.prompt_snippet && (
              <div className="mt-3 rounded-[20px] border border-border/45 bg-background/20 p-3.5">
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Prompt snippet
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-foreground/80">
                  {rec.prompt_snippet}
                </pre>
              </div>
            )}

            {/* Affected intents */}
            {rec.affected_intents.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Affects:
                </span>
                {rec.affected_intents.map((intent) => (
                  <span
                    key={intent}
                    className="rounded-full border border-primary/20 bg-primary/8 px-2.5 py-0.5 font-mono text-[11px] text-primary/80"
                  >
                    {intent}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </AccordionPanel>
  );
}
