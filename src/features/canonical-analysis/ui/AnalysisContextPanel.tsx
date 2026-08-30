import { useEffect, useState } from "react";
import { Check, Lightbulb, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CanonicalScope, ContextItemView } from "@/lib/v1";
import {
  useAnalysisContext,
  useSaveAnalysisContext,
  useSuggestAnalysisContext,
} from "../data/review";

export function AnalysisContextPanel({ analysisId, scope }: { analysisId: string; scope: CanonicalScope }) {
  const { t } = useLanguage();
  const context = useAnalysisContext(scope, analysisId);
  const save = useSaveAnalysisContext(scope, analysisId);
  const suggest = useSuggestAnalysisContext(scope, analysisId);
  const [text, setText] = useState("");
  const [items, setItems] = useState<ContextItemView[]>([]);

  useEffect(() => {
    if (!context.data || context.data.state === "empty" || context.data.state === "unavailable") return;
    setText(context.data.original_text ?? "");
    setItems(context.data.structured?.items ?? []);
  }, [context.data]);

  const accepted = items.filter((item) => item.state === "accepted" || item.state === "edited");
  const proposals = suggest.data?.suggestions.items ?? [];
  const unavailable = context.data?.state === "unavailable";

  async function saveDraft() {
    await save.mutateAsync({
      original_text: text,
      expected_version: context.data?.version,
      accepted_structure: { items: accepted },
    });
  }

  async function askForSuggestions() {
    if (text !== (context.data?.original_text ?? "")) await saveDraft();
    await suggest.mutateAsync();
  }

  function accept(item: ContextItemView) {
    if (items.some((current) => current.item_id === item.item_id)) return;
    setItems((current) => [...current, { ...item, state: "accepted" }]);
  }

  return (
    <section aria-labelledby="analysis-context-title" className="overflow-hidden rounded-[var(--ds-radius-panel)] border border-border bg-card">
      <div className="border-b border-border bg-[linear-gradient(120deg,hsl(var(--ds-accent)/0.13),transparent_62%)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 rounded-full border border-primary/25 bg-primary/10 p-2 text-primary"><Lightbulb className="h-4 w-4" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("canonicalAnalysis.context.eyebrow")}</p>
            <h2 id="analysis-context-title" className="mt-1 text-xl font-semibold text-foreground">{t("canonicalAnalysis.context.title")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("canonicalAnalysis.context.help")}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {unavailable ? <p role="status" className="text-sm text-muted-foreground">{t("canonicalAnalysis.context.unavailable")}</p> : (
          <>
            <label htmlFor="analysis-context" className="sr-only">{t("canonicalAnalysis.context.label")}</label>
            <textarea
              id="analysis-context"
              value={text}
              maxLength={50000}
              rows={7}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("canonicalAnalysis.context.placeholder")}
              className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-base leading-7 text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" onClick={() => void saveDraft()} disabled={save.isPending} className="min-h-11">{save.isPending ? t("canonicalAnalysis.context.saving") : t("canonicalAnalysis.context.save")}</Button>
              <Button type="button" variant="outline" onClick={() => void askForSuggestions()} disabled={!text.trim() || suggest.isPending || save.isPending} className="min-h-11">{suggest.isPending ? t("canonicalAnalysis.context.suggesting") : t("canonicalAnalysis.context.suggest")}</Button>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" aria-hidden />{t("canonicalAnalysis.context.privacy")}</span>
            </div>
          </>
        )}

        {proposals.length > 0 ? (
          <div aria-live="polite" className="space-y-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">{t("canonicalAnalysis.context.suggestionsTitle")}</h3>
            <ul className="space-y-2">
              {proposals.map((item) => {
                const wasAccepted = items.some((current) => current.item_id === item.item_id);
                return <li key={item.item_id} className="flex flex-col gap-3 rounded-lg border border-border bg-background/60 p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{t(`canonicalAnalysis.context.category.${item.category}`)}</p><p className="mt-1 text-sm leading-6 text-foreground">{item.text}</p></div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={wasAccepted} onClick={() => accept(item)} aria-label={t("canonicalAnalysis.context.accept")}><Check className="h-4 w-4" aria-hidden />{wasAccepted ? t("canonicalAnalysis.context.accepted") : t("canonicalAnalysis.context.accept")}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => suggest.reset()} aria-label={t("canonicalAnalysis.context.ignore")}><X className="h-4 w-4" aria-hidden />{t("canonicalAnalysis.context.ignore")}</Button>
                  </div>
                </li>;
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
