import { Check, CircleDashed, Loader2, TriangleAlert, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRevelacao } from "@/design/motion";
import { cn } from "@/lib/utils";
import type { AnalysisStatusView } from "@/lib/v1";
import type { EixoLido } from "../result/eixos";

type EstadoDaEtapa = "waiting" | "active" | "done" | "attention" | "failed";
type ChaveDaEtapa = "upload" | "privacy" | "measures" | "result";

interface Etapa {
  chave: ChaveDaEtapa;
  estado: EstadoDaEtapa;
}

const ICONE: Record<EstadoDaEtapa, typeof Check> = {
  waiting: CircleDashed,
  active: Loader2,
  done: Check,
  attention: TriangleAlert,
  failed: X,
};

const TOM: Record<EstadoDaEtapa, string> = {
  waiting: "border-border bg-card text-muted-foreground",
  active: "border-primary/40 bg-primary/10 text-foreground",
  done: "border-success/40 bg-success/10 text-foreground",
  attention: "border-warning/40 bg-warning/10 text-foreground",
  failed: "border-destructive/40 bg-destructive/10 text-foreground",
};

function estadoDoUpload(status: AnalysisStatusView["status"]): EstadoDaEtapa {
  if (status === "preparing") return "waiting";
  if (status === "receiving") return "active";
  if (status === "failed") return "failed";
  return "done";
}

function estadoDaProtecao(view: AnalysisStatusView): EstadoDaEtapa {
  const clearance = view.intake?.privacy_clearance ?? null;
  if (clearance && clearance !== "passed") return "failed";
  if (view.status === "needs_mapping") return "attention";
  if (view.status === "preparing") return "waiting";
  if (view.status === "receiving") return "active";
  if (view.intake) return "done";
  return "waiting";
}

function estadoDasMedidas(eixos: readonly EixoLido[], status: AnalysisStatusView["status"]): EstadoDaEtapa {
  if (status === "failed") {
    const algumaMedidaDisponivel = eixos.some((eixo) => {
      const estado = eixo.entrada?.state;
      return estado === "ready" || estado === "partial";
    });
    return algumaMedidaDisponivel ? "done" : "failed";
  }
  const eixoDeCalculo = eixos[0]?.entrada;
  const eixoAnalitico = eixos[1]?.entrada;
  if (eixoDeCalculo?.state === "failed" || eixoAnalitico?.state === "failed") return "failed";
  if (eixoAnalitico?.state === "withheld") return "attention";
  if (eixoAnalitico?.state === "ready" || eixoAnalitico?.state === "partial") return "done";
  if (eixoDeCalculo?.state === "ready") return "active";
  if (eixoDeCalculo?.state === "running" || eixoAnalitico?.state === "running") return "active";
  if (status === "queued" || status === "running" || status === "recovering") return "active";
  return "waiting";
}

function estadoDoResultado(eixos: readonly EixoLido[], status: AnalysisStatusView["status"]): EstadoDaEtapa {
  const eixoFinal = eixos[3]?.entrada;
  if (status === "completed") return "done";
  if (eixoFinal?.state === "failed" || status === "failed") return "failed";
  if (eixoFinal?.state === "ready") return "done";
  if (eixoFinal?.state === "pending") return "active";
  if (status === "queued" || status === "running" || status === "recovering") return "waiting";
  return "waiting";
}

function rotuloDoEstado(t: (chave: string) => string, estado: EstadoDaEtapa): string {
  switch (estado) {
    case "waiting":
      return t("canonicalAnalysis.liveProgress.state.waiting");
    case "active":
      return t("canonicalAnalysis.liveProgress.state.active");
    case "done":
      return t("canonicalAnalysis.liveProgress.state.done");
    case "attention":
      return t("canonicalAnalysis.liveProgress.state.attention");
    case "failed":
      return t("canonicalAnalysis.liveProgress.state.failed");
  }
}

function tituloDaEtapa(t: (chave: string) => string, chave: ChaveDaEtapa): string {
  switch (chave) {
    case "upload":
      return t("canonicalAnalysis.liveProgress.steps.upload.title");
    case "privacy":
      return t("canonicalAnalysis.liveProgress.steps.privacy.title");
    case "measures":
      return t("canonicalAnalysis.liveProgress.steps.measures.title");
    case "result":
      return t("canonicalAnalysis.liveProgress.steps.result.title");
  }
}

function textoDaEtapa(t: (chave: string) => string, etapa: Etapa): string {
  switch (etapa.chave) {
    case "upload":
      return t(`canonicalAnalysis.liveProgress.steps.upload.${etapa.estado}`);
    case "privacy":
      return t(`canonicalAnalysis.liveProgress.steps.privacy.${etapa.estado}`);
    case "measures":
      return t(`canonicalAnalysis.liveProgress.steps.measures.${etapa.estado}`);
    case "result":
      return t(`canonicalAnalysis.liveProgress.steps.result.${etapa.estado}`);
  }
}

export function EtapasDaAnalise({
  view,
  eixos,
}: {
  view: AnalysisStatusView;
  eixos: readonly EixoLido[];
}) {
  const { t } = useLanguage();
  const etapas: Etapa[] = [
    { chave: "upload", estado: estadoDoUpload(view.status) },
    { chave: "privacy", estado: estadoDaProtecao(view) },
    { chave: "measures", estado: estadoDasMedidas(eixos, view.status) },
    { chave: "result", estado: estadoDoResultado(eixos, view.status) },
  ];
  const raiz = useRevelacao<HTMLElement>(
    etapas.map((etapa) => `${etapa.chave}:${etapa.estado}`).join("|"),
  );

  return (
    <section
      ref={raiz}
      aria-labelledby="analysis-live-steps"
      aria-live="polite"
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="space-y-1">
        <h2 id="analysis-live-steps" className="text-base font-semibold text-foreground">
          {t("canonicalAnalysis.liveProgress.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.liveProgress.help")}
        </p>
      </div>
      <ol className="mt-4 space-y-3">
        {etapas.map((etapa, indice) => {
          const Icone = ICONE[etapa.estado];
          return (
            <li key={etapa.chave} data-revelar="bloco" className="grid grid-cols-[auto_1fr] gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                    TOM[etapa.estado],
                  )}
                  style={{
                    transitionDuration: "var(--ds-duration-base)",
                    transitionTimingFunction: "var(--ds-easing-standard)",
                  }}
                >
                  <Icone
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4",
                      etapa.estado === "active" && "motion-safe:animate-spin",
                    )}
                  />
                </span>
                {indice < etapas.length - 1 && (
                  <span
                    aria-hidden="true"
                    data-revelar="barra"
                    className="mt-2 h-full w-px origin-top bg-border"
                  />
                )}
              </div>
              <div className="min-w-0 pb-2">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {tituloDaEtapa(t, etapa.chave)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {rotuloDoEstado(t, etapa.estado)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {textoDaEtapa(t, etapa)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
