import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricInfoProps {
  title: string;
  tooltip?: string;
}

export default function MetricInfo({ title, tooltip }: MetricInfoProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[280px] text-xs leading-relaxed">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
