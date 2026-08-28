import { Check, CircleDashed, Loader2, TriangleAlert, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRevelacao } from "@/design/motion";
import { cn } from "@/lib/utils";
import type { AnalysisStatusView, IntakeProgressView } from "@/lib/v1";
import type { UploadProgress } from "../data/analysis";
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

function estadoDoUpload(
  status: AnalysisStatusView["status"],
  progresso: UploadProgress | null,
): EstadoDaEtapa {
  if (progresso && progresso.state !== "done") return "active";
  if (status === "preparing") return progresso ? "active" : "waiting";
  // `receiving` só é publicado depois que o POST simples respondeu ou o multipart concluiu.
  // A partir daqui o arquivo chegou; quem está ativo é a preparação/proteção no backend.
  return "done";
}

function estadoDaProtecao(view: AnalysisStatusView, progresso: UploadProgress | null): EstadoDaEtapa {
  // `receiving` tambem e o estado da sessao multipart ABERTA. Enquanto o browser ainda publica
  // partes, a protecao nao pode aparecer ativa em paralelo como se ja tivesse a base inteira.
  if (progresso && progresso.state !== "done") return "waiting";
  const clearance = view.intake?.privacy_clearance ?? null;
  if (clearance && clearance !== "passed") return "failed";
  if (view.status === "needs_mapping") return "attention";
  if (view.status === "preparing") return "waiting";
  if (view.status === "receiving") return "active";
  // Estes estados só são alcançados depois que a ingestão liberou o artefato. `intake` é um
  // detalhe opcional da visão pública; sua ausência não faz uma etapa já vencida voltar a
  // "aguardando". A ordem do lifecycle é a evidência pública disponível aqui.
  if (
    view.status === "ready_to_submit" ||
    view.status === "queued" ||
    view.status === "running" ||
    view.status === "recovering" ||
    view.status === "completed"
  ) return "done";
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
  // `pending` quer dizer que o eixo existe, não que ele seja a etapa atual. Durante mapping,
  // recebimento e fila, fazê-lo piscar como ativo saltava visualmente para a etapa 4 enquanto a
  // pessoa ainda precisava resolver a etapa 2.
  const calculoPronto = eixos.slice(0, 2).some((eixo) => {
    const estado = eixo.entrada?.state;
    return estado === "ready" || estado === "partial" || estado === "withheld";
  });
  if (eixoFinal?.state === "pending" && calculoPronto) return "active";
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
  uploadProgress = null,
  intakeProgress,
}: {
  view: AnalysisStatusView;
  eixos: readonly EixoLido[];
  uploadProgress?: UploadProgress | null;
  intakeProgress?: IntakeProgressView;
}) {
  const { language, t } = useLanguage();
  const etapas: Etapa[] = [
    { chave: "upload", estado: estadoDoUpload(view.status, uploadProgress) },
    { chave: "privacy", estado: estadoDaProtecao(view, uploadProgress) },
    { chave: "measures", estado: estadoDasMedidas(eixos, view.status) },
    { chave: "result", estado: estadoDoResultado(eixos, view.status) },
  ];
  const raiz = useRevelacao<HTMLElement>(
    etapas.map((etapa) => `${etapa.chave}:${etapa.estado}`).join("|"),
  );
  const concluidas = etapas.filter((etapa) => etapa.estado === "done").length;
  const indiceDeAtencao = etapas.findIndex(
    (etapa) => etapa.estado === "attention" || etapa.estado === "failed",
  );
  const indiceAtual = etapas.findIndex((etapa) => etapa.estado === "active");
  const indiceDaLeitura =
    indiceDeAtencao >= 0
      ? indiceDeAtencao
      : indiceAtual >= 0
        ? indiceAtual
        : concluidas < etapas.length - 1
          ? concluidas
          : etapas.length - 1;
  const etapaDaLeitura = etapas[indiceDaLeitura];
  const progressoConcluido = concluidas === etapas.length;
  const percentualDoIntake =
    intakeProgress?.percent === null || intakeProgress?.percent === undefined
      ? null
      : Math.max(0, Math.min(100, intakeProgress.percent));
  const formatarBytes = (valor: number) => {
    const emGigabytes = valor >= 1_000_000_000;
    return new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
      style: "unit",
      unit: emGigabytes ? "gigabyte" : "megabyte",
      unitDisplay: "short",
      maximumFractionDigits: 1,
    }).format(valor / (emGigabytes ? 1_000_000_000 : 1_000_000));
  };

  return (
    <section
      ref={raiz}
      aria-labelledby="analysis-live-steps"
      aria-live="polite"
      className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      <div className="space-y-1">
        <h2 id="analysis-live-steps" className="text-base font-semibold text-foreground">
          {t("canonicalAnalysis.liveProgress.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.liveProgress.help")}
        </p>
      </div>
      <div className="mt-4 space-y-2">
        <div
          role="progressbar"
          aria-label={t("canonicalAnalysis.liveProgress.stageProgressLabel")}
          aria-valuemin={0}
          aria-valuemax={etapas.length}
          aria-valuenow={concluidas}
          aria-valuetext={
            progressoConcluido
              ? t("canonicalAnalysis.liveProgress.stageProgressComplete")
              : t("canonicalAnalysis.liveProgress.stageProgressValue", {
                  current: indiceDaLeitura + 1,
                  total: etapas.length,
                  title: tituloDaEtapa(t, etapaDaLeitura.chave),
                })
          }
          className="grid grid-cols-4 gap-1.5"
        >
          {etapas.map((etapa) => (
            <span
              key={etapa.chave}
              aria-hidden="true"
              className={cn(
                "h-1.5 overflow-hidden rounded-full bg-muted",
                etapa.estado === "done" && "bg-success/80",
                etapa.estado === "attention" && "bg-warning/60",
                etapa.estado === "failed" && "bg-destructive/70",
              )}
            >
              {etapa.estado === "active" && (
                <span
                  className={cn(
                    "block h-full rounded-full bg-primary/80 transition-[width] motion-reduce:transition-none",
                    etapa.chave !== "upload" && "motion-safe:animate-pulse",
                  )}
                  style={{
                    width:
                      etapa.chave === "upload" && uploadProgress
                        ? `${
                            uploadProgress.percent < 0
                              ? 0
                              : uploadProgress.percent > 100
                                ? 100
                                : uploadProgress.percent
                          }%`
                        : etapa.chave === "privacy" && percentualDoIntake !== null
                          ? `${percentualDoIntake}%`
                        : "100%",
                    transitionDuration: "var(--ds-duration-base)",
                    transitionTimingFunction: "var(--ds-easing-standard)",
                  }}
                />
              )}
            </span>
          ))}
        </div>
        {!progressoConcluido && (
          <p className="break-words text-xs tabular-nums text-muted-foreground">
            {t("canonicalAnalysis.liveProgress.stageProgressValue", {
              current: indiceDaLeitura + 1,
              total: etapas.length,
              title: tituloDaEtapa(t, etapaDaLeitura.chave),
            })}
          </p>
        )}
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
                {etapa.chave === "upload" &&
                etapa.estado === "active" &&
                uploadProgress?.currentPart &&
                uploadProgress.totalParts ? (
                  <p className="mt-1 break-words text-xs tabular-nums text-muted-foreground">
                    {t("canonicalAnalysis.upload.uploadingPart", {
                      current: uploadProgress.currentPart,
                      total: uploadProgress.totalParts,
                    })} · {uploadProgress.percent}%
                  </p>
                ) : null}
                {etapa.chave === "privacy" &&
                etapa.estado === "active" &&
                intakeProgress ? (
                  <div className="mt-3 max-w-xl space-y-2">
                    {percentualDoIntake !== null ? (
                      <div
                        role="progressbar"
                        aria-label={t("canonicalAnalysis.liveProgress.intakeProgressLabel")}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percentualDoIntake}
                        aria-valuetext={t("canonicalAnalysis.liveProgress.intakePercent", {
                          percent: percentualDoIntake,
                        })}
                        className="h-2 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="block h-full rounded-full bg-primary transition-transform motion-reduce:transition-none"
                          style={{
                            transform: `scaleX(${percentualDoIntake / 100})`,
                            transformOrigin: "left",
                            transitionDuration: "var(--ds-duration-base)",
                            transitionTimingFunction: "var(--ds-easing-standard)",
                          }}
                        />
                      </div>
                    ) : null}
                    <p className="break-words text-xs tabular-nums text-muted-foreground">
                      {intakeProgress.total_bytes
                        ? t("canonicalAnalysis.liveProgress.intakeBytes", {
                            processed: formatarBytes(intakeProgress.processed_bytes),
                            total: formatarBytes(intakeProgress.total_bytes),
                          })
                        : t("canonicalAnalysis.liveProgress.intakeBytesUnknown", {
                            processed: formatarBytes(intakeProgress.processed_bytes),
                          })}
                      {` · ${t("canonicalAnalysis.liveProgress.intakeConversations", {
                        count: new Intl.NumberFormat(
                          language === "pt" ? "pt-BR" : "en-US",
                        ).format(intakeProgress.conversations_seen),
                      })}`}
                    </p>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
