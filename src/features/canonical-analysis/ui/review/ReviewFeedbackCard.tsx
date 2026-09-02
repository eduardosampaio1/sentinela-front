import { useState } from "react";
import { MessageSquareText, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type {
  ReviewFeedbackReason,
  ReviewFeedbackView,
} from "@/lib/v1";

const NEGATIVE_REASONS: ReviewFeedbackReason[] = [
  "too_generic",
  "not_actionable",
  "missing_evidence",
  "incorrect_interpretation",
  "other",
];

export function ReviewFeedbackCard({
  feedback,
  pending,
  failed,
  onSubmit,
}: {
  feedback?: ReviewFeedbackView;
  pending: boolean;
  failed: boolean;
  onSubmit: (input: {
    rating: "helpful" | "not_helpful";
    reason?: ReviewFeedbackReason | null;
    comment?: string | null;
  }) => void;
}) {
  const { t } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);
  const [reason, setReason] = useState<ReviewFeedbackReason | "">("");
  const [comment, setComment] = useState("");

  return (
    <section
      aria-labelledby="review-feedback-title"
      className="rounded-xl border border-border bg-card p-5"
    >
      <MessageSquareText className="h-5 w-5 text-primary" aria-hidden />
      <h2 id="review-feedback-title" className="mt-3 font-semibold text-foreground">
        {t("canonicalAnalysis.review.feedback.title")}
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {t("canonicalAnalysis.review.feedback.body")}
      </p>
      {feedback?.rating ? (
        <p role="status" className="mt-3 text-sm font-medium text-success">
          {t("canonicalAnalysis.review.feedback.saved")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={feedback?.rating === "helpful" ? "default" : "outline"}
          disabled={pending}
          onClick={() => {
            setShowDetails(false);
            onSubmit({ rating: "helpful", reason: "well_supported" });
          }}
          className="min-h-11 gap-2"
        >
          <ThumbsUp className="h-4 w-4" aria-hidden />
          {t("canonicalAnalysis.review.feedback.helpful")}
        </Button>
        <Button
          type="button"
          variant={feedback?.rating === "not_helpful" ? "default" : "outline"}
          disabled={pending}
          onClick={() => setShowDetails(true)}
          className="min-h-11 gap-2"
        >
          <ThumbsDown className="h-4 w-4" aria-hidden />
          {t("canonicalAnalysis.review.feedback.notHelpful")}
        </Button>
      </div>
      {showDetails ? (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-background/50 p-4">
          <label className="block text-sm font-medium text-foreground">
            {t("canonicalAnalysis.review.feedback.reasonLabel")}
            <select
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as ReviewFeedbackReason | "")
              }
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t("canonicalAnalysis.review.feedback.reasonPlaceholder")}</option>
              {NEGATIVE_REASONS.map((value) => (
                <option key={value} value={value}>
                  {t(`canonicalAnalysis.review.feedback.reason.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-foreground">
            {t("canonicalAnalysis.review.feedback.commentLabel")}
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value.slice(0, 1000))}
              rows={3}
              maxLength={1000}
              className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button
            type="button"
            disabled={pending || !reason}
            onClick={() =>
              onSubmit({
                rating: "not_helpful",
                reason: reason || null,
                comment: comment.trim() || null,
              })
            }
            className="min-h-11"
          >
            {pending
              ? t("canonicalAnalysis.review.feedback.saving")
              : t("canonicalAnalysis.review.feedback.send")}
          </Button>
        </div>
      ) : null}
      {failed ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t("canonicalAnalysis.review.feedback.error")}
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {t("canonicalAnalysis.review.feedback.boundary")}
      </p>
    </section>
  );
}
