import type { RecommendationItem } from "@/lib/dashboardModel";

interface RecommendationsPanelProps {
  items: RecommendationItem[];
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

export default function RecommendationsPanel({ items }: RecommendationsPanelProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">Recommended Actions</h2>
        <p className="text-sm text-muted-foreground">
          Suggested interventions based on detected risk, quality, and efficiency signals.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          Recommendations will appear when actionable patterns are detected.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${priorityClass(item.priority)}`}
                >
                  {priorityLabel(item.priority)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Why:</span> {item.reason}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Expected impact:</span> {item.expectedImpact}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                Category: <span className="text-foreground">{item.category}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
