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
      title="Technical details"
      icon={<ScrollText className="h-4 w-4" />}
      badge={
        <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
          {details.length} fields
        </span>
      }
      defaultOpen={false}
    >
      <p className="mb-4 text-sm leading-6 text-muted-foreground">
        Operational traceability for the current run. This is the dock for identifiers, timestamps, and engine lineage.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {details.map((item) => (
          <article
            key={item.label}
            className={`rounded-[22px] border border-border/45 bg-background/25 p-4 ${item.value ? "" : "opacity-70 saturate-75"}`}
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
            <p className="mt-3 break-all font-mono text-sm leading-6 text-foreground">
              {item.value ?? <MissingDataBadge />}
            </p>
          </article>
        ))}
      </div>
    </AccordionPanel>
  );
}
