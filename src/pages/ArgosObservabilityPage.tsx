import { Coins, Radar } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { argosCards } from "@/lib/dashboardModel";
import SignalScoreCard from "@/components/dashboard-v2/SignalScoreCard";
import AccordionPanel from "@/components/ui/AccordionPanel";

export default function ArgosObservabilityPage() {
  const { result } = useAnalysis();
  const cards = argosCards(result);
  const semanticCards = cards.filter((item) => item.id !== "token-efficiency");
  const tokenCards = cards.filter((item) => item.id === "token-efficiency");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Radar className="mt-1 h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Key quality and efficiency metrics from your latest analysis run.
          </p>
        </div>
      </div>

      <AccordionPanel
        title="Semantic Consistency"
        icon={<Radar className="h-4 w-4" />}
        badge={
          <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
            {semanticCards.length}
          </span>
        }
        defaultOpen={false}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {semanticCards.map((item) => (
            <SignalScoreCard key={item.id} item={item} />
          ))}
        </div>
      </AccordionPanel>

      <AccordionPanel
        title="Token & Cost Breakdown"
        icon={<Coins className="h-4 w-4" />}
        badge={
          <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
            {tokenCards.length}
          </span>
        }
        defaultOpen={false}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tokenCards.map((item) => (
            <SignalScoreCard key={item.id} item={item} />
          ))}
        </div>
      </AccordionPanel>
    </div>
  );
}
