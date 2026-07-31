// Acompanhamento por analysis_id (Onda 6 E2/E3). Identidade durável: retomável por deep link/refresh.
// Renderiza por ESTADO PÚBLICO — upload (preparing) → submit (receiving) → banner (fila/execução/
// recuperação) → terminal (completed/failed). Sem indicador analítico, sem % inventado.

import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
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
import { ProblemFeedback, StateBanner } from "./notices";

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

  // Submit/retry SEMPRE reusam o MESMO analysis_id e a Idempotency-Key da INTENÇÃO — nunca prepare,
  // nunca upload, nunca nova chave p/ mascarar conflito. O bloqueio (isPending||isSuccess) impede
  // duplo-clique e retries concorrentes; NENHUMA mutation re-tenta sozinha.
  const submitBloqueado = submit.isPending || submit.isSuccess;
  const retryBloqueado = retry.isPending || retry.isSuccess;
  function dispararSubmit() {
    if (!scope || !analysisId || submitBloqueado) return;
    submit.mutate({ analysisId, scope, idempotencyKey: submitIntent.ensure() }, { onSuccess: revalidar });
  }
  function dispararRetry() {
    if (!scope || !analysisId || retryBloqueado) return;
    retry.mutate({ analysisId, scope, idempotencyKey: retryIntent.ensure() }, { onSuccess: revalidar });
  }

  function corpo() {
    if (!scope) {
      return <p role="alert" className="text-sm text-muted-foreground">{t("canonicalAnalysis.entry.workspaceMissing")}</p>;
    }
    if (status.isLoading) {
      return <LoadingState message={t("canonicalAnalysis.state.preparing.title")} size="md" />;
    }
    if (status.isError) {
      // Erro da LEITURA de status (deep link inválido, 401, indisponível): apresentação pelo código.
      // Leitura PODE re-tentar (limitado) por ação do usuário — item 22 (nunca auto p/ mutation).
      return <ProblemFeedback error={status.error} onRetry={() => void status.refetch()} retryDisabled={status.isFetching} />;
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
            <Button onClick={dispararSubmit} disabled={submitBloqueado} aria-busy={submit.isPending}>
              {t("canonicalAnalysis.upload.submit")}
            </Button>
            {/* Erro de submit pelo CÓDIGO: capacity_wait/analysis_not_ready = espera neutra;
                temporarily_unavailable/rede = re-submeter; idempotency_conflict = só mensagem. */}
            <ProblemFeedback error={submit.error} onRetry={dispararSubmit} retryDisabled={submitBloqueado} />
          </div>
        );
      case "completed":
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            {view.result_available ? (
              // E5: a ação agora leva à página canônica de resultado (deep-linkável).
              <Button variant="outline" asChild>
                <Link to={`/canonical/analyses/${encodeURIComponent(analysisId)}/result`}>
                  {t("canonicalAnalysis.action.viewResult")}
                </Link>
              </Button>
            ) : (
              // result_not_available: concluída mas resultado em preparação — NÃO é falha analítica,
              // NÃO renderiza dashboard (E5). Apresentação neutra de espera.
              <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                {t("canonicalAnalysis.action.resultPreparing")}
              </p>
            )}
          </div>
        );
      case "failed":
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            {view.retry_allowed ? (
              // Recuperável: retry canônico (mesmo analysis_id, sem prepare/upload).
              <Button onClick={dispararRetry} disabled={retryBloqueado} aria-busy={retry.isPending}>
                {t("canonicalAnalysis.action.retry")}
              </Button>
            ) : (
              // Não recuperável: NÃO oferecer "tentar novamente". Nova análise = nova INTENÇÃO
              // explícita (novo prepare + nova Idempotency-Key), não um retry falso da mesma.
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/canonical/analyses/new">{t("canonicalAnalysis.action.newAnalysis")}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/canonical/analyses">{t("canonicalAnalysis.action.back")}</Link>
                </Button>
              </div>
            )}
            {/* Erro do retry pelo CÓDIGO (mensagem; o botão acima já permite re-tentar quando cabível). */}
            <ProblemFeedback error={retry.error} />
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
