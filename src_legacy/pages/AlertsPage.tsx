import { useMemo } from "react";
import { Siren } from "lucide-react";
import { useAnalysis } from "@/contexts/AnalysisContext";
import EmptyState from "@/components/dashboard/EmptyState";
import MetricInfo from "@/components/dashboard/MetricInfo";
import { Badge } from "@/components/ui/badge";
import AccordionPanel from "@/components/ui/AccordionPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAlerts } from "@/lib/metrics";

const AlertsPage = () => {
  const { result, dataSource } = useAnalysis();
  const { t } = useLanguage();

  const grouped = useMemo(() => {
    const alerts = normalizeAlerts((result?.alerts ?? []) as unknown as Array<Record<string, unknown>>);
    return alerts.reduce<Record<string, typeof alerts>>((acc, alert) => {
      const key = `${alert.problem}|${alert.intent ?? "global"}`;
      acc[key] = acc[key] ? [...acc[key], alert] : [alert];
      return acc;
    }, {});
  }, [result?.alerts]);

  if (!result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("alertsPage.title")}</h1>
        <EmptyState />
      </div>
    );
  }

  const cards = Object.entries(grouped);
  const hasCritical = cards.some(([, alerts]) =>
    alerts.some((alert) => String(alert.severity).toLowerCase() === "critical"),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("alertsPage.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("alertsPage.subtitle")}</p>
        </div>
        <Badge variant={dataSource === "fresh" ? "default" : "secondary"} className="text-xs">
          {dataSource === "fresh" ? t("common.fresh") : t("common.cached")}
        </Badge>
      </div>

      {!cards.length ? (
        <EmptyState title={t("alertsPage.emptyTitle")} description={t("alertsPage.emptyBody")} />
      ) : (
        <AccordionPanel
          title="Active Alerts"
          icon={<Siren className="h-4 w-4" />}
          badge={
            <div className="flex items-center gap-1.5">
              {hasCritical ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] text-red-200">
                  CRITICAL
                </span>
              ) : null}
              <span className="rounded-full border border-border/60 bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">
                {cards.length}
              </span>
            </div>
          }
          defaultOpen={hasCritical}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map(([key, alerts]) => {
              const first = alerts[0];
              return (
                <div key={key} className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">
                  <MetricInfo title={first.problem} tooltip={t("alertsPage.groupingTip")} />
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant="secondary">{first.severity}</Badge>
                    <Badge variant="outline">{first.intent || t("common.globalIssue")}</Badge>
                    <Badge variant="outline">
                      {alerts.length} {alerts.length > 1 ? t("alertsPage.occurrences") : t("alertsPage.occurrence")}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{first.recommendation}</p>
                </div>
              );
            })}
          </div>
        </AccordionPanel>
      )}
    </div>
  );
};

export default AlertsPage;
