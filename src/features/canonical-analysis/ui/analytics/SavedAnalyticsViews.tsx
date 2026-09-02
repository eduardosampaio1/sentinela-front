import { Download, Save } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type {
  AnalyticsQueryInput,
  AnalyticsQueryResultView,
  CanonicalScope,
} from "@/lib/v1";
import {
  useExportAnalyticsView,
  useSaveAnalyticsView,
  useSavedAnalyticsViews,
} from "../../data/analysis";

export function SavedAnalyticsViews({
  analysisId,
  scope,
  currentQuery,
  onOpen,
}: {
  readonly analysisId: string;
  readonly scope: CanonicalScope;
  readonly currentQuery: AnalyticsQueryInput | null;
  readonly onOpen: (result: AnalyticsQueryResultView) => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const list = useSavedAnalyticsViews(scope, analysisId);
  const save = useSaveAnalyticsView(scope, analysisId);
  const download = useExportAnalyticsView(scope, analysisId);

  async function saveCurrent() {
    if (!currentQuery || !name.trim()) return;
    await save.mutateAsync({ name: name.trim(), query: currentQuery });
    setName("");
    await list.refetch();
  }

  async function exportView(viewId: string, viewName: string) {
    const blob = await download.mutateAsync(viewId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${viewName.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || "sentinela-view"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-labelledby="saved-analytics-views" className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div>
        <h3 id="saved-analytics-views" className="font-semibold">{t("canonicalAnalysis.playground.savedTitle")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("canonicalAnalysis.playground.savedSubtitle")}</p>
      </div>
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void saveCurrent(); }}>
        <label className="grid flex-1 gap-2 text-sm font-medium">
          {t("canonicalAnalysis.playground.viewName")}
          <input className="min-h-11 rounded-lg border border-input bg-background px-3" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" disabled={!currentQuery || !name.trim() || save.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg border border-border px-4 font-medium disabled:opacity-50">
          <Save aria-hidden="true" className="size-4" />
          {t("canonicalAnalysis.playground.saveView")}
        </button>
      </form>
      {save.isError ? <p role="alert" className="text-sm text-destructive">{t("canonicalAnalysis.playground.saveError")}</p> : null}
      {list.isLoading ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : null}
      {list.data?.views.length === 0 ? <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.playground.noSavedViews")}</p> : null}
      {list.data?.views.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.data.views.map((view) => (
            <li key={view.view_id} className="rounded-lg border border-border p-3">
              <p className="font-medium">{view.name}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{view.projection_digest}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="min-h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" onClick={() => onOpen(view.result)}>{t("canonicalAnalysis.playground.openView")}</button>
                <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm" onClick={() => void exportView(view.view_id, view.name)}>
                  <Download aria-hidden="true" className="size-4" />
                  {t("canonicalAnalysis.playground.exportView")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
