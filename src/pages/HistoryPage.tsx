import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3, History, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalysis } from "@/contexts/AnalysisContext";
import type { AnalysisResult } from "@/lib/api";
import { Button } from "@/components/ui/button";

type HistoryRun = {
  id: string;
  created_at: string;
  engine_version: string | null;
  risk_level: string | null;
  n_conversations: number | null;
  n_intents: number | null;
  raw_result: AnalysisResult;
};

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}


export default function HistoryPage() {
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const { loadStoredAnalysis } = useAnalysis();

  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (!workspace?.id) return;

  async function fetchRuns() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("analysis_runs")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError(error.message);
      setRuns([]);
    } else {
      setRuns(data ?? []);
    }

    setLoading(false);
  }

  fetchRuns();
}, [workspace?.id]);

  function handleOpenRun(run: HistoryRun) {
    loadStoredAnalysis(run.raw_result);
    navigate("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review previous analysis runs and load one back into the dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history...
          </div>
        ) : error ? (
          <div className="text-sm text-red-400">
            Failed to load history: {error}
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <History className="h-10 w-10 text-muted-foreground" />
            <div className="text-lg font-semibold text-foreground">No analysis history yet</div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Run your first dataset analysis and it will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1.2fr,0.8fr,0.8fr,0.8fr,0.8fr,0.7fr] gap-3 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div>Date</div>
              <div>Engine</div>
              <div>Risk</div>
              <div>Conversations</div>
              <div>Intents</div>
              <div>Action</div>
            </div>

            {runs.map((run) => (
              <div
                key={run.id}
                className="grid grid-cols-[1.2fr,0.8fr,0.8fr,0.8fr,0.8fr,0.7fr] gap-3 border-t border-border px-4 py-4"
              >
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                  {formatDate(run.created_at)}
                </div>
                <div className="text-sm text-foreground">{run.engine_version ?? "N/A"}</div>
                <div className="text-sm text-foreground">{run.risk_level ?? "N/A"}</div>
                <div className="text-sm text-foreground">{run.n_conversations ?? 0}</div>
                <div className="text-sm text-foreground">{run.n_intents ?? 0}</div>
                <div>
                  <Button size="sm" variant="outline" onClick={() => handleOpenRun(run)}>
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}