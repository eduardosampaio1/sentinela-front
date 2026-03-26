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
  if (priority === "high") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (priority === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function priorityLabel(priority: RecommendationItem["priority"]) {
  if (priority === "high") return "High priority";
  if (priority === "medium") return "Medium priority";
  return "Low priority";
}

export default function RecommendationsPanel({
  items,
  title = "Recommended actions",
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
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-200">
              {highCount} high
            </span>
          ) : null}
          <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
            {items.length} actions
          </span>
        </div>
      }
      defaultOpen={false}
    >
      <p className="mb-4 text-sm leading-6 text-muted-foreground">{subtitle}</p>

      {items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border/60 bg-background/20 px-4 py-8 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <article key={item.id} className="rounded-[24px] border border-border/55 bg-background/35 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/50 bg-background/30 text-sm font-semibold text-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      <span className="font-medium text-foreground">Why:</span> {item.reason}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${priorityClass(item.priority)}`}>
                  {priorityLabel(item.priority)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="rounded-[20px] border border-border/45 bg-background/25 p-3.5">
                  <p className="dashboard-kicker">Expected impact</p>
                  <p className="mt-3 text-sm leading-6 text-foreground">{item.expectedImpact}</p>
                </div>
                <div className="rounded-[20px] border border-border/45 bg-background/25 px-3.5 py-3 text-xs text-muted-foreground">
                  Category <span className="text-foreground">{item.category}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </AccordionPanel>
  );
}
