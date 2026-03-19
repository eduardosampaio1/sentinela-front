import { ListFilter } from "lucide-react";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface SignalSummaryPanelProps {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: string }>;
  emptyText: string;
}

export default function SignalSummaryPanel({
  title,
  subtitle,
  items,
  emptyText,
}: SignalSummaryPanelProps) {
  return (
    <AccordionPanel
      title={title}
      icon={<ListFilter className="h-4 w-4" />}
      badge={
        <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
          {items.length}
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-3 text-sm text-muted-foreground">{subtitle}</p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.label} className="rounded-2xl border border-border/70 bg-background/50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{item.value}</p>
            </article>
          ))}
        </div>
      )}
    </AccordionPanel>
  );
}

