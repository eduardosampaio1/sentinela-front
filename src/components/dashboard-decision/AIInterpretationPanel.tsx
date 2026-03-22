import { Bot, Lock } from "lucide-react";
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
    <section className="rounded-[24px] border border-border/50 bg-card/55 p-4 shadow-sm backdrop-blur-md sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">AI Interpretation</h2>
          <p className="text-sm text-muted-foreground">Executive translation for this decision.</p>
          {generatedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Saved at: {new Date(generatedAt).toLocaleString()}
            </p>
            
          ) : null}
          {isLocked ? (
            <p className="mt-1 text-xs text-amber-300">
              One interpretation per analysis run. After generation, this artifact is locked.
            </p>
          ) : null}
        </div>
        {/* BUG FIX: Adicionado 'pending' para garantir que o botão trave no exato milissegundo do clique */}
        <Button onClick={onGenerate} disabled={!canGenerate || pending}>
          {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Bot className="mr-2 h-4 w-4" />}
          {buttonLabel(status, hasContent, loading)}
        </Button>
      </div>

      {pending ? (
        <div className="mt-3 rounded-xl border border-border/50 bg-background/30 px-3 py-3 text-sm text-muted-foreground">
          Generating concise interpretation...
        </div>
      ) : null}

      {!pending && !hasContent ? (
        <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-background/20 px-3 py-4 text-sm text-muted-foreground">
          Generate interpretation to add business impact and risk projection context. After generation, the interpretation is locked to this analysis run.
        </div>
      ) : null}

      {!pending && hasContent ? (
        <div className="mt-3 space-y-2.5">
          <article className="rounded-xl border border-border/50 bg-background/35 px-3 py-2.5">
            <p className="text-[11px] font-medium text-muted-foreground">Executive summary</p>
            <p className="mt-1 text-sm leading-snug text-foreground">
              {model.summary ?? <MissingDataBadge />}
            </p>
          </article>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <article className="rounded-xl border border-border/50 bg-background/35 px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Business impact</p>
              <p className="mt-1 text-sm leading-snug text-foreground">
                {model.businessImpact ?? <MissingDataBadge />}
              </p>
            </article>

            <article className="rounded-xl border border-border/50 bg-background/35 px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Risk projection</p>
              <p className="mt-1 text-sm leading-snug text-foreground">
                {model.riskProjection ?? <MissingDataBadge />}
              </p>
            </article>
          </div>
        </div>
      ) : null}

      {!pending && error ? (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
    </section>
  );
}
