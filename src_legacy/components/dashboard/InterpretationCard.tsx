import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bot, ShieldAlert, Sparkles, Target } from "lucide-react";
import type { AnalysisInterpretation } from "@/lib/api";

function severityTone(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return "text-red-400 border-red-500/20 bg-red-500/5";
  if (normalized === "high") return "text-amber-300 border-amber-500/20 bg-amber-500/5";
  if (normalized === "medium") return "text-sky-300 border-sky-500/20 bg-sky-500/5";
  return "text-emerald-300 border-emerald-500/20 bg-emerald-500/5";
}

type Props = {
  interpretation: AnalysisInterpretation;
  model: string;
  promptVersion: string;
  cached?: boolean;
};

export default function InterpretationCard({
  interpretation,
  model,
  promptVersion,
  cached = false,
}: Props) {
  const { t } = useLanguage();
  const diagnosis =
    interpretation.executive_diagnosis ||
    interpretation.summary ||
    "The interpretation completed, but no executive summary was returned.";
  const systemicPattern =
    interpretation.systemic_pattern ||
    interpretation.confidence_notes ||
    "Use the key findings and recommendations below to prioritize investigation.";
  const mainRisks = Array.isArray(interpretation.main_risks) ? interpretation.main_risks : [];
  const fallbackRisks =
    mainRisks.length > 0
      ? mainRisks
      : (interpretation.operational_risks ?? []).map((text) => ({
          title: text,
          severity: interpretation.risk_level ?? "medium",
          evidence: text,
          impact: "May affect consistency, containment, or user trust.",
        }));
  const priorityActions = Array.isArray(interpretation.priority_actions)
    ? interpretation.priority_actions
    : [];
  const fallbackActions =
    priorityActions.length > 0
      ? priorityActions
      : (interpretation.recommended_priorities ?? []).map((action, index) => ({
          priority: index + 1,
          action,
          reason: interpretation.key_findings?.[index] ?? "Based on current diagnostics.",
          expected_effect:
            interpretation.business_implications?.[index] ??
            "Expected to reduce risk or improve performance.",
        }));
  const strategicRecommendation =
    interpretation.strategic_recommendation ||
    interpretation.recommended_priorities?.[0] ||
    interpretation.business_implications?.[0] ||
    diagnosis;
  const keyFindings = interpretation.key_findings ?? [];
  const businessImplications = interpretation.business_implications ?? [];

  return (
    <div className="mt-5 rounded-3xl border border-primary/20 bg-primary/5 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-primary/30 bg-background/60 text-primary">
          <Bot className="mr-1 h-3.5 w-3.5" />
          {t("interpretation.badge")}
        </Badge>
        <Badge variant="secondary">{model}</Badge>
        <Badge variant="secondary">{t("interpretation.prompt")} {promptVersion}</Badge>
        <Badge variant="secondary">{cached ? t("interpretation.cached") : t("interpretation.fresh")}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("interpretation.diagnosis")}
          </span>
        </div>
        <h3 className="break-words text-xl font-semibold text-foreground sm:text-2xl">
          {diagnosis}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {systemicPattern}
        </p>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldAlert className="h-4 w-4 text-primary" />
            {t("interpretation.mainRisks")}
          </div>

          <div className="space-y-3">
            {fallbackRisks.length > 0 ? fallbackRisks.map((risk, index) => (
              <div
                key={`${risk.title}-${index}`}
                className={`rounded-2xl border p-4 ${severityTone(risk.severity)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{risk.title}</div>
                  <Badge variant="secondary">{risk.severity}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">{t("interpretation.evidence")}:</span> {risk.evidence}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">{t("interpretation.impact")}:</span> {risk.impact}
                </p>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {t("interpretation.noRisks")}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Target className="h-4 w-4 text-primary" />
            {t("interpretation.priorityActions")}
          </div>

          <div className="space-y-3">
            {fallbackActions.length > 0 ? fallbackActions.map((action) => (
              <div key={`${action.priority}-${action.action}`} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted-foreground">
                    {action.priority}
                  </div>
                  <div className="font-medium text-foreground">{action.action}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">{t("interpretation.reason")}:</span> {action.reason}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">{t("interpretation.expectedEffect")}:</span> {action.expected_effect}
                </p>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {t("interpretation.noActions")}
              </div>
            )}
          </div>
        </div>
      </div>

      {keyFindings.length > 0 || businessImplications.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {keyFindings.length > 0 ? (
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="text-sm font-medium text-foreground">Key Findings</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {keyFindings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {businessImplications.length > 0 ? (
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="text-sm font-medium text-foreground">Business Implications</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {businessImplications.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="text-sm font-medium text-emerald-300">{t("interpretation.strategicRecommendation")}</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {strategicRecommendation}
        </p>
      </div>
    </div>
  );
}
