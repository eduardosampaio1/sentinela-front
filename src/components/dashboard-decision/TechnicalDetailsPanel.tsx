import { ScrollText } from "lucide-react";
import type { AnalysisResult } from "@/lib/api";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";
import AccordionPanel from "@/components/ui/AccordionPanel";

interface TechnicalDetailsPanelProps {
  result: AnalysisResult | null;
}

function detailValue(value: string | undefined | null) {
  return value && value.trim() ? value : null;
}

export default function TechnicalDetailsPanel({ result }: TechnicalDetailsPanelProps) {
  if (!result) return null;

  const details = [
    { label: "Engine version", value: detailValue(result.engine_version) },
    { label: "Analysis run", value: detailValue(result.analysis_run_id) },
    { label: "Analysis id", value: detailValue(result.analysis_id) },
    { label: "Analyzed at", value: detailValue(result.analyzed_at) },
  ];

  return (
    <AccordionPanel
      title="Technical Details"
      icon={<ScrollText className="h-4 w-4" />}
      defaultOpen={false}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {details.map((item) => (
          <article
            key={item.label}
            className={`rounded-lg border border-border/35 bg-background/25 px-2.5 py-2 ${item.value ? "" : "opacity-70 saturate-75"}`}
          >
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-xs text-foreground">
              {item.value ?? <MissingDataBadge />}
            </p>
          </article>
        ))}
      </div>
    </AccordionPanel>
  );
}
