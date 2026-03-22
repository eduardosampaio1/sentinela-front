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
        <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
          {items.length} signals
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-4 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>

      {items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.label} className="rounded-[22px] border border-border/55 bg-background/35 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{item.value}</p>
            </article>
          ))}
        </div>
      )}
    </AccordionPanel>
  );
}
