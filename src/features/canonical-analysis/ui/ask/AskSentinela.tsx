import { MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useAnalysisReview,
  useAskAnalysis,
  useAskConversation,
} from "../../data/review";
import { useCanonicalScope } from "../scope";
import { AskComposer } from "./AskComposer";
import { AskConversation } from "./AskConversation";

export function AskSentinela({ analysisId }: { analysisId: string }) {
  const { language, t } = useLanguage();
  const scope = useCanonicalScope();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const review = useAnalysisReview(scope, analysisId);
  const conversation = useAskConversation(scope, analysisId, open);
  const ask = useAskAnalysis(scope, analysisId);
  const artifact = review.data;
  const ready = Boolean(
    artifact?.review_id && artifact.version && ["completed", "partial"].includes(artifact.status),
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (node && typeof node.scrollTo === "function") {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }
  }, [conversation.data?.items.length, ask.isPending]);

  function submit() {
    if (!artifact?.review_id || !artifact.version || !question.trim()) return;
    const sent = question.trim();
    setQuestion("");
    ask.mutate(
      {
        reviewId: artifact.review_id,
        reviewVersion: artifact.version,
        question: sent,
        language,
      },
      { onError: () => setQuestion(sent) },
    );
  }

  const turns = conversation.data?.items ?? [];
  const examples = [
    t("canonicalAnalysis.ask.exampleMetric"),
    t("canonicalAnalysis.ask.exampleProblem"),
    t("canonicalAnalysis.ask.exampleAction"),
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-5 right-5 z-40 min-h-14 rounded-full border border-primary-foreground/15 px-5 shadow-[0_12px_36px_hsl(var(--primary)/0.28)] transition-transform hover:-translate-y-0.5 motion-reduce:transform-none sm:bottom-7 sm:right-7"
          aria-label={t("canonicalAnalysis.ask.open")}
        >
          <span className="relative grid h-6 w-6 place-items-center" aria-hidden>
            <span className="absolute h-5 w-5 rounded-full bg-primary-foreground/20 animate-pulse motion-reduce:hidden" />
            <MessageCircle className="relative h-5 w-5" />
          </span>
          <span className="hidden sm:inline">{t("canonicalAnalysis.ask.open")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        closeLabel={t("canonicalAnalysis.ask.close")}
        className="flex h-full w-full flex-col gap-0 p-0 motion-reduce:transition-none sm:max-w-[460px]"
      >
        <SheetHeader className="border-b border-border px-5 py-5 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
              <MessageCircle aria-hidden className="h-4 w-4" />
            </span>
            {t("canonicalAnalysis.ask.title")}
          </SheetTitle>
          <SheetDescription>{t("canonicalAnalysis.ask.description")}</SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {review.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t("canonicalAnalysis.ask.loading")}
            </p>
          ) : review.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {t("canonicalAnalysis.ask.unavailable")}
            </p>
          ) : !ready ? (
            <div role="status" className="rounded-xl border border-border bg-card p-5">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="mt-3 font-semibold text-foreground">
                {t("canonicalAnalysis.ask.notReadyTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("canonicalAnalysis.ask.notReadyBody")}
              </p>
            </div>
          ) : conversation.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t("canonicalAnalysis.ask.loading")}
            </p>
          ) : conversation.isError || conversation.data?.state === "unavailable" ? (
            <p role="alert" className="text-sm text-destructive">
              {t("canonicalAnalysis.ask.unavailable")}
            </p>
          ) : turns.length ? (
            <AskConversation
              turns={turns}
              labels={{
                fact: t("canonicalAnalysis.ask.fact"),
                interpretation: t("canonicalAnalysis.ask.interpretation"),
                limitation: t("canonicalAnalysis.ask.limitation"),
                nextAction: t("canonicalAnalysis.ask.nextAction"),
                evidence: t("canonicalAnalysis.ask.evidence"),
                partial: t("canonicalAnalysis.ask.partial"),
              }}
            />
          ) : (
            <div>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                {t("canonicalAnalysis.ask.empty")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="min-h-11 rounded-full border border-border bg-card px-3 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setQuestion(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
          {ask.isPending ? (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              {t("canonicalAnalysis.ask.investigating")}
            </p>
          ) : null}
          {ask.isError ? (
            <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {t("canonicalAnalysis.ask.error")}
            </p>
          ) : null}
        </div>

        {ready ? (
          <AskComposer
            value={question}
            onChange={setQuestion}
            onSubmit={submit}
            pending={ask.isPending}
            placeholder={t("canonicalAnalysis.ask.placeholder")}
            submitLabel={t("canonicalAnalysis.ask.send")}
            privacyNote={t("canonicalAnalysis.ask.privacy")}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
