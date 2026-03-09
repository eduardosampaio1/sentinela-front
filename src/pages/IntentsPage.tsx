import { useMemo, useState } from "react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import EmptyState from "@/components/dashboard/EmptyState";
import MetricInfo from "@/components/dashboard/MetricInfo";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPercent, getConsistencyHealth, healthColor, progressColor } from "@/lib/metrics";

const IntentsPage = () => {
  const { result, dataSource } = useAnalysis();
  const [sortBy, setSortBy] = useState("stability-asc");

  const intents = result?.intents ?? [];

  const sorted = useMemo(() => {
    const items = [...intents];
    if (sortBy === "stability-asc") items.sort((a, b) => (a.response_stability_score ?? a.consistency_score ?? 0) - (b.response_stability_score ?? b.consistency_score ?? 0));
    if (sortBy === "stability-desc") items.sort((a, b) => (b.response_stability_score ?? b.consistency_score ?? 0) - (a.response_stability_score ?? a.consistency_score ?? 0));
    if (sortBy === "variance") items.sort((a, b) => (b.response_variance ?? 0) - (a.response_variance ?? 0));
    if (sortBy === "volume") items.sort((a, b) => (b.n_conversations ?? 0) - (a.n_conversations ?? 0));
    return items;
  }, [intents, sortBy]);

  if (!result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Intents</h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Intents</h1>
          <p className="text-sm text-muted-foreground">This should behave like a ranked backlog, not just a list of labels and percentages.</p>
        </div>
        <Badge variant={dataSource === "fresh" ? "default" : "secondary"} className="text-xs">
          {dataSource === "fresh" ? "Fresh" : "Cached"}
        </Badge>
      </div>

      {!intents.length ? (
        <EmptyState title="No intent detail available" description="The current analysis did not return per-intent stability metrics." />
      ) : (
        <>
          <div className="flex justify-end">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[220px] rounded-2xl border-border bg-card/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stability-asc">Lowest stability first</SelectItem>
                <SelectItem value="stability-desc">Highest stability first</SelectItem>
                <SelectItem value="variance">Highest variance first</SelectItem>
                <SelectItem value="volume">Highest volume first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">
            <MetricInfo title="Intent priority board" tooltip="Sort by the combination that matters to you: instability, variance or sheer volume." />
            <div className="space-y-3">
              {sorted.map((intent, index) => {
                const stability = intent.response_stability_score ?? intent.consistency_score ?? 0;
                const tone = getConsistencyHealth(stability);
                return (
                  <div key={intent.intent} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm text-muted-foreground">{index + 1}</div>
                        <div>
                          <div className="font-mono text-sm text-foreground">{intent.intent}</div>
                          <div className="text-xs text-muted-foreground">
                            {intent.n_conversations ?? 0} convs · mean chars {intent.mean_assistant_chars ?? "N/A"} · std {intent.std_assistant_chars ?? "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className={healthColor(String(tone))}>Stability {formatPercent(stability)}</Badge>
                        <Badge variant="outline">Variance {formatPercent(intent.response_variance)}</Badge>
                        {intent.severity ? <Badge variant="outline">{intent.severity}</Badge> : null}
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${progressColor(String(tone))}`} style={{ width: `${Math.max(6, stability)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default IntentsPage;
