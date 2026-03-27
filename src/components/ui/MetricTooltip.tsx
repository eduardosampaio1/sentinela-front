import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricTooltipProps {
  text: string;
  side?: "top" | "bottom" | "left" | "right";
}

export default function MetricTooltip({ text, side = "top" }: MetricTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center h-[14px] w-[14px] rounded-full border border-border/50 text-muted-foreground/50 transition hover:border-primary/40 hover:text-muted-foreground focus:outline-none"
          aria-label="Saiba mais sobre esta métrica"
        >
          <Info className="h-[9px] w-[9px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[260px] text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
