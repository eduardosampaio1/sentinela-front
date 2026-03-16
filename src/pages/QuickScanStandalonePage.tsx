import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QuickScanPanel from "@/components/dashboard-v2/QuickScanPanel";
import { Button } from "@/components/ui/button";

export default function QuickScanStandalonePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 sm:px-6">
        <Button variant="ghost" onClick={() => navigate("/home")} className="px-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-foreground">Quick Scan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use a small sample (3-5 conversations) for a rapid preview before a deeper analysis.
          </p>
        </section>

        <QuickScanPanel
          showDeepAnalysisCta
          onRunDeeperAnalysis={() => navigate("/home?start=dataset")}
        />
      </div>
    </div>
  );
}
