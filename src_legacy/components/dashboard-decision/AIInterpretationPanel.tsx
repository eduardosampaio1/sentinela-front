import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown, Lock, ShieldAlert, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisInterpretation } from "@/lib/api";
import type { InterpretationPanelModel } from "@/lib/decisionLayerModel";
import MissingDataBadge from "@/components/dashboard-decision/MissingDataBadge";
import { cn } from "@/lib/utils";

type InterpretationStatus = "not_requested" | "queued" | "running" | "completed" | "failed";

interface AIInterpretationPanelProps {
  model: InterpretationPanelModel;
  interpretation: AnalysisInterpretation | null;
  loading: boolean;
  error: string;
  generatedAt?: string;
  status: InterpretationStatus;
  canGenerate: boolean;
  isLocked: boolean;
  onGenerate: () => void;
  llmModel?: string;
  provider?: string;
  promptVersion?: string;
}

interface RiskItemViewModel {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string;
  impact: string;
}

interface ActionItemViewModel {
  priority: number;
  action: string;
  reason: string;
  expectedEffect: string;
}

function hasInterpretationContent(
  model: InterpretationPanelModel,
  interpretation: AnalysisInterpretation | null,
) {
  return Boolean(
    model.summary ||
      model.businessImpact ||
      model.riskProjection ||
      interpretation?.executive_diagnosis ||
      interpretation?.main_risks?.length ||
      interpretation?.priority_actions?.length ||
      interpretation?.strategic_recommendation ||
      interpretation?.key_findings?.length ||
      interpretation?.business_implications?.length,
  );
}

function buttonLabel(status: InterpretationStatus, hasContent: boolean, loading: boolean) {
  if (loading || status === "queued" || status === "running") return "Generating...";
  if (status === "completed" && hasContent) return "Interpretation Locked";
  return "Generate Interpretation";
}

function statusChip(status: InterpretationStatus, hasContent: boolean, loading: boolean, error: string) {
  if (error) {
    return {
      label: "Error",
      className: "border-red-500/30 bg-red-500/10 text-red-200",
    };
  }

  if (loading || status === "queued" || status === "running") {
    return {
      label: "Generating",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    };
  }

  if (status === "completed" && hasContent) {
    return {
      label: "Locked",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  return {
    label: "Optional",
    className: "border-border/60 bg-background/35 text-muted-foreground",
  };
}

function collapsedSummary(
  model: InterpretationPanelModel,
  interpretation: AnalysisInterpretation | null,
  pending: boolean,
  error: string,
  isLocked: boolean,
  open: boolean,
) {
  if (pending) return "Generating a deeper operator brief from scores, issues, economics, and risk signals.";
  if (error) return "Interpretation generation failed. Open this panel to review the error and retry.";
  if (open) return "Decision-ready interpretation with diagnosis, risks, business impact, and next actions.";
  if (interpretation?.executive_diagnosis) return interpretation.executive_diagnosis;
  if (model.summary) return model.summary;
  if (isLocked) return "Interpretation is locked for this run, but no summary text is available.";
  return "Generate a richer operator brief when you need root cause, business pressure, and an ordered action plan.";
}

function severityTone(severity: RiskItemViewModel["severity"]) {
  if (severity === "critical") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (severity === "high") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (severity === "medium") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function formatProvider(provider?: string) {
  const normalized = String(provider ?? "").trim();
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildRiskItems(
  interpretation: AnalysisInterpretation | null,
  fallbackImpact: string | null,
): RiskItemViewModel[] {
  const risks = Array.isArray(interpretation?.main_risks) ? interpretation.main_risks : [];
  if (risks.length > 0) {
    return risks.map((risk) => ({
      title: risk.title,
      severity: risk.severity,
      evidence: risk.evidence,
      impact: risk.impact,
    }));
  }

  return (interpretation?.operational_risks ?? []).map((text) => ({
    title: text,
    severity: interpretation?.risk_level ?? "medium",
    evidence: text,
    impact: fallbackImpact ?? "Potential impact on trust, cost, or containment pressure.",
  }));
}

function buildActionItems(
  interpretation: AnalysisInterpretation | null,
  fallbackReason: string | null,
  fallbackEffect: string | null,
): ActionItemViewModel[] {
  const actions = Array.isArray(interpretation?.priority_actions) ? interpretation.priority_actions : [];
  if (actions.length > 0) {
    return actions.map((action) => ({
      priority: action.priority,
      action: action.action,
      reason: action.reason,
      expectedEffect: action.expected_effect,
    }));
  }

  return (interpretation?.recommended_priorities ?? []).map((action, index) => ({
    priority: index + 1,
    action,
    reason: interpretation?.key_findings?.[index] ?? fallbackReason ?? "Based on current diagnostics.",
    expectedEffect:
      interpretation?.business_implications?.[index] ??
      fallbackEffect ??
      "Expected to reduce operational pressure in the next run.",
  }));
}

export default function AIInterpretationPanel({
  model,
  interpretation,
  loading,
  error,
  generatedAt,
  status,
  canGenerate,
  isLocked,
  onGenerate,
  llmModel,
  provider,
  promptVersion,
}: AIInterpretationPanelProps) {
  const hasContent = hasInterpretationContent(model, interpretation);
  const pending = status === "queued" || status === "running" || loading;
  const [open, setOpen] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      if (pending || Boolean(error)) {
        setOpen(true);
      }
      return;
    }

    if (pending || Boolean(error) || (status === "completed" && hasContent)) {
      setOpen(true);
    }
  }, [error, hasContent, pending, status]);

  const panelState = statusChip(status, hasContent, loading, error);
  const summary = collapsedSummary(model, interpretation, pending, error, isLocked, open);
  const providerLabel = formatProvider(provider);

  const executiveDiagnosis =
    interpretation?.executive_diagnosis ??
    model.summary ??
    "No executive diagnosis was returned for this run.";
  const systemicPattern =
    interpretation?.systemic_pattern ??
    model.riskProjection ??
    "No systemic pattern explanation was returned for this run.";
  const confidenceNotes =
    interpretation?.confidence_notes ??
    model.riskProjection ??
    "Confidence commentary was not provided by the engine.";
  const strategicRecommendation =
    interpretation?.strategic_recommendation ??
    interpretation?.recommended_priorities?.[0] ??
    model.businessImpact ??
    executiveDiagnosis;

  const riskItems = useMemo(
    () => buildRiskItems(interpretation, model.businessImpact),
    [interpretation, model.businessImpact],
  );
  const actionItems = useMemo(
    () => buildActionItems(interpretation, model.summary, model.businessImpact),
    [interpretation, model.businessImpact, model.summary],
  );
  const keyFindings = interpretation?.key_findings ?? [];
  const businessImplications = interpretation?.business_implications ?? [];

  return (
    <section className="rounded-[24px] border border-border/50 bg-card/60 shadow-sm backdrop-blur-md">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">AI Interpretation</h2>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.04em]", panelState.className)}>
                {panelState.label}
              </span>
              {llmModel ? (
                <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {llmModel}
                </span>
              ) : null}
              {providerLabel ? (
                <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {providerLabel}
                </span>
              ) : null}
              {promptVersion ? (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {promptVersion}
                </span>
              ) : null}
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Operator brief generated from scores, issues, economics, and business impact. Use this when the cockpit signals show pressure and you need root cause plus next action.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-foreground/90">{summary}</p>
            {generatedAt ? (
              <p className="text-xs text-muted-foreground">
                Saved at: {new Date(generatedAt).toLocaleString()}
              </p>
            ) : null}
            {isLocked ? (
              <p className="text-xs text-amber-300">
                One interpretation per analysis run. After generation, this artifact is locked to preserve run-level traceability.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              aria-controls="ai-interpretation-details"
            >
              {open ? "Hide details" : "Show details"}
              <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform duration-200", open ? "rotate-180" : "rotate-0")} />
            </Button>
            <Button onClick={onGenerate} disabled={!canGenerate || pending}>
              {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Bot className="mr-2 h-4 w-4" />}
              {buttonLabel(status, hasContent, loading)}
            </Button>
          </div>
        </div>

        {pending ? (
          <div className="rounded-[20px] border border-border/50 bg-background/30 p-4">
            <p className="text-sm text-foreground">
              Reading scores, issues, economics, and business pressure to produce a deeper operator brief.
            </p>
            <div className="mt-4 space-y-3">
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-border/60" />
              <div className="h-3 w-3/5 animate-pulse rounded-full bg-border/50" />
              <div className="h-20 animate-pulse rounded-[18px] bg-background/50" />
            </div>
          </div>
        ) : null}

        <div
          id="ai-interpretation-details"
          className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
          style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0.96 }}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 pt-1">
              {!pending && !hasContent ? (
                <div className="rounded-[20px] border border-dashed border-border/60 bg-background/20 px-4 py-5 text-sm text-muted-foreground">
                  Generate interpretation to receive an executive diagnosis, ranked risks, business implications, and an ordered action plan tied to the current analysis run.
                </div>
              ) : null}

              {!pending && hasContent ? (
                <div className="space-y-4">
                  <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                    <article className="rounded-[22px] border border-primary/20 bg-primary/8 p-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Executive diagnosis</p>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-foreground">
                        {executiveDiagnosis || <MissingDataBadge />}
                      </p>
                    </article>

                    <div className="grid gap-3">
                      <article className="rounded-[22px] border border-border/50 bg-background/35 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Confidence notes
                        </p>
                        <p className="mt-3 text-sm leading-6 text-foreground">
                          {confidenceNotes || <MissingDataBadge />}
                        </p>
                      </article>

                      <article className="rounded-[22px] border border-emerald-500/20 bg-emerald-500/8 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                          Strategic recommendation
                        </p>
                        <p className="mt-3 text-sm leading-6 text-foreground">
                          {strategicRecommendation || <MissingDataBadge />}
                        </p>
                      </article>
                    </div>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    <article className="rounded-[22px] border border-border/50 bg-background/35 p-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Ranked risks</p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {riskItems.length > 0 ? (
                          riskItems.map((risk, index) => (
                            <div key={`${risk.title}-${index}`} className={`rounded-[18px] border p-4 ${severityTone(risk.severity)}`}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">{risk.title}</p>
                                <span className="rounded-full border border-current/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]">
                                  {risk.severity}
                                </span>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-foreground/95">
                                <span className="font-medium text-foreground">Evidence:</span> {risk.evidence}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-foreground/95">
                                <span className="font-medium text-foreground">Impact:</span> {risk.impact}
                              </p>
                            </div>
                          ))
                        ) : (
                          <MissingDataBadge />
                        )}
                      </div>
                    </article>

                    <article className="rounded-[22px] border border-border/50 bg-background/35 p-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Priority actions</p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {actionItems.length > 0 ? (
                          actionItems.map((action) => (
                            <div key={`${action.priority}-${action.action}`} className="rounded-[18px] border border-border/45 bg-background/25 p-4">
                              <div className="flex items-start gap-3">
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/30 text-xs font-semibold text-foreground">
                                  {action.priority}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">{action.action}</p>
                                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    <span className="font-medium text-foreground">Why now:</span> {action.reason}
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    <span className="font-medium text-foreground">Expected effect:</span> {action.expectedEffect}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <MissingDataBadge />
                        )}
                      </div>
                    </article>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-3">
                    <article className="rounded-[22px] border border-border/50 bg-background/35 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        System pattern
                      </p>
                      <p className="mt-3 text-sm leading-6 text-foreground">
                        {systemicPattern || <MissingDataBadge />}
                      </p>
                    </article>

                    <article className="rounded-[22px] border border-border/50 bg-background/35 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Key findings
                      </p>
                      {keyFindings.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                          {keyFindings.map((item) => (
                            <li key={item} className="rounded-[14px] border border-border/40 bg-background/25 px-3 py-2">
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-3">
                          <MissingDataBadge />
                        </div>
                      )}
                    </article>

                    <article className="rounded-[22px] border border-border/50 bg-background/35 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Business implications
                      </p>
                      {businessImplications.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                          {businessImplications.map((item) => (
                            <li key={item} className="rounded-[14px] border border-border/40 bg-background/25 px-3 py-2">
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-3">
                          <MissingDataBadge />
                        </div>
                      )}
                    </article>
                  </div>
                </div>
              ) : null}

              {!pending && error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
