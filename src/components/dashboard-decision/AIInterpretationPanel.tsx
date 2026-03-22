import { Bot, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InterpretationPanelModel } from "@/lib/decisionLayerModel";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";

type InterpretationStatus = "not_requested" | "queued" | "running" | "completed" | "failed";

interface AIInterpretationPanelProps {
  model: InterpretationPanelModel;
  loading: boolean;
  error: string;
  generatedAt?: string;
  status: InterpretationStatus;
  canGenerate: boolean;
  isLocked: boolean;
  onGenerate: () => void;
}

function hasInterpretationContent(model: InterpretationPanelModel) {
  return Boolean(model.summary || model.businessImpact || model.riskProjection);
}

function buttonLabel(status: InterpretationStatus, hasContent: boolean, loading: boolean) {
  if (loading || status === "queued" || status === "running") return "Generating...";
  if (status === "completed" && hasContent) return "Interpretation Locked";
  return "Generate Interpretation";
}

function statusChip(status: InterpretationStatus, isLocked: boolean) {
  if (isLocked) return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (status === "failed") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (status === "queued" || status === "running") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  if (status === "completed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return "border-border/60 bg-background/35 text-muted-foreground";
}

export default function AIInterpretationPanel({
  model,
  loading,
  error,
  generatedAt,
  status,
  canGenerate,
  isLocked,
  onGenerate,
}: AIInterpretationPanelProps) {
  const hasContent = hasInterpretationContent(model);
  const pending = status === "queued" || status === "running" || loading;

  return (
    <section className="dashboard-panel overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="dashboard-kicker">Executive translation</span>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${statusChip(status, isLocked)}`}>
              {isLocked
                ? "Locked to this run"
                : pending
                  ? "Generating"
                  : status === "failed"
                    ? "Generation failed"
                    : hasContent
                      ? "Available"
                      : "Optional"}
            </span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">AI Interpretation</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Keep the current interpretation logic exactly as-is, but present it as an executive readout: what it means, what it impacts, and where the risk goes next.
          </p>
          {generatedAt ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Saved at {new Date(generatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-border/55 bg-background/35 p-4 xl:min-w-[320px]">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-medium text-foreground">Interpretation control</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Generate once per analysis run. After generation, the interpretation remains locked to preserve traceability.
          </p>

          <Button
            onClick={onGenerate}
            disabled={!canGenerate || pending}
            className="mt-4 w-full rounded-2xl"
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            {buttonLabel(status, hasContent, loading)}
          </Button>
        </div>
      </div>

      {pending ? (
        <div className="mt-5 rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-4 text-sm text-sky-100">
          Generating concise interpretation...
        </div>
      ) : null}

      {!pending && !hasContent ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-border/60 bg-background/20 px-4 py-5 text-sm leading-6 text-muted-foreground">
          Generate interpretation to add business impact and risk projection context. After generation, the interpretation is locked to this analysis run.
        </div>
      ) : null}

      {!pending && hasContent ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[24px] border border-border/55 bg-background/35 p-4 sm:p-5">
            <p className="dashboard-kicker">Executive summary</p>
            <p className="mt-3 text-sm leading-7 text-foreground">
              {model.summary ?? <MissingDataBadge />}
            </p>
          </article>

          <div className="grid gap-4">
            <article className="rounded-[24px] border border-border/55 bg-background/35 p-4 sm:p-5">
              <p className="dashboard-kicker">Business impact</p>
              <p className="mt-3 text-sm leading-7 text-foreground">
                {model.businessImpact ?? <MissingDataBadge />}
              </p>
            </article>

            <article className="rounded-[24px] border border-border/55 bg-background/35 p-4 sm:p-5">
              <p className="dashboard-kicker">Risk projection</p>
              <p className="mt-3 text-sm leading-7 text-foreground">
                {model.riskProjection ?? <MissingDataBadge />}
              </p>
            </article>
          </div>
        </div>
      ) : null}

      {!pending && error ? (
        <div className="mt-5 rounded-[24px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
    </section>
  );
}
