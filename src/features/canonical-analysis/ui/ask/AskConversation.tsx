import { Bot, UserRound } from "lucide-react";
import type { AskTurnView } from "@/lib/v1";

export function AskConversation({
  turns,
  labels,
}: {
  turns: readonly AskTurnView[];
  labels: {
    fact: string;
    interpretation: string;
    limitation: string;
    nextAction: string;
    evidence: string;
    partial: string;
  };
}) {
  return (
    <ol className="space-y-6" aria-live="polite">
      {turns.map((turn) => (
        <li key={turn.turn_id} className="space-y-3">
          <div className="ml-auto flex max-w-[88%] items-start gap-2">
            <p className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
              {turn.question}
            </p>
            <UserRound className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
          <article className="flex items-start gap-2">
            <Bot className="mt-3 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-card p-4 text-sm">
              {turn.answer.status === "partial" ? (
                <p className="mb-3 text-xs font-medium text-warning">{labels.partial}</p>
              ) : null}
              {turn.answer.fact ? (
                <AnswerPart label={labels.fact}>{turn.answer.fact}</AnswerPart>
              ) : null}
              {turn.answer.interpretation ? (
                <AnswerPart label={labels.interpretation}>{turn.answer.interpretation}</AnswerPart>
              ) : null}
              <AnswerPart label={labels.limitation}>{turn.answer.limitation}</AnswerPart>
              <AnswerPart label={labels.nextAction}>{turn.answer.next_action}</AnswerPart>
              {turn.answer.evidence.length ? (
                <details className="mt-4 border-t border-border pt-3">
                  <summary className="cursor-pointer text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {labels.evidence} ({turn.answer.evidence.length})
                  </summary>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                    {turn.answer.evidence.map((item) => (
                      <li key={item.evidence_id} className="rounded-lg bg-background p-3">
                        <strong className="block text-foreground">{item.label}</strong>
                        {item.excerpt ?? item.pointer}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}

function AnswerPart({ label, children }: { label: string; children: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap leading-6 text-foreground">{children}</p>
    </div>
  );
}
