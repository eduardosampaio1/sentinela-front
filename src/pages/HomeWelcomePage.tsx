import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasUserAnalysisRuns } from "@/lib/analysisRuns";

export default function HomeWelcomePage() {
  const { user } = useAuth() as { user?: { id: string; email?: string } | null };
  const [, setHasRuns] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void hasUserAnalysisRuns(user.id)
      .then(setHasRuns)
      .catch(() => setHasRuns(false));
  }, [user?.id]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-semibold text-foreground">
        Your first analysis: Quick Scan or Deep Analysis?
      </h1>
      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          className="rounded-xl border border-border bg-card px-8 py-4 text-sm font-medium text-foreground transition-colors hover:bg-card/80"
        >
          Quick Scan
        </button>
        <button
          type="button"
          className="rounded-xl border border-primary bg-primary/10 px-8 py-4 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Deep Analysis
        </button>
      </div>
    </main>
  );
}
