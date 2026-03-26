import { Coins, Radar } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { argosCards } from "@/lib/dashboardModel";
import DashboardModuleHero from "@/components/dashboard/DashboardModuleHero";
import SignalScoreCard from "@/components/dashboard-v2/SignalScoreCard";
import AccordionPanel from "@/components/ui/AccordionPanel";

export default function ArgosObservabilityPage() {
  const { result } = useAnalysis();
  const cards = argosCards(result);
  const semanticCards = cards.filter((item) => item.id !== "token-efficiency");
  const tokenCards = cards.filter((item) => item.id === "token-efficiency");

  return (
    <div className="page-stack">
      <DashboardModuleHero
        eyebrow="Analysis module"
        title="Semantic and efficiency observability"
        description="Audit the quality signals behind the current run: semantic consistency, stability, and token efficiency in one command surface."
        icon={<Radar className="h-5 w-5" />}
        chips={[
          { label: result?.analysis_run_id ? "Run loaded" : "No run loaded", tone: result ? "safe" : "watch" },
          { label: "Signal cards", tone: "primary" },
        ]}
        stats={[
          { label: "Semantic signals", value: String(semanticCards.length), helper: "Consistency, dispersion, and stability indicators." },
          { label: "Efficiency signals", value: String(tokenCards.length), helper: "Token and cost-related observability cards." },
          { label: "Analysis run", value: result?.analysis_run_id ?? "Unavailable", helper: "Current payload attached to this module." },
        ]}
      />

      <AccordionPanel
        title="Semantic consistency"
        icon={<Radar className="h-4 w-4" />}
        badge={
          <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
            {semanticCards.length} cards
          </span>
        }
        defaultOpen
      >
        <div className="mb-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review the quality layer first. This is where semantic degradation and stability pressure usually appear before cost symptoms become obvious.
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {semanticCards.map((item) => (
            <SignalScoreCard key={item.id} item={item} />
          ))}
        </div>
      </AccordionPanel>

      <AccordionPanel
        title="Token and cost breakdown"
        icon={<Coins className="h-4 w-4" />}
        badge={
          <span className="rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] text-muted-foreground">
            {tokenCards.length} cards
          </span>
        }
        defaultOpen={false}
      >
        <div className="mb-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Open this layer when quality issues start showing financial pressure. Token efficiency is the bridge between observability and economics.
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tokenCards.map((item) => (
            <SignalScoreCard key={item.id} item={item} />
          ))}
        </div>
      </AccordionPanel>
    </div>
  );
}
