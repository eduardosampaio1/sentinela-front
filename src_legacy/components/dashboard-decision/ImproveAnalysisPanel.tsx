import { Wrench } from "lucide-react";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface ImproveAnalysisPanelProps {
  suggestions: string[];
}

export default function ImproveAnalysisPanel({ suggestions }: ImproveAnalysisPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <AccordionPanel
      title="Improve this analysis"
      icon={<Wrench className="h-4 w-4" />}
      badge={
        <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
          {suggestions.length} ideas
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-4 text-sm leading-6 text-muted-foreground">
        These enrichment suggestions help the next run produce a stronger decision surface without changing the current backend flow.
      </p>

      <div className="flex flex-wrap gap-2.5">
        {suggestions.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border/50 bg-background/30 px-3 py-2 text-xs text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </AccordionPanel>
  );
}
