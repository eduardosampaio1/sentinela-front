// Acompanhamento por analysis_id (Onda 6 E2/E3). Identidade durável: retomável por deep link/refresh.
// Renderiza por ESTADO PÚBLICO — upload (preparing) → submit (receiving) → banner (fila/execução/
// recuperação) → terminal (completed/failed). Sem indicador analítico, sem % inventado.

import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { workspaceKeys } from "@/lib/v1";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/shared/states/LoadingState";
import { useAnalysisStatus, useRetryAnalysis, useSubmitAnalysis } from "../data/analysis";
import { useIdempotencyIntent } from "../data/intent";
import { useCanonicalScope } from "./scope";
import { UploadStep } from "./UploadStep";
import { ProblemNotice, StateBanner } from "./notices";

export function AnalysisPage() {
  const { t } = useLanguage();
  const params = useParams();
  const analysisId = params.analysisId ?? null;
  const scope = useCanonicalScope();
  const queryClient = useQueryClient();
  const status = useAnalysisStatus(scope, analysisId);
  const submit = useSubmitAnalysis();
  const retry = useRetryAnalysis();
  // Idempotency-Key por INTENÇÃO também no submit/retry: reusada em retry de falha transitória,
  // reset no sucesso — o backend nunca vê a mesma intenção como submits distintos (Codex E2 R1).
  const submitIntent = useIdempotencyIntent();
  const retryIntent = useIdempotencyIntent();

  function revalidar() {
    if (scope && analysisId) {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.status(scope.workspaceId, analysisId) });
    }
  }

  function corpo() {
    if (!scope) {
      return <p role="alert" className="text-sm text-muted-foreground">{t("canonicalAnalysis.entry.workspaceMissing")}</p>;
    }
    if (status.isLoading) {
      return <LoadingState message={t("canonicalAnalysis.state.preparing.title")} size="md" />;
    }
    if (status.isError) {
      return <ProblemNotice error={status.error} />;
    }
    const view = status.data;
    if (!view || !analysisId) return null;

    switch (view.status) {
      case "preparing":
        return <UploadStep analysisId={analysisId} scope={scope} onUploaded={revalidar} />;
      case "receiving":
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            <Button
              onClick={() =>
                submit.mutate(
                  { analysisId, scope, idempotencyKey: submitIntent.ensure() },
                  { onSuccess: () => { submitIntent.reset(); revalidar(); } },
                )
              }
              disabled={submit.isPending}
              aria-busy={submit.isPending}
            >
              {t("canonicalAnalysis.upload.submit")}
            </Button>
            <ProblemNotice error={submit.error} />
          </div>
        );
      case "completed":
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            {view.result_available && (
              // E3: apenas expõe a ação futura — a renderização do resultado é da E5.
              <Button variant="outline" disabled>{t("canonicalAnalysis.action.viewResult")}</Button>
            )}
          </div>
        );
      case "failed":
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            {view.retry_allowed && (
              <Button
                onClick={() =>
                  retry.mutate(
                    { analysisId, scope, idempotencyKey: retryIntent.ensure() },
                    { onSuccess: () => { retryIntent.reset(); revalidar(); } },
                  )
                }
                disabled={retry.isPending}
                aria-busy={retry.isPending}
              >
                {t("canonicalAnalysis.action.retry")}
              </Button>
            )}
            <ProblemNotice error={retry.error} />
          </div>
        );
      default:
        // queued / running / recovering
        return <StateBanner view={view} />;
    }
  }

  return (
    <AppShell topBarTitle={t("canonicalAnalysis.entry.title")}>
      <PageFrame maxWidth="md">
        <div className="space-y-6" data-testid="canonical-analysis-page">
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}
