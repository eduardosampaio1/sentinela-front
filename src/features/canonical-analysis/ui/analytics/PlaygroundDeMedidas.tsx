import { useMemo, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalyticsQueryMetricResult } from "@/lib/v1";
import { useAnalyticsPlayground } from "../../data/analysis";
import type { CatalogoDeExploracao } from "../../result/analyticsProjection";
import type { CanonicalScope } from "@/lib/v1";

type Eixo = { readonly id: string; readonly tipo: "none" | "categorical" | "temporal" };

const CAMPOS_POR_BLOCO: Record<string, readonly string[]> = {
  dataset_count: ["count"],
  numeric_summary: [
    "valid_count",
    "null_count",
    "invalid_count",
    "absent_count",
    "minimum",
    "maximum",
    "total",
    "mean",
  ],
  label_distribution: ["label", "count"],
  category_flag_cross: ["label", "true_count", "false_count", "null_count"],
  category_numeric_summary: [
    "label",
    "count",
    "null_count",
    "invalid_count",
    "minimum",
    "maximum",
    "total",
    "mean",
  ],
  temporal_count_series: ["window_start", "count", "status"],
  temporal_flag_series: [
    "window_start",
    "true_count",
    "false_count",
    "null_count",
    "status",
  ],
  temporal_numeric_series: [
    "window_start",
    "count",
    "minimum",
    "maximum",
    "total",
    "mean",
    "status",
  ],
};

function humanizar(id: string): string {
  return id.replace(/[._-]+/g, " ").replace(/\b\p{L}/gu, (letra) => letra.toUpperCase());
}

const ROTULOS_CONHECIDOS: Readonly<Record<string, string>> = {
  "dataset.record_count": "datasetRecordCount",
  channel: "channel",
  status: "status",
  time: "time",
};

function rotuloAnalitico(id: string, t: (key: string) => string): string {
  const conhecido = ROTULOS_CONHECIDOS[id];
  return conhecido ? t(`canonicalAnalysis.playground.identifiers.${conhecido}`) : humanizar(id);
}

function linhasDo(resultado: AnalyticsQueryMetricResult): readonly Record<string, unknown>[] {
  const payload = resultado.payload;
  if (!payload) return [];
  if (resultado.block_kind === "dataset_count") return [{ count: payload.count }];
  if (resultado.block_kind === "numeric_summary") return [payload];
  if (resultado.block_kind === "label_distribution") {
    return Array.isArray(payload.groups) ? payload.groups.filter(ehLinha) : [];
  }
  if (resultado.block_kind.startsWith("category_")) {
    return Array.isArray(payload.rows) ? payload.rows.filter(ehLinha) : [];
  }
  if (resultado.block_kind.startsWith("temporal_")) {
    return Array.isArray(payload.windows) ? payload.windows.filter(ehLinha) : [];
  }
  return [];
}

function ehLinha(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function valorLegivel(
  valor: unknown,
  campo: string,
  locale: string,
  sim: string,
  nao: string,
  publicado: string,
  suprimido: string,
  observado: string,
): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "number") return new Intl.NumberFormat(locale).format(valor);
  if (typeof valor === "boolean") return valor ? sim : nao;
  if (campo === "window_start" && typeof valor === "string") {
    const instante = new Date(valor);
    if (!Number.isNaN(instante.getTime())) {
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(instante);
    }
  }
  if (valor === "published") return publicado;
  if (valor === "suppressed") return suprimido;
  if (valor === "observed") return observado;
  return String(valor);
}

function TabelaDoResultado({ resultado }: { readonly resultado: AnalyticsQueryMetricResult }) {
  const { language, t } = useLanguage();
  const linhas = linhasDo(resultado);
  const campos = CAMPOS_POR_BLOCO[resultado.block_kind] ?? [];
  const locale = language === "pt" ? "pt-BR" : "en-US";

  if (resultado.availability !== "available") {
    return (
      <p role="status" className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm">
        {t(`canonicalAnalysis.universal.availability.${resultado.availability}`)}. {t("canonicalAnalysis.playground.unavailable")}
      </p>
    );
  }
  if (linhas.length === 0 || campos.length === 0) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">{rotuloAnalitico(resultado.metric_id, t)}</caption>
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>{campos.map((campo) => <th key={campo} scope="col" className="px-4 py-3 font-medium">{t(`canonicalAnalysis.playground.fields.${campo}`)}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((linha, indice) => (
            <tr key={indice} className="border-t border-border">
              {campos.map((campo) => <td key={campo} className="px-4 py-3 tabular-nums">{valorLegivel(linha[campo], campo, locale, t("common.yes"), t("common.no"), t("canonicalAnalysis.playground.published"), t("canonicalAnalysis.playground.suppressed"), t("canonicalAnalysis.playground.observed"))}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlaygroundDeMedidas({
  analysisId,
  scope,
  projectionDigest,
  catalogo,
}: {
  readonly analysisId: string;
  readonly scope: CanonicalScope;
  readonly projectionDigest: string;
  readonly catalogo: CatalogoDeExploracao;
}) {
  const { t } = useLanguage();
  const metricas = useMemo(
    () => catalogo.metrics.filter((metrica) => metrica.availability === "available"),
    [catalogo.metrics],
  );
  const [metricId, setMetricId] = useState(metricas[0]?.metric_id ?? "");
  const metrica = metricas.find((item) => item.metric_id === metricId) ?? null;
  const eixos = useMemo<Eixo[]>(() => [
    { id: "", tipo: "none" },
    ...(metrica?.compatible_dimension_ids.map((id) => ({ id, tipo: "categorical" as const })) ?? []),
    ...(metrica?.compatible_time_dimension_ids.map((id) => ({ id, tipo: "temporal" as const })) ?? []),
  ], [metrica]);
  const [eixoSerializado, setEixoSerializado] = useState("none:");
  const consulta = useAnalyticsPlayground(scope, analysisId);
  const eixo = eixos.find((item) => `${item.tipo}:${item.id}` === eixoSerializado) ?? eixos[0];

  function executar() {
    if (!metricId || !eixo) return;
    consulta.mutate({
      query_contract_version: "analytics-query-v1",
      projection_digest: projectionDigest,
      metric_ids: [metricId],
      ...(eixo.tipo === "categorical" ? { dimension_id: eixo.id } : {}),
      ...(eixo.tipo === "temporal" ? { time_dimension_id: eixo.id } : {}),
      granularity: "auto",
      filters: [],
      order: [],
      limit: 100,
    });
  }

  if (metricas.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.playground.noMetrics")}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="max-w-3xl">
        <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.playground.subtitle")}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("canonicalAnalysis.playground.safety")}</p>
      </div>
      <form className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end" onSubmit={(event) => { event.preventDefault(); executar(); }}>
        <label className="grid gap-2 text-sm font-medium">
          {t("canonicalAnalysis.playground.metric")}
          <select className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={metricId} onChange={(event) => { setMetricId(event.target.value); setEixoSerializado("none:"); consulta.reset(); }}>
            {metricas.map((item) => <option key={item.metric_id} value={item.metric_id}>{rotuloAnalitico(item.metric_id, t)}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          {t("canonicalAnalysis.playground.cut")}
          <select className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={eixoSerializado} onChange={(event) => { setEixoSerializado(event.target.value); consulta.reset(); }}>
            {eixos.map((item) => <option key={`${item.tipo}:${item.id}`} value={`${item.tipo}:${item.id}`}>{item.tipo === "none" ? t("canonicalAnalysis.playground.overall") : rotuloAnalitico(item.id, t)}</option>)}
          </select>
        </label>
        <button type="submit" disabled={consulta.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
          {consulta.isPending ? <RotateCcw aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <Play aria-hidden="true" className="size-4" />}
          {consulta.isPending ? t("canonicalAnalysis.playground.running") : t("canonicalAnalysis.playground.run")}
        </button>
      </form>
      {consulta.isError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {t("canonicalAnalysis.playground.error")}
        </div>
      ) : null}
      {consulta.data ? (
        <div aria-live="polite" className="space-y-4">
          {consulta.data.results.map((resultado) => (
            <article key={`${resultado.metric_id}:${resultado.dimension_id ?? "overall"}`} className="space-y-3">
              <div>
                <h3 className="font-semibold">{rotuloAnalitico(resultado.metric_id, t)}</h3>
                <p className="text-xs text-muted-foreground">{resultado.dimension_id ? rotuloAnalitico(resultado.dimension_id, t) : t("canonicalAnalysis.playground.overall")}</p>
              </div>
              <TabelaDoResultado resultado={resultado} />
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
          {t("canonicalAnalysis.playground.empty")}
        </div>
      )}
    </div>
  );
}
