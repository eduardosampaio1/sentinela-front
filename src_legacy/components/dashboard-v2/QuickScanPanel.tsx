import { useMemo, useState } from "react";
import { ScanSearch, Loader2, Languages, Radar, Layers3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { runQuickScan, type QuickScanResult } from "@/lib/quickScan";

interface QuickScanPanelProps {
  compact?: boolean;
  showDeepAnalysisCta?: boolean;
  onRunDeeperAnalysis?: () => void;
}

const PLACEHOLDER = "Paste user questions or AI responses here.";

const EMPTY_RESULT: QuickScanResult = {
  detectedIntents: [],
  languageVariance: 0,
  responseVariation: 0,
  confidenceLevel: "Low",
  confidenceMeter: {
    score: 0,
    level: "low",
    factors: {
      sampleComponent: 0,
      parseComponent: 0,
      structureComponent: 0,
      intentComponent: 0,
      variationComponent: 0,
    },
  },
  sampleSize: 0,
  notes: [
    "This is a surface scan based on a small sample.",
    "Quick Scan does not replace a full analysis run.",
  ],
  metadata: {
    totalItems: 0,
    parsedJsonItems: 0,
    structuredItems: 0,
  },
  source: "mock",
};

export default function QuickScanPanel({
  compact = false,
  showDeepAnalysisCta = false,
  onRunDeeperAnalysis,
}: QuickScanPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickScanResult | null>(null);

  const intentLabel = useMemo(() => {
    const intents = result?.detectedIntents ?? [];
    if (!intents.length) return "No intent pattern detected yet";
    return intents.join(" | ");
  }, [result?.detectedIntents]);

  async function handleRun() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const output = await runQuickScan(input);
      setResult(output);
    } finally {
      setLoading(false);
    }
  }

  const resolvedResult = result ?? EMPTY_RESULT;
  const confidenceScore = Math.max(0, Math.min(100, resolvedResult.confidenceMeter.score));
  const hasResult = result !== null;

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <ScanSearch className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Quick Scan</h2>
      </div>

      <p className="mb-2 text-sm text-muted-foreground">
        Surface scan for immediate triage before full analysis.
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        Recommended sample: 3-5 conversations.
      </p>

      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={PLACEHOLDER}
        className={`${compact ? "min-h-[130px]" : "min-h-[220px]"} resize-y border-border/60 bg-background/60`}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={handleRun} disabled={loading || !input.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4" />}
          Run Quick Scan
        </Button>
        <span className="text-xs text-muted-foreground">
          This is a surface scan based on a small sample.
        </span>
      </div>

      {hasResult ? (
        <>
          <div className={`mt-4 grid gap-3 ${compact ? "sm:grid-cols-2" : "lg:grid-cols-4"}`}>
            <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <Layers3 className="h-3.5 w-3.5" />
                Detected intents
              </div>
              <p className="text-sm text-foreground">{intentLabel}</p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <Languages className="h-3.5 w-3.5" />
                Language variance
              </div>
              <p className="text-sm text-foreground">{resolvedResult.languageVariance.toFixed(1)}%</p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <Radar className="h-3.5 w-3.5" />
                Response variation
              </div>
              <p className="text-sm text-foreground">{resolvedResult.responseVariation.toFixed(1)}%</p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
              <div className="mb-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Confidence level</div>
              <p className="text-sm text-foreground">
                {resolvedResult.confidenceLevel}
                <span className="ml-2 text-xs text-muted-foreground">({resolvedResult.source})</span>
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 bg-background/50 p-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <span>Confidence meter</span>
              <span>{confidenceScore.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/70">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-card/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Sample size</p>
                <p className="text-sm text-foreground">{resolvedResult.sampleSize}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Parsed JSON</p>
                <p className="text-sm text-foreground">{resolvedResult.metadata.parsedJsonItems}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Structured rows</p>
                <p className="text-sm text-foreground">{resolvedResult.metadata.structuredItems}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {resolvedResult.notes.map((note) => (
              <p key={note} className="text-xs text-muted-foreground">
                {note}
              </p>
            ))}
          </div>

          {showDeepAnalysisCta ? (
            <div className="mt-4">
              <Button onClick={onRunDeeperAnalysis} className="w-full sm:w-auto">
                Run a deeper analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
