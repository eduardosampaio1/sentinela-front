import { useMemo } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AnalysisRunSummary } from "@/lib/analysisRuns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunComparePanelProps {
  runA: AnalysisRunSummary; // older run
  runB: AnalysisRunSummary; // newer run
  onClose: () => void;
}

interface RunMetrics {
  behavior_score: number | null;
  consistency_score: number | null;
  cross_intent_similarity: number | null;
  response_stability_score: number | null;
  n_conversations: number | null;
  n_intents: number | null;
  risk_level: string | null;
  engine_version: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractMetrics(run: AnalysisRunSummary): RunMetrics {
  const raw = run.raw_result as Record<string, unknown> | null | undefined;
  const argos = raw?.argos_v2 as Record<string, unknown> | null | undefined;
  const argosScores = argos?.scores as Record<string, unknown> | null | undefined;

  function num(v: unknown): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }

  const behavior_score =
    num(raw?.behavior_score) ??
    num(argos?.behavior_score) ??
    num(argosScores?.behavior_score);

  const consistency_score = num(raw?.consistency_score);
  const cross_intent_similarity = num(raw?.cross_intent_similarity);
  const response_stability_score = num(raw?.response_stability_score);

  return {
    behavior_score,
    consistency_score,
    cross_intent_similarity,
    response_stability_score,
    n_conversations: run.n_conversations,
    n_intents: run.n_intents,
    risk_level: run.risk_level,
    engine_version: run.engine_version,
  };
}

const RISK_ORDER: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function riskScore(level: string | null): number {
  if (!level) return 0;
  return RISK_ORDER[level.toLowerCase()] ?? 0;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#34D399";
  if (score >= 60) return "#FCD34D";
  if (score >= 40) return "#FB923C";
  return "#F87171";
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-xs text-[#475569]">—</span>;

  const upper = level.toUpperCase();
  const styles: Record<string, string> = {
    CRITICAL: "bg-[rgba(248,113,113,0.10)] text-[#F87171] border-[rgba(248,113,113,0.18)]",
    HIGH:     "bg-[rgba(252,211,77,0.10)] text-[#FCD34D] border-[rgba(252,211,77,0.18)]",
    MEDIUM:   "bg-[rgba(251,146,60,0.10)] text-[#FB923C] border-[rgba(251,146,60,0.18)]",
    LOW:      "bg-[rgba(52,211,153,0.10)] text-[#34D399] border-[rgba(52,211,153,0.18)]",
  };
  const style = styles[upper] ?? "bg-[rgba(79,90,232,0.10)] text-[#4F5AE8] border-[rgba(79,90,232,0.18)]";

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border", style)}>
      {level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────

function MiniBar({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-16 h-1 rounded-full overflow-hidden bg-[rgba(255,255,255,0.06)] inline-block align-middle ml-1.5">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: scoreColor(pct) }}
      />
    </div>
  );
}

// ─── Delta cell ───────────────────────────────────────────────────────────────

type DeltaDirection = "better" | "worse" | "neutral" | "same";

interface NumericDelta {
  kind: "numeric";
  delta: number;
  direction: DeltaDirection;
}
interface RiskDelta {
  kind: "risk";
  direction: DeltaDirection;
  label: string;
}
interface TextDelta {
  kind: "text";
  changed: boolean;
}
interface NullDelta {
  kind: "null";
}

type DeltaInfo = NumericDelta | RiskDelta | TextDelta | NullDelta;

function NumericDeltaCell({ info }: { info: NumericDelta }) {
  const positive = info.delta > 0;
  const isGood = info.direction === "better";
  const isBad = info.direction === "worse";

  const color = isGood ? "#34D399" : isBad ? "#F87171" : "#94A3B8";
  const sign = positive ? "+" : "";
  const arrow = positive ? "↑" : info.delta < 0 ? "↓" : "";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs font-semibold" style={{ color }}>
        {arrow} {sign}{Math.round(info.delta * 10) / 10}
      </span>
      {info.direction !== "neutral" && (
        <span className="text-[10px]" style={{ color }}>
          ({info.direction})
        </span>
      )}
    </div>
  );
}

function RiskDeltaCell({ info }: { info: RiskDelta }) {
  const color =
    info.direction === "better" ? "#34D399" :
    info.direction === "worse" ? "#F87171" : "#94A3B8";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs font-semibold" style={{ color }}>{info.label}</span>
      {info.direction !== "neutral" && (
        <span className="text-[10px]" style={{ color }}>({info.direction})</span>
      )}
    </div>
  );
}

function DeltaCell({ info }: { info: DeltaInfo }) {
  if (info.kind === "null") return <span className="text-[#475569] text-xs">—</span>;
  if (info.kind === "text") {
    return (
      <span className={cn("text-xs", info.changed ? "text-[#FCD34D]" : "text-[#475569]")}>
        {info.changed ? "changed" : "same"}
      </span>
    );
  }
  if (info.kind === "risk") return <RiskDeltaCell info={info} />;
  return <NumericDeltaCell info={info} />;
}

// ─── Value cell ───────────────────────────────────────────────────────────────

function NumericValue({ value, withBar }: { value: number | null; withBar?: boolean }) {
  if (value === null) return <span className="text-[#475569]">—</span>;
  return (
    <span className="inline-flex items-center gap-0 text-[#F1F5F9] font-semibold">
      {Math.round(value * 10) / 10}
      {withBar && <MiniBar value={value} />}
    </span>
  );
}

// ─── Column header ────────────────────────────────────────────────────────────

function ColumnHeader({ run, label }: { run: AnalysisRunSummary; label: string }) {
  return (
    <div className="flex flex-col gap-1 p-4 border-b border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">{label}</span>
        <RiskBadge level={run.risk_level} />
      </div>
      <p className="text-sm font-semibold text-[#F1F5F9]">{formatShortDate(run.created_at)}</p>
      <p className="text-[11px] text-[#475569]">{formatRelativeTime(run.created_at)}</p>
    </div>
  );
}

// ─── Metrics table ────────────────────────────────────────────────────────────

interface MetricRowDef {
  key: string;
  label: string;
  valueA: React.ReactNode;
  valueB: React.ReactNode;
  delta: DeltaInfo;
}

// Higher = better for these metrics
const HIGHER_IS_BETTER = new Set([
  "behavior_score",
  "consistency_score",
  "response_stability_score",
]);

// Lower = better for these (lower risk is better)
const LOWER_IS_BETTER = new Set([
  "cross_intent_similarity",
]);

function numericDelta(
  a: number | null,
  b: number | null,
  metricKey: string
): DeltaInfo {
  if (a === null || b === null) return { kind: "null" };
  const delta = b - a;
  if (delta === 0) return { kind: "numeric", delta: 0, direction: "neutral" };

  let direction: DeltaDirection;
  if (HIGHER_IS_BETTER.has(metricKey)) {
    direction = delta > 0 ? "better" : "worse";
  } else if (LOWER_IS_BETTER.has(metricKey)) {
    direction = delta < 0 ? "better" : "worse";
  } else {
    direction = "neutral";
  }

  return { kind: "numeric", delta, direction };
}

function buildMetricRows(a: RunMetrics, b: RunMetrics): MetricRowDef[] {
  // Risk delta
  const riskA = riskScore(a.risk_level);
  const riskB = riskScore(b.risk_level);
  const riskDeltaInfo: DeltaInfo = (riskA === 0 && riskB === 0)
    ? { kind: "null" }
    : riskA === riskB
    ? { kind: "risk", direction: "same", label: "unchanged" }
    : riskB < riskA
    ? { kind: "risk", direction: "better", label: "improved" }
    : { kind: "risk", direction: "worse", label: "regressed" };

  // Count deltas (neutral direction — neither good nor bad inherently)
  const convDelta: DeltaInfo = (a.n_conversations === null || b.n_conversations === null)
    ? { kind: "null" }
    : { kind: "numeric", delta: (b.n_conversations ?? 0) - (a.n_conversations ?? 0), direction: "neutral" };

  const intentDelta: DeltaInfo = (a.n_intents === null || b.n_intents === null)
    ? { kind: "null" }
    : { kind: "numeric", delta: (b.n_intents ?? 0) - (a.n_intents ?? 0), direction: "neutral" };

  const engineDelta: DeltaInfo = { kind: "text", changed: a.engine_version !== b.engine_version };

  return [
    {
      key: "behavior_score",
      label: "Behavior Score",
      valueA: <NumericValue value={a.behavior_score} withBar />,
      valueB: <NumericValue value={b.behavior_score} withBar />,
      delta: numericDelta(a.behavior_score, b.behavior_score, "behavior_score"),
    },
    {
      key: "risk_level",
      label: "Risk Level",
      valueA: <RiskBadge level={a.risk_level} />,
      valueB: <RiskBadge level={b.risk_level} />,
      delta: riskDeltaInfo,
    },
    {
      key: "cross_intent_similarity",
      label: "Semantic Drift",
      valueA: <NumericValue value={a.cross_intent_similarity} />,
      valueB: <NumericValue value={b.cross_intent_similarity} />,
      delta: numericDelta(a.cross_intent_similarity, b.cross_intent_similarity, "cross_intent_similarity"),
    },
    {
      key: "consistency_score",
      label: "Consistency Score",
      valueA: <NumericValue value={a.consistency_score} withBar />,
      valueB: <NumericValue value={b.consistency_score} withBar />,
      delta: numericDelta(a.consistency_score, b.consistency_score, "consistency_score"),
    },
    {
      key: "response_stability_score",
      label: "Response Stability",
      valueA: <NumericValue value={a.response_stability_score} withBar />,
      valueB: <NumericValue value={b.response_stability_score} withBar />,
      delta: numericDelta(a.response_stability_score, b.response_stability_score, "response_stability_score"),
    },
    {
      key: "n_conversations",
      label: "Conversations",
      valueA: <span className="text-[#F1F5F9] font-semibold">{a.n_conversations ?? "—"}</span>,
      valueB: <span className="text-[#F1F5F9] font-semibold">{b.n_conversations ?? "—"}</span>,
      delta: convDelta,
    },
    {
      key: "n_intents",
      label: "Intents",
      valueA: <span className="text-[#F1F5F9] font-semibold">{a.n_intents ?? "—"}</span>,
      valueB: <span className="text-[#F1F5F9] font-semibold">{b.n_intents ?? "—"}</span>,
      delta: intentDelta,
    },
    {
      key: "engine_version",
      label: "Engine Version",
      valueA: <span className="text-xs font-mono text-[#94A3B8]">{a.engine_version ?? "—"}</span>,
      valueB: <span className="text-xs font-mono text-[#94A3B8]">{b.engine_version ?? "—"}</span>,
      delta: engineDelta,
    },
  ];
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ rows }: { rows: MetricRowDef[] }) {
  let improved = 0;
  let total = 0;

  for (const row of rows) {
    const d = row.delta;
    if (d.kind === "numeric" || d.kind === "risk") {
      if (d.direction !== "neutral" && d.direction !== "same") {
        total++;
        if (d.direction === "better") improved++;
      }
    }
  }

  if (total === 0) {
    return (
      <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-center">
        <span className="text-xs text-[#475569]">Not enough numeric data to compare runs.</span>
      </div>
    );
  }

  const ratio = improved / total;
  const color = ratio >= 0.6 ? "#34D399" : ratio >= 0.4 ? "#FCD34D" : "#F87171";
  const label = `Run B improved on ${improved}/${total} metrics vs Run A`;

  return (
    <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-3">
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── RunComparePanel ──────────────────────────────────────────────────────────

export function RunComparePanel({ runA, runB, onClose }: RunComparePanelProps) {
  const metricsA = useMemo(() => extractMetrics(runA), [runA]);
  const metricsB = useMemo(() => extractMetrics(runB), [runB]);
  const rows = useMemo(() => buildMetricRows(metricsA, metricsB), [metricsA, metricsB]);

  const dateA = formatShortDate(runA.created_at);
  const dateB = formatShortDate(runB.created_at);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[rgba(7,12,24,0.7)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          height: "70vh",
          background: "#070C18",
          borderTop: "1px solid rgba(79,90,232,0.12)",
          boxShadow: "0 -24px 80px rgba(0,0,0,0.6)",
          animation: "slideUpPanel 0.28s cubic-bezier(0.32,0.72,0,1) both",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Compare runs"
      >
        <style>{`
          @keyframes slideUpPanel {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Compare runs</h2>
            <span className="text-xs text-[#475569] font-mono">{dateA} → {dateB}</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[#475569] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            aria-label="Close compare panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] border-b border-[rgba(255,255,255,0.06)]">
            {/* Run A header */}
            <ColumnHeader run={runA} label="Run A · Older" />

            {/* Center label */}
            <div className="flex items-center justify-center px-3 border-l border-r border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] [writing-mode:vertical-rl] rotate-180">
                Delta
              </span>
            </div>

            {/* Run B header */}
            <ColumnHeader run={runB} label="Run B · Newer" />

            {/* Spacer for symmetry */}
            <div />
            <div />
          </div>

          {/* Metric rows */}
          <div>
            {rows.map((row, i) => (
              <div
                key={row.key}
                className={cn(
                  "grid grid-cols-[1fr_auto_1fr] items-center border-b border-[rgba(255,255,255,0.04)] last:border-b-0",
                  i % 2 === 1 && "bg-[rgba(255,255,255,0.01)]"
                )}
              >
                {/* Value A */}
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-[11px] text-[#475569] font-semibold uppercase tracking-wider hidden sm:block">
                    {row.label}
                  </span>
                  <div className="flex items-center gap-2">{row.valueA}</div>
                </div>

                {/* Delta */}
                <div className="flex flex-col items-center justify-center px-4 py-3 border-l border-r border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)] min-w-[80px]">
                  <span className="text-[10px] text-[#475569] mb-1 sm:hidden">{row.label}</span>
                  <DeltaCell info={row.delta} />
                </div>

                {/* Value B */}
                <div className="flex items-center justify-end px-5 py-3">
                  <div className="flex items-center gap-2">{row.valueB}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex-shrink-0">
          <SummaryBar rows={rows} />
        </div>
      </div>
    </>
  );
}
