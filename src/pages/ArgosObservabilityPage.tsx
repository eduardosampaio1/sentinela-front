import { Radar } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { argosCards } from "@/lib/dashboardModel";
import SignalScoreCard from "@/components/dashboard-v2/SignalScoreCard";

export default function ArgosObservabilityPage() {
  const { result } = useAnalysis();
  const cards = argosCards(result);

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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <SignalScoreCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
