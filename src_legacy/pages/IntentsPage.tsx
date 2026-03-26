import { useMemo, useState } from "react";
import { ListTree } from "lucide-react";
import EmptyState from "@/components/dashboard/EmptyState";
import MetricInfo from "@/components/dashboard/MetricInfo";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AccordionPanel from "@/components/ui/AccordionPanel";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatPercent, getConsistencyHealth, healthColor, progressColor } from "@/lib/metrics";

export default function IntentsPage() {
  const { result, dataSource } = useAnalysis();
  const { t } = useLanguage();
  const [sortBy, setSortBy] = useState("stability-asc");

  const intents = useMemo(() => result?.intents ?? [], [result?.intents]);

  const sorted = useMemo(() => {
    const items = [...intents];
    if (sortBy === "stability-asc") {
      items.sort(
        (a, b) =>
          (a.response_stability_score ?? a.consistency_score ?? 0) -
          (b.response_stability_score ?? b.consistency_score ?? 0),
      );
    }
    if (sortBy === "stability-desc") {
      items.sort(
        (a, b) =>
          (b.response_stability_score ?? b.consistency_score ?? 0) -
          (a.response_stability_score ?? a.consistency_score ?? 0),
      );
    }
    if (sortBy === "variance") items.sort((a, b) => (b.response_variance ?? 0) - (a.response_variance ?? 0));
    if (sortBy === "volume") items.sort((a, b) => (b.n_conversations ?? 0) - (a.n_conversations ?? 0));
    return items;
  }, [intents, sortBy]);

  if (!result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("intentsPage.title")}</h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("intentsPage.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("intentsPage.subtitle")}</p>
        </div>
        <Badge variant={dataSource === "fresh" ? "default" : "secondary"} className="text-xs">
          {dataSource === "fresh" ? t("common.fresh") : t("common.cached")}
        </Badge>
      </div>

      {!intents.length ? (
        <EmptyState title={t("intentsPage.emptyTitle")} description={t("intentsPage.emptyBody")} />
      ) : (
        <AccordionPanel
          title="Intent Analysis"
          icon={<ListTree className="h-4 w-4" />}
          badge={
            <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
              {intents.length}
            </span>
          }
          defaultOpen={false}
        >
          <div className="mb-4 flex justify-end">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full rounded-2xl border-border bg-card/70 sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stability-asc">{t("intentsPage.sortLowestStability")}</SelectItem>
                <SelectItem value="stability-desc">{t("intentsPage.sortHighestStability")}</SelectItem>
                <SelectItem value="variance">{t("intentsPage.sortHighestVariance")}</SelectItem>
                <SelectItem value="volume">{t("intentsPage.sortHighestVolume")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">
            <MetricInfo title={t("intentsPage.priorityBoard")} tooltip={t("intentsPage.priorityBoardTip")} />
            <div className="space-y-3">
              {sorted.map((intent, index) => {
                const stability = intent.response_stability_score ?? intent.consistency_score ?? 0;
                const tone = getConsistencyHealth(stability);
                return (
                  <div key={intent.intent} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm text-muted-foreground">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-mono text-sm text-foreground">{intent.intent}</div>
                          <div className="text-xs text-muted-foreground">
                            {intent.n_conversations ?? 0} {t("intentsPage.convs")} | {t("intentsPage.meanChars")}{" "}
                            {intent.mean_assistant_chars ?? t("common.notAvailable")} | {t("intentsPage.stdChars")}{" "}
                            {intent.std_assistant_chars ?? t("common.notAvailable")}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className={healthColor(String(tone))}>
                          {t("intentsPage.stability")} {formatPercent(stability)}
                        </Badge>
                        <Badge variant="outline">
                          {t("intentsPage.variance")} {formatPercent(intent.response_variance)}
                        </Badge>
                        {intent.severity ? <Badge variant="outline">{intent.severity}</Badge> : null}
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${progressColor(String(tone))}`}
                        style={{ width: `${Math.max(6, stability)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AccordionPanel>
      )}
    </div>
  );
}
