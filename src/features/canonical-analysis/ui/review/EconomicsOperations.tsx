import { useMemo, useState } from "react";
import { BookmarkPlus, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CanonicalScope, EconomicsScenarioScale } from "@/lib/v1";
import {
  type CostScenario,
  useEconomicsReconciliations,
  useSaveEconomicsReconciliation,
  useSaveEconomicsScenario,
  useSavedEconomicsScenarios,
} from "../../data/economics";

interface Props {
  analysisId: string;
  scope: CanonicalScope;
  rows: readonly CostScenario[];
  canEdit: boolean;
}

const fieldClass =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EconomicsOperations({ analysisId, scope, rows, canEdit }: Props) {
  const { language, t } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const scenarios = useSavedEconomicsScenarios(scope, analysisId);
  const reconciliations = useEconomicsReconciliations(scope, analysisId);
  const saveScenario = useSaveEconomicsScenario(scope, analysisId);
  const saveReconciliation = useSaveEconomicsReconciliation(scope, analysisId);
  const available = useMemo(() => rows.filter((row) => row.total_cost != null), [rows]);
  const [routeId, setRouteId] = useState(available[0]?.route_id ?? "");
  const [scenarioName, setScenarioName] = useState("");
  const [scale, setScale] = useState<EconomicsScenarioScale>("dataset");
  const [observedCost, setObservedCost] = useState("");

  const money = (amount: number, currency = "USD") =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 4,
    }).format(amount);

  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-border bg-background/50 p-4" aria-labelledby="saved-scenarios-title">
        <div className="flex items-start gap-3">
          <BookmarkPlus className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <div>
            <h3 id="saved-scenarios-title" className="font-semibold text-foreground">
              {t("canonicalAnalysis.review.economicsSavedTitle")}
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("canonicalAnalysis.review.economicsSavedHelp")}
            </p>
          </div>
        </div>
        {canEdit && available.length > 0 ? (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!scenarioName.trim() || !routeId) return;
              saveScenario.mutate({ name: scenarioName.trim(), route_id: routeId, scale });
            }}
          >
            <label className="block text-xs font-medium text-foreground">
              {t("canonicalAnalysis.review.economicsScenarioName")}
              <input className={`${fieldClass} mt-1`} maxLength={80} value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} />
            </label>
            <label className="block text-xs font-medium text-foreground">
              {t("canonicalAnalysis.review.economicsRoute")}
              <select className={`${fieldClass} mt-1`} value={routeId} onChange={(event) => setRouteId(event.target.value)}>
                {available.map((row) => <option key={row.route_id} value={row.route_id}>{row.provider} · {row.model_id ?? row.route_id}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-foreground">
              {t("canonicalAnalysis.review.economicsScale")}
              <select className={`${fieldClass} mt-1`} value={scale} onChange={(event) => setScale(event.target.value as EconomicsScenarioScale)}>
                {(["dataset", "per_1k", "per_100k", "per_1m"] as const).map((item) => (
                  <option key={item} value={item}>{t(`canonicalAnalysis.review.economicsScales.${item}`)}</option>
                ))}
              </select>
            </label>
            <Button type="submit" className="min-h-11" disabled={saveScenario.isPending || !scenarioName.trim()}>
              {t("canonicalAnalysis.review.economicsSaveScenario")}
            </Button>
            {saveScenario.isError ? <p role="alert" className="text-xs text-destructive">{t("canonicalAnalysis.review.economicsSaveError")}</p> : null}
          </form>
        ) : null}
        <ul className="mt-4 space-y-2">
          {(scenarios.data?.items ?? []).map((item) => (
            <li key={item.scenario_id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium text-foreground">{item.name ?? item.route_id}</span>
                <span className="font-mono tabular-nums text-foreground">{money(item.snapshot.amount, item.snapshot.currency)}</span>
              </div>
              <p className="mt-1 break-all text-xs text-muted-foreground">{item.route_id} · {t(`canonicalAnalysis.review.economicsScales.${item.scale}`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-background/50 p-4" aria-labelledby="reconciliation-title">
        <div className="flex items-start gap-3">
          <ReceiptText className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <div>
            <h3 id="reconciliation-title" className="font-semibold text-foreground">
              {t("canonicalAnalysis.review.economicsReconcileTitle")}
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("canonicalAnalysis.review.economicsReconcileHelp")}
            </p>
          </div>
        </div>
        {canEdit ? (
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              const amount = Number(observedCost);
              if (!Number.isFinite(amount) || amount < 0) return;
              saveReconciliation.mutate({ source_kind: "manual", currency: "USD", observed_total_cost: amount });
            }}
          >
            <label className="min-w-0 flex-1 text-xs font-medium text-foreground">
              {t("canonicalAnalysis.review.economicsObservedCost")}
              <input className={`${fieldClass} mt-1`} inputMode="decimal" min="0" step="0.0001" type="number" value={observedCost} onChange={(event) => setObservedCost(event.target.value)} />
            </label>
            <Button type="submit" variant="outline" className="min-h-11" disabled={saveReconciliation.isPending || observedCost === ""}>
              {t("canonicalAnalysis.review.economicsReconcile")}
            </Button>
          </form>
        ) : null}
        <ul className="mt-4 space-y-2">
          {(reconciliations.data?.items ?? []).map((item) => (
            <li key={item.reconciliation_id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium text-foreground">{t(`canonicalAnalysis.review.economicsReconciliationStatus.${item.status}`)}</span>
                <span className="font-mono tabular-nums text-foreground">{money(item.snapshot.observed.amount, item.snapshot.observed.currency)}</span>
              </div>
              {item.snapshot.variance_pct != null ? <p className="mt-1 text-xs text-muted-foreground">{t("canonicalAnalysis.review.economicsVariance")}: {item.snapshot.variance_pct.toFixed(2)}%</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
