import {
  Check,
  CircleDashed,
  Loader2,
  Mail,
  TriangleAlert,
  X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRevelacao } from "@/design/motion";
import { cn } from "@/lib/utils";
import type {
  AnalysisOperationalTruthView,
  AnalysisStatusView,
  IntakeProgressView,
} from "@/lib/v1";
import type { UploadProgress } from "../data/analysis";

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

function rotuloDoEstado(
  t: (chave: string) => string,
  estado: EstadoDaEtapa,
): string {
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

function tituloDaEtapa(
  t: (chave: string) => string,
  chave: ChaveDaEtapa,
): string {
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
  uploadProgress = null,
  intakeProgress,
  operationalTruth,
}: {
  view: AnalysisStatusView;
  uploadProgress?: UploadProgress | null;
  intakeProgress?: IntakeProgressView;
  operationalTruth?: AnalysisOperationalTruthView;
}) {
  const { language, t } = useLanguage();
  const raiz = useRevelacao<HTMLElement>(
    operationalTruth
      ? operationalTruth.stages
          .map((etapa) => `${etapa.stage}:${etapa.state}`)
          .join("|")
      : "operational-truth-unavailable",
  );
  if (!operationalTruth) {
    return (
      <section
        ref={raiz}
        aria-labelledby="analysis-live-steps"
        aria-live="polite"
        className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5"
      >
        <h2
          id="analysis-live-steps"
          className="text-base font-semibold text-foreground"
        >
          {t("canonicalAnalysis.liveProgress.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("canonicalAnalysis.liveProgress.operational.unavailable")}
        </p>
      </section>
    );
  }
  const estadoAutoritativo = new Map(
    operationalTruth.stages.map((entry) => [entry.stage, entry.state] as const),
  );
  const etapas: Etapa[] = [
    { chave: "upload", estado: estadoAutoritativo.get("upload") ?? "waiting" },
    {
      chave: "privacy",
      estado: estadoAutoritativo.get("privacy") ?? "waiting",
    },
    {
      chave: "measures",
      estado: estadoAutoritativo.get("measures") ?? "waiting",
    },
    {
      chave: "result",
      estado: estadoAutoritativo.get("final_result") ?? "waiting",
    },
  ];
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
  const marcosDoNucleo = operationalTruth?.core_milestones ?? [];
  const acompanhamentos = (operationalTruth?.follow_ups ?? []).filter(
    (item) => item.state !== "not_applicable",
  );
  const runtime = operationalTruth?.runtime_evidence ?? null;
  const formatarDuracao = (durationMs: number | null) => {
    if (durationMs === null)
      return t("canonicalAnalysis.liveProgress.operational.notMeasured");
    const seconds = Math.round(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };
  const formatarDesfecho = () => {
    if (!runtime) return "";
    if (runtime.terminal_cause) {
      return t(
        `canonicalAnalysis.liveProgress.operational.runtime.terminalCause.${runtime.terminal_cause}`,
      );
    }
    if (runtime.state === "succeeded") {
      return t(
        "canonicalAnalysis.liveProgress.operational.runtime.legacyCompleted",
      );
    }
    if (["failed", "abandoned", "cancelled"].includes(runtime.state)) {
      return t(
        "canonicalAnalysis.liveProgress.operational.runtime.legacyFinished",
      );
    }
    return t("canonicalAnalysis.liveProgress.operational.runtime.inProgress");
  };
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
        <h2
          id="analysis-live-steps"
          className="text-base font-semibold text-foreground"
        >
          {t("canonicalAnalysis.liveProgress.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.liveProgress.help")}
        </p>
        {operationalTruth ? (
          <p
            className="pt-2 text-sm font-medium text-foreground"
            data-testid="operational-next-action"
          >
            {t(
              `canonicalAnalysis.liveProgress.nextAction.${operationalTruth.next_action}`,
            )}
          </p>
        ) : null}
        {!progressoConcluido && view.status !== "failed" ? (
          <p className="flex items-start gap-2 pt-2 text-sm text-muted-foreground">
            <Mail
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            />
            <span>{t("canonicalAnalysis.liveProgress.emailNotice")}</span>
          </p>
        ) : null}
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
                        : etapa.chave === "privacy" &&
                            percentualDoIntake !== null
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
            <li
              key={etapa.chave}
              data-revelar="bloco"
              className="grid grid-cols-[auto_1fr] gap-3"
            >
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
                    })}{" "}
                    · {uploadProgress.percent}%
                  </p>
                ) : null}
                {etapa.chave === "privacy" &&
                etapa.estado === "active" &&
                intakeProgress ? (
                  <div className="mt-3 max-w-xl space-y-2">
                    {percentualDoIntake !== null ? (
                      <div
                        role="progressbar"
                        aria-label={t(
                          "canonicalAnalysis.liveProgress.intakeProgressLabel",
                        )}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percentualDoIntake}
                        aria-valuetext={t(
                          "canonicalAnalysis.liveProgress.intakePercent",
                          {
                            percent: percentualDoIntake,
                          },
                        )}
                        className="h-2 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="block h-full rounded-full bg-primary transition-transform motion-reduce:transition-none"
                          style={{
                            transform: `scaleX(${percentualDoIntake / 100})`,
                            transformOrigin: "left",
                            transitionDuration: "var(--ds-duration-base)",
                            transitionTimingFunction:
                              "var(--ds-easing-standard)",
                          }}
                        />
                      </div>
                    ) : null}
                    <p className="break-words text-xs tabular-nums text-muted-foreground">
                      {intakeProgress.total_bytes
                        ? t("canonicalAnalysis.liveProgress.intakeBytes", {
                            processed: formatarBytes(
                              intakeProgress.processed_bytes,
                            ),
                            total: formatarBytes(intakeProgress.total_bytes),
                          })
                        : t(
                            "canonicalAnalysis.liveProgress.intakeBytesUnknown",
                            {
                              processed: formatarBytes(
                                intakeProgress.processed_bytes,
                              ),
                            },
                          )}
                      {` · ${t(
                        "canonicalAnalysis.liveProgress.intakeConversations",
                        {
                          count: new Intl.NumberFormat(
                            language === "pt" ? "pt-BR" : "en-US",
                          ).format(intakeProgress.conversations_seen),
                        },
                      )}`}
                    </p>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {marcosDoNucleo.length > 0 || acompanhamentos.length > 0 || runtime ? (
        <div
          className="mt-5 border-t border-border pt-4"
          data-testid="operational-milestones"
        >
          <h3 className="text-sm font-semibold text-foreground">
            {t("canonicalAnalysis.liveProgress.operational.title")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("canonicalAnalysis.liveProgress.operational.help")}
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {[...marcosDoNucleo, ...acompanhamentos].map((item) => {
              const key =
                "milestone" in item ? item.milestone : item.capability;
              return (
                <div
                  key={key}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/70 bg-background/40 px-3 py-2"
                >
                  <dt className="min-w-0 text-xs font-medium text-foreground">
                    {t(
                      `canonicalAnalysis.liveProgress.operational.item.${key}`,
                    )}
                  </dt>
                  <dd className="shrink-0 text-xs text-muted-foreground">
                    {t(
                      `canonicalAnalysis.liveProgress.operational.state.${item.state}`,
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {runtime ? (
            <div className="mt-3 rounded-md border border-border/70 bg-background/40 px-3 py-3">
              <h4 className="text-xs font-semibold text-foreground">
                {t("canonicalAnalysis.liveProgress.operational.runtime.title")}
              </h4>
              <dl className="mt-2 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {t(
                      "canonicalAnalysis.liveProgress.operational.runtime.attempt",
                    )}
                  </dt>
                  <dd className="tabular-nums text-foreground">
                    {runtime.attempt_number ??
                      t(
                        "canonicalAnalysis.liveProgress.operational.notMeasured",
                      )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {t(
                      "canonicalAnalysis.liveProgress.operational.runtime.duration",
                    )}
                  </dt>
                  <dd className="tabular-nums text-foreground">
                    {formatarDuracao(runtime.duration_ms)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {t(
                      "canonicalAnalysis.liveProgress.operational.runtime.ownership",
                    )}
                  </dt>
                  <dd className="text-foreground">
                    {t(
                      `canonicalAnalysis.liveProgress.operational.runtime.ownershipState.${runtime.ownership_state}`,
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {t(
                      "canonicalAnalysis.liveProgress.operational.runtime.outcome",
                    )}
                  </dt>
                  <dd className="text-foreground">{formatarDesfecho()}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
