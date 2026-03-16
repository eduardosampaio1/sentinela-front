import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3, Filter, History, Loader2, Search, SplitSquareVertical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/api";

type HistoryRun = {
  id: string;
  created_at: string;
  engine_version: string | null;
  risk_level: string | null;
  n_conversations: number | null;
  n_intents: number | null;
  raw_result: AnalysisResult | null;
};

type HistoryMetrics = {
  consistency: number | null;
  confidence: number | null;
  tokenWaste: number | null;
  alerts: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeMetric(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value <= 1 ? value * 100 : value;
}

function extractMetrics(run: HistoryRun): HistoryMetrics {
  const raw = (run.raw_result ?? {}) as Record<string, unknown>;
  const alerts = Array.isArray(raw.alerts) ? raw.alerts.length : 0;
  return {
    consistency:
      typeof raw.consistency_score === "number" ? normalizeMetric(raw.consistency_score) : null,
    confidence:
      typeof raw.global_confidence === "number" ? normalizeMetric(raw.global_confidence) : null,
    tokenWaste: typeof raw.token_waste_estimate === "number" ? raw.token_waste_estimate : null,
    alerts,
  };
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function riskPillClass(risk?: string | null) {
  switch ((risk ?? "").toUpperCase()) {
    case "LOW":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "MEDIUM":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "HIGH":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const { loadStoredAnalysis } = useAnalysis();

  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL");
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);

  useEffect(() => {
    if (!workspace?.id) {
      setRuns([]);
      return;
    }

    setLoading(true);
    setError(null);

    void supabase
      .from("analysis_runs")
      .select("id, created_at, engine_version, risk_level, n_conversations, n_intents, raw_result")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) throw fetchError;
        setRuns((Array.isArray(data) ? data : []) as HistoryRun[]);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load analysis history.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspace?.id]);

  const filteredRuns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return runs.filter((run) => {
      if (riskFilter !== "ALL" && (run.risk_level ?? "").toUpperCase() !== riskFilter) {
        return false;
      }
      if (!normalizedSearch) return true;
      const metrics = extractMetrics(run);
      const blob = [
        run.id,
        run.engine_version ?? "",
        run.risk_level ?? "",
        run.n_conversations ?? "",
        run.n_intents ?? "",
        metrics.consistency ?? "",
        metrics.confidence ?? "",
        metrics.tokenWaste ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(normalizedSearch);
    });
  }, [riskFilter, runs, search]);

  const summary = useMemo(() => {
    const consistencies = runs.map((run) => extractMetrics(run).consistency);
    const confidences = runs.map((run) => extractMetrics(run).confidence);
    return {
      total: runs.length,
      avgConsistency: average(consistencies),
      avgConfidence: average(confidences),
      highRiskCount: runs.filter((run) => (run.risk_level ?? "").toUpperCase() === "HIGH").length,
    };
  }, [runs]);

  const compareA = selectedRuns[0] ? filteredRuns.find((run) => run.id === selectedRuns[0]) : null;
  const compareB = selectedRuns[1] ? filteredRuns.find((run) => run.id === selectedRuns[1]) : null;

  function toggleSelection(runId: string) {
    setSelectedRuns((current) => {
      if (current.includes(runId)) {
        return current.filter((id) => id !== runId);
      }
      if (current.length >= 2) {
        return [current[1], runId];
      }
      return [...current, runId];
    });
  }

  function openRun(run: HistoryRun) {
    if (!run.raw_result) return;
    loadStoredAnalysis(run.raw_result);
    navigate("/dashboard");
  }

  function openLatestRun() {
    if (runs.length === 0) return;
    const latest = runs[0];
    if (latest) openRun(latest);
  }

  function compareLatestVsPrevious() {
    if (runs.length < 2) return;
    setSelectedRuns([runs[0].id, runs[1].id]);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-primary">Analysis History</p>
        <h1 className="text-2xl font-semibold text-foreground">Analysis timeline and regressions</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Track run-to-run behavior changes, compare recent analyses, and reopen any previous result.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Total runs</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Average consistency</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {summary.avgConsistency === null ? "N/A" : `${summary.avgConsistency.toFixed(1)}%`}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Average confidence</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {summary.avgConfidence === null ? "N/A" : `${summary.avgConfidence.toFixed(1)}%`}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">High-risk runs</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{summary.highRiskCount}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button onClick={openLatestRun} disabled={runs.length === 0}>
            Open latest run
          </Button>
          <Button variant="outline" onClick={compareLatestVsPrevious} disabled={runs.length < 2}>
            Compare latest vs previous
          </Button>
        </div>
      </section>

      {compareA && compareB ? (
        <section className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <SplitSquareVertical className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Run comparison</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[compareA, compareB].map((run, index) => {
              const metrics = extractMetrics(run);
              return (
                <article key={run.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {index === 0 ? "Run A" : "Run B"}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{formatDate(run.created_at)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">ID: {run.id}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Consistency: {metrics.consistency?.toFixed(1) ?? "N/A"}% | Confidence:{" "}
                    {metrics.confidence?.toFixed(1) ?? "N/A"}% | Alerts: {metrics.alerts}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-base font-semibold text-foreground">Run list</h2>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by id, risk, or engine..."
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div className="relative min-w-[170px]">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value as "ALL" | "LOW" | "MEDIUM" | "HIGH")}
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="ALL">All risk levels</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history...
          </div>
        ) : null}

        {!loading && error ? <p className="text-sm text-red-400">{error}</p> : null}

        {!loading && !error && filteredRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <History className="h-9 w-9 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">No matching runs found</p>
            <p className="max-w-xl text-sm text-muted-foreground">
              Adjust filters or run a new analysis to populate history.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {filteredRuns.map((run) => {
            const metrics = extractMetrics(run);
            const selected = selectedRuns.includes(run.id);
            return (
              <article
                key={run.id}
                className={`rounded-2xl border p-4 transition ${
                  selected ? "border-primary bg-primary/5" : "border-border/70 bg-background/50"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-sm text-foreground">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        {formatDate(run.created_at)}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${riskPillClass(run.risk_level)}`}>
                        {(run.risk_level ?? "unknown").toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Engine: {run.engine_version ?? "N/A"} | Conversations: {run.n_conversations ?? 0} |
                      Intents: {run.n_intents ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Consistency: {metrics.consistency?.toFixed(1) ?? "N/A"}% | Confidence:{" "}
                      {metrics.confidence?.toFixed(1) ?? "N/A"}% | Token waste:{" "}
                      {metrics.tokenWaste?.toFixed(2) ?? "N/A"} | Alerts: {metrics.alerts}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={selected ? "default" : "outline"} onClick={() => toggleSelection(run.id)}>
                      {selected ? "Selected" : "Compare"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openRun(run)} disabled={!run.raw_result}>
                      Open
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
