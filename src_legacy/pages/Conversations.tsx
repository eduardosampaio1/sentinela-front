import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Database, Eye, Filter, GitCompareArrows, MessageSquareQuote, Search, ShieldAlert } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import {
  buildSyntheticConversationRows,
  extractConfusingPairs,
  formatNumber,
  formatPercentSmart,
  normalizeSeverity,
  pickConversationDetails,
  severityTone,
  type AlertLike,
  type ConversationDetailLike,
  type IntentVarianceLike,
} from "@/lib/observability";

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function sectionCardClass(extra = "") {
  return `rounded-2xl border border-border bg-card p-5 ${extra}`.trim();
}

function severityBadge(value?: string) {
  const level = normalizeSeverity(value);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${severityTone(level)}`}>
      {value ?? "unknown"}
    </span>
  );
}

export default function ConversationsPage() {
  const { result, dataSource } = useAnalysis();
  const [selectedIntent, setSelectedIntent] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const analysis = (result ?? null) as unknown as (Record<string, unknown> & {
    created_at?: string;
    engine_version?: string;
    n_conversations?: number;
    n_intents?: number;
    cross_intent_similarity?: number;
    response_variance_by_intent?: IntentVarianceLike[];
    alerts?: AlertLike[];
    intent_coverage_score?: number;
    covered_intents?: number;
    total_intents?: number;
    critical_alerts_count?: number;
    global_confidence?: number;
  }) | null;

  const intents = useMemo<IntentVarianceLike[]>(() => {
    if (!analysis?.response_variance_by_intent || !Array.isArray(analysis.response_variance_by_intent)) return [];
    return analysis.response_variance_by_intent;
  }, [analysis]);

  const alerts = useMemo<AlertLike[]>(() => {
    if (!analysis?.alerts || !Array.isArray(analysis.alerts)) return [];
    return analysis.alerts;
  }, [analysis]);

  const rawConversationRows = useMemo<ConversationDetailLike[]>(() => {
    if (!analysis) return [];
    return pickConversationDetails(analysis);
  }, [analysis]);

  const syntheticRows = useMemo<ConversationDetailLike[]>(() => {
    return buildSyntheticConversationRows(intents, alerts, analysis?.cross_intent_similarity);
  }, [analysis?.cross_intent_similarity, alerts, intents]);

  const rows = rawConversationRows.length > 0 ? rawConversationRows : syntheticRows;
  const confusingPairs = useMemo(() => extractConfusingPairs(alerts), [alerts]);

  const intentOptions = useMemo(() => ["ALL", ...new Set(rows.map((row) => row.intent).filter(Boolean) as string[])], [rows]);
  const severityOptions = ["ALL", "critical", "high", "warning", "info", "unknown"];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesIntent = selectedIntent === "ALL" || row.intent === selectedIntent;
      const matchesSeverity = severityFilter === "ALL" || normalizeSeverity(row.severity) === severityFilter;
      const haystack = [row.conversation_id, row.intent, row.user_text, row.assistant_text, row.issue].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = query.length === 0 || haystack.includes(query);
      return matchesIntent && matchesSeverity && matchesQuery;
    });
  }, [rows, search, selectedIntent, severityFilter]);

  const worstIntent = useMemo(() => {
    return [...intents].sort((a, b) => (a.response_stability_score ?? 100) - (b.response_stability_score ?? 100))[0] ?? null;
  }, [intents]);

  if (!analysis) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Run an analysis first. This page becomes your observability console after the motor writes a result to cache.</p>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Database className="mx-auto h-10 w-10 text-muted-foreground" />
          <div className="mt-4 text-lg font-semibold text-foreground">No analysis cached yet</div>
          <p className="mt-2 text-sm text-muted-foreground">The Conversations page reads the most recent analysis stored by the motor. Upload a dataset or import a result in Overview first.</p>
        </div>
      </div>
    );
  }

  const backendHasDetails = rawConversationRows.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Observability console for the latest motor run. It uses the cached analysis automatically, so the page remains usable even after navigation or reload.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full border border-border bg-muted/50 px-3 py-1.5">Source: {dataSource === "cached" ? "cached analysis" : "fresh analysis"}</span>
          <span className="rounded-full border border-border bg-muted/50 px-3 py-1.5">Engine: {analysis.engine_version ?? "N/A"}</span>
          <span className="rounded-full border border-border bg-muted/50 px-3 py-1.5">Last analysis: {formatDate(analysis.created_at)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={sectionCardClass()}>
          <div className="flex items-center gap-3 text-sm text-muted-foreground"><ShieldAlert className="h-4 w-4" /> Critical alerts</div>
          <div className="mt-3 text-4xl font-bold text-red-400">{analysis.critical_alerts_count ?? 0}</div>
          <p className="mt-2 text-sm text-muted-foreground">Use this as the first triage queue when you need to inspect the most dangerous behavior regressions.</p>
        </div>
        <div className={sectionCardClass()}>
          <div className="flex items-center gap-3 text-sm text-muted-foreground"><GitCompareArrows className="h-4 w-4" /> Confusing intent pairs</div>
          <div className="mt-3 text-4xl font-bold text-orange-400">{confusingPairs.length}</div>
          <p className="mt-2 text-sm text-muted-foreground">Derived from backend alerts. These are the clearest signs of intent collision in the last run.</p>
        </div>
        <div className={sectionCardClass()}>
          <div className="flex items-center gap-3 text-sm text-muted-foreground"><Activity className="h-4 w-4" /> Worst stability intent</div>
          <div className="mt-3 text-xl font-bold text-foreground">{worstIntent?.intent ?? "N/A"}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {worstIntent
              ? `${formatPercentSmart(worstIntent.response_stability_score)} stability • ${formatPercentSmart(worstIntent.response_variance)} variance`
              : "No intent-level stability data available."}
          </p>
        </div>
        <div className={sectionCardClass()}>
          <div className="flex items-center gap-3 text-sm text-muted-foreground"><Database className="h-4 w-4" /> Detail mode</div>
          <div className="mt-3 text-xl font-bold text-foreground">{backendHasDetails ? "Real conversation rows" : "Derived from cached analysis"}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {backendHasDetails
              ? "Backend returned per-conversation records for direct investigation."
              : "Backend did not return raw conversation rows, so this page derives an observability queue from the cached intent and alert signals."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr,0.9fr]">
        <div className={sectionCardClass()}>
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground"><GitCompareArrows className="h-5 w-5" /> Confusing intent pairs</div>
          {confusingPairs.length === 0 ? (
            <p className="text-sm text-muted-foreground">The backend did not emit explicit pair-collision alerts for this run.</p>
          ) : (
            <div className="space-y-3">
              {confusingPairs.map((pair) => (
                <div key={`${pair.pairLabel}-${pair.hint}`} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-foreground">{pair.pairLabel}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{pair.title}</div>
                    </div>
                    {severityBadge(pair.severity)}
                  </div>
                  <p className="mt-3 text-sm text-foreground/80">{pair.hint}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={sectionCardClass()}>
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground"><Eye className="h-5 w-5" /> Run diagnostics</div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="font-medium text-foreground">Dataset coverage</div>
              <div className="mt-2 text-2xl font-bold text-cyan-400">{formatPercentSmart(analysis.intent_coverage_score)}</div>
              <div className="mt-1">{analysis.covered_intents ?? 0} of {analysis.total_intents ?? 0} intents covered in this run.</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="font-medium text-foreground">Analysis confidence</div>
              <div className="mt-2 text-2xl font-bold text-cyan-400">{formatPercentSmart(analysis.global_confidence)}</div>
              <div className="mt-1">Confidence in the diagnosis quality, not in the assistant quality.</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="font-medium text-foreground">Cross-intent similarity</div>
              <div className="mt-2 text-2xl font-bold text-red-400">{formatPercentSmart(analysis.cross_intent_similarity)}</div>
              <div className="mt-1">High values indicate generic responses leaking across different intents.</div>
            </div>
          </div>
        </div>
      </div>

      <div className={sectionCardClass()}>
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground"><Filter className="h-5 w-5" /> Investigation queue</div>
            <p className="mt-1 text-sm text-muted-foreground">Filter the rows below to inspect the highest-risk intents or per-conversation records from the latest cached run.</p>
          </div>
          <div className="grid w-full gap-3 md:grid-cols-3 xl:max-w-4xl">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Intent</span>
              <select value={selectedIntent} onChange={(e) => setSelectedIntent(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none">
                {intentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Severity</span>
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none">
                {severityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Search</span>
              <div className="flex items-center rounded-xl border border-border bg-background px-3 py-2">
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="intent, issue, conversation id..." className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <div className="min-w-[960px]">
          <div className="grid grid-cols-[1.2fr,0.7fr,0.7fr,0.6fr,0.7fr,0.8fr] gap-3 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div>Conversation / Intent</div>
            <div>Issue</div>
            <div>Stability</div>
            <div>Variance</div>
            <div>Tokens</div>
            <div>Severity</div>
          </div>
          {filteredRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No rows match the current filters.</div>
          ) : (
            filteredRows.map((row) => {
              const rowId = row.conversation_id ?? `${row.intent}-${row.issue}`;
              const expanded = expandedId === rowId;
              return (
                <div key={rowId} className="border-t border-border">
                  <button type="button" onClick={() => setExpandedId(expanded ? null : rowId)} className="grid w-full grid-cols-[1.2fr,0.7fr,0.7fr,0.6fr,0.7fr,0.8fr] gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/20">
                    <div>
                      <div className="font-medium text-foreground">{row.conversation_id ?? "derived-row"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{row.intent ?? "N/A"}</div>
                    </div>
                    <div className="text-sm text-foreground/80">{row.issue ?? "No issue summary"}</div>
                    <div className="text-sm text-foreground">{formatPercentSmart(row.response_stability_score)}</div>
                    <div className="text-sm text-foreground">{formatPercentSmart(row.response_variance)}</div>
                    <div className="text-sm text-foreground">{formatNumber(row.tokens)}</div>
                    <div>{severityBadge(row.severity)}</div>
                  </button>
                  {expanded && (
                    <div className="grid gap-4 border-t border-border bg-muted/10 px-4 py-4 md:grid-cols-2">
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><MessageSquareQuote className="h-4 w-4" /> User side</div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">{row.user_text ?? "No raw user prompt available for this row."}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><AlertTriangle className="h-4 w-4" /> Assistant / observability note</div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">{row.assistant_text ?? "No raw assistant answer available for this row."}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>

      <div className={sectionCardClass()}>
        <div className="mb-4 text-lg font-semibold text-foreground">Alert stream</div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts were emitted by the motor in the cached run.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={`${alert.title}-${index}`} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-foreground">{alert.title ?? "Observability signal"}</div>
                    <p className="mt-1 text-sm text-foreground/80">{alert.hint ?? "No hint provided."}</p>
                  </div>
                  {severityBadge(alert.severity)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
