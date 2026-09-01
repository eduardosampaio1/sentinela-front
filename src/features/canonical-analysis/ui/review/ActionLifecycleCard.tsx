import { CheckCircle2, CircleDot, History, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type {
  ReviewActionRecordView,
  ReviewActionStatus,
  ReviewRecommendedActionView,
} from "@/lib/v1";

type Props = {
  action: ReviewRecommendedActionView;
  record?: ReviewActionRecordView;
  canAccept: boolean;
  pending: boolean;
  onAccept: () => void;
  onTransition: (target: ReviewActionStatus) => void;
};

const PRIMARY_NEXT: Partial<Record<ReviewActionStatus, ReviewActionStatus>> = {
  accepted: "in_progress",
  in_progress: "verifying",
  verifying: "succeeded",
  failed: "in_progress",
};

const SECONDARY_NEXT: Partial<Record<ReviewActionStatus, ReviewActionStatus>> = {
  accepted: "dismissed",
  in_progress: "rolled_back",
  verifying: "failed",
  failed: "rolled_back",
};

export function ActionLifecycleCard({
  action,
  record,
  canAccept,
  pending,
  onAccept,
  onTransition,
}: Props) {
  const { t, language } = useLanguage();
  const primary = record ? PRIMARY_NEXT[record.status] : undefined;
  const secondary = record ? SECONDARY_NEXT[record.status] : undefined;
  const locale = language === "pt" ? "pt-BR" : "en-US";

  return (
    <article className="rounded-xl border border-primary/20 bg-primary/[0.035] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {t(`canonicalAnalysis.review.priority.${action.priority}`)}
        </span>
        {record ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
            <CircleDot className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t(`canonicalAnalysis.review.actionStatus.${record.status}`)}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {record?.assignee ?? action.owner}
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">{action.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.why}</p>
      <ol className="mt-4 space-y-2 pl-5 text-sm leading-6 text-foreground">
        {action.how.map((step) => <li className="list-decimal" key={step}>{step}</li>)}
      </ol>
      {action.configuration.length > 0 ? (
        <div className="mt-4 rounded-lg border border-border bg-background/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("canonicalAnalysis.review.configuration")}</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-foreground">
            {action.configuration.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
      <p className="mt-4 text-sm"><strong>{t("canonicalAnalysis.review.successCheck")}:</strong> {action.success_check}</p>
      {action.rollback ? <p className="mt-2 text-xs text-muted-foreground"><strong>{t("canonicalAnalysis.review.rollback")}:</strong> {action.rollback}</p> : null}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        {!record ? (
          <Button disabled={!canAccept || pending} onClick={onAccept}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t("canonicalAnalysis.review.acceptAction")}
          </Button>
        ) : null}
        {primary ? (
          <Button disabled={pending} onClick={() => onTransition(primary)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t(`canonicalAnalysis.review.actionTransition.${primary}`)}
          </Button>
        ) : null}
        {secondary ? (
          <Button
            disabled={pending}
            variant="outline"
            onClick={() => onTransition(secondary)}
          >
            {secondary === "rolled_back" ? <RotateCcw className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
            {t(`canonicalAnalysis.review.actionTransition.${secondary}`)}
          </Button>
        ) : null}
      </div>

      {record?.events.length ? (
        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="inline-flex cursor-pointer items-center gap-2 font-medium text-foreground">
            <History className="h-4 w-4" aria-hidden />
            {t("canonicalAnalysis.review.actionHistory")}
          </summary>
          <ol className="mt-3 space-y-2 border-l border-border pl-4">
            {record.events.map((event) => (
              <li key={event.event_id}>
                <strong className="text-foreground">{t(`canonicalAnalysis.review.actionStatus.${event.to_status}`)}</strong>
                {" · "}{new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(event.occurred_at))}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
