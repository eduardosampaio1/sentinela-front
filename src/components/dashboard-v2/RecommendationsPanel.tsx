import { Lightbulb } from "lucide-react";
import type { RecommendationItem } from "@/lib/dashboardModel";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface RecommendationsPanelProps {
  items: RecommendationItem[];
  title?: string;
  subtitle?: string;
  emptyText?: string;
}

function priorityClass(priority: RecommendationItem["priority"]) {
  if (priority === "high") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (priority === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function priorityLabel(priority: RecommendationItem["priority"]) {
  if (priority === "high") return "High Priority";
  if (priority === "medium") return "Medium Priority";
  return "Low Priority";
}

export default function RecommendationsPanel({
  items,
  title = "Recommended Actions",
  subtitle = "Suggested interventions based on detected risk, quality, and efficiency signals.",
  emptyText = "Recommendations will appear when actionable patterns are detected.",
}: RecommendationsPanelProps) {
  const highCount = items.filter((item) => item.priority === "high").length;

  return (
    <AccordionPanel
      title={title}
      icon={<Lightbulb className="h-4 w-4" />}
      badge={
        <div className="flex items-center gap-1.5">
          {highCount > 0 ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] text-amber-300">
              HIGH
            </span>
          ) : null}
          <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
            {items.length}
          </span>
        </div>
      }
      defaultOpen={false}
    >
      <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/20 px-4 py-8 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-border/50 bg-background/35 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] ${priorityClass(item.priority)}`}
                >
                  {priorityLabel(item.priority)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">Why:</span> {item.reason}
              </p>
              <p className="mt-2 text-sm leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">Expected impact:</span> {item.expectedImpact}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                Category: <span className="text-foreground">{item.category}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </AccordionPanel>
  );
}
