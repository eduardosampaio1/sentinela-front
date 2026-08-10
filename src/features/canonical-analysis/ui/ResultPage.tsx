// Página canônica de RESULTADO (Onda 6 E5, estendida na MF6.4b). Consome SÓ
// `GET /v1/analyses/{id}/result` via o cliente canônico; o payload opaco passa pela FRONTEIRA
// ÚNICA de contrato antes de virar UI.
//
// Este componente NÃO conhece o shape do payload, não calcula nada e não lê campos crus. A única
// coisa que ele decide é QUAL árvore renderizar, e decide pelo discriminador que `resolverResultado`
// já resolveu — não por `if (version === …)` espalhado, e nunca por presença de campo.
//
// O v1 continua exatamente como era: mesmas seções, mesmos textos, mesmo comportamento. O v2
// acrescenta o bloco analítico DEPOIS delas — a Engine primeiro, porque é ela que responde a
// pergunta que trouxe a pessoa até aqui.

import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/shared/states/LoadingState";
import {
  useAnalysisAnalytics,
  useAnalysisResult,
  useAnalysisStatus,
  useAnalysisTimeline,
} from "../data/analysis";
import { resolverResultado, type ResultadoResolvido } from "../result/adaptar";
import { ordenarPorAtencao } from "../result/atencao";
import { zonasDeProcedencia } from "../result/procedencia";
import { formatarInstante } from "../result/formatacao";
import { useCanonicalScope } from "./scope";
import { ProblemFeedback } from "./notices";
import { BlocoAnalitico } from "./analytics/BlocoAnalitico";
import { SecaoDeAtencao } from "./analytics/SecaoDeAtencao";
import { RegiaoDeAnalyticsAoVivo } from "./analytics/RegiaoDeAnalyticsAoVivo";
import { PainelDeProcedencia } from "./analytics/PainelDeProcedencia";
import { LinhaDoTempo } from "./analytics/LinhaDoTempo";
import { BotaoDeExport } from "./analytics/BotaoDeExport";
import {
  ResumoDaAnalise,
  SecaoDeIndicadores,
  SecaoDeRecomendacoes,
} from "./analytics/SecoesDaEngine";

// AQUI FICAVA `Procedencia` — uma linha de texto no rodapé com `schemaVersion · registro`.
// A M28 a substituiu pelo `PainelDeProcedencia`, que diz as MESMAS duas coisas e mais, e diz de
// ONDE cada uma veio. Manter as duas daria dois lugares para o mesmo fato; manter a antiga sem
// chamador seria código morto, que a regra da casa proíbe.

export function ResultPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const analysisId = params.analysisId ?? null;
  const scope = useCanonicalScope();
  const status = useAnalysisStatus(scope, analysisId);
  const pronto = status.data?.status === "completed" && status.data.result_available === true;
  const resultado = useAnalysisResult(scope, analysisId, pronto);
  // Habilitado SEM depender de `pronto`: é essa independência que sustenta a leitura progressiva.
  const analytics = useAnalysisAnalytics(scope, analysisId);
  const timeline = useAnalysisTimeline(scope, analysisId);

  function documento(resolvido: Extract<ResultadoResolvido, { contrato: "v1" | "v2" }>) {
    const v = resolvido.view;
    return (
      <div className="space-y-8">
        <div className="flex justify-end">
          <BotaoDeExport resolvido={resolvido} />
        </div>

        <ResumoDaAnalise
          recordCountDisplay={
            resolvido.contrato === "v2"
              ? resolvido.view.summary.engineWindowRecordCountDisplay
              : String(resolvido.view.summary.recordCount)
          }
          analyzedAtDisplay={
            resolvido.contrato === "v2"
              ? resolvido.view.summary.analyzedAtDisplay
              : // O v1 não traz a data formatada no view model. Formatar aqui usa a MESMA
                // função do adapter v2 — e não um `toLocaleString` local, que seria a segunda
                // casa de formatação.
                resolvido.view.summary.analyzedAt
                ? formatarInstante(resolvido.view.summary.analyzedAt, language)
                : null
          }
        />

        {/* M26 — atenção ANTES dos indicadores. A ordem da página é a ordem da leitura: primeiro
            o que o documento assinalou, depois o conjunto completo. Inverter faria a pessoa
            varrer a grade inteira para descobrir se havia algo a conferir. */}
        <SecaoDeAtencao itens={ordenarPorAtencao(v.indicators)} />

        <SecaoDeIndicadores
          indicators={v.indicators}
          partial={v.partial}
          partialityReasons={v.partialityReasons}
          unsupportedIndicatorIds={v.unsupportedIndicatorIds}
        />

        <SecaoDeRecomendacoes recommendations={v.recommendations} />

        {resolvido.contrato === "v2" && <BlocoAnalitico analytics={resolvido.view.analytics} />}

        {/* M28 — Trust deixa de ser uma linha solta no rodapé e vira zona com origem apontável. */}
        <PainelDeProcedencia zonas={zonasDeProcedencia(resolvido, t)} />

        {timeline.data && <LinhaDoTempo vista={timeline.data} />}
      </div>
    );
  }

  function corpo() {
    if (!scope) {
      return (
        <p role="alert" className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.entry.workspaceMissing")}
        </p>
      );
    }
    if (status.isLoading || (pronto && resultado.isLoading)) {
      return <LoadingState message={t("canonicalAnalysis.result.loading")} size="md" />;
    }
    if (status.isError) {
      return <ProblemFeedback error={status.error} onRetry={() => void status.refetch()} retryDisabled={status.isFetching} />;
    }
    // Concluída mas sem resultado disponível: estado seguro da E6 (sem dashboard vazio).
    //
    // M27 — DISPONIBILIDADE PROGRESSIVA. Antes, este ramo devolvia só a frase e mais nada, e com
    // isso um componente analítico já PRONTO ficava escondido atrás de um documento que ainda não
    // existia. O documento v2 só nasce depois da barreira; `GET /analytics` responde antes. Um
    // componente indisponível não pode bloquear outro disponível.
    if (status.data && !pronto) {
      return (
        <div className="space-y-8">
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {t("canonicalAnalysis.action.resultPreparing")}
          </p>
          {analytics.data && (
            <>
              <p className="text-sm text-muted-foreground">
                {t("canonicalAnalysis.result.analytics.waitingDocument")}
              </p>
              <RegiaoDeAnalyticsAoVivo vista={analytics.data} />
            </>
          )}
        </div>
      );
    }
    if (resultado.isError) {
      return <ProblemFeedback error={resultado.error} onRetry={() => void resultado.refetch()} retryDisabled={resultado.isFetching} />;
    }
    if (!resultado.data) return null;

    const resolvido = resolverResultado(resultado.data, language);
    if (resolvido.contrato === "nenhum") {
      // Schema desconhecido/ausente, OU um v2 que não passou na própria validação. Nos dois
      // casos: estado seguro, nada de JSON cru, nada de adivinhação — e, no segundo, NENHUMA
      // tentativa de aproveitar o que dá pelo v1. Um resultado que parece completo e perdeu o
      // bloco analítico em silêncio é a falha mais cara possível aqui.
      return (
        <div role="alert" className="space-y-3 rounded-lg border border-border bg-card p-6">
          <p className="text-foreground">{t("canonicalAnalysis.result.unsupported")}</p>
          <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.unsupportedHint")}</p>
          <Button variant="outline" asChild>
            <Link to="/analyses">{t("canonicalAnalysis.result.backToHistory")}</Link>
          </Button>
        </div>
      );
    }

    return documento(resolvido);
  }

  return (
    <AppShell topBarTitle={t("canonicalAnalysis.result.title")}>
      <PageFrame maxWidth="lg">
        <div className="space-y-6" data-testid="canonical-result-page">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">{t("canonicalAnalysis.result.title")}</h1>
              <p className="mt-1 truncate text-muted-foreground">{analysisId}</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/analyses">{t("canonicalAnalysis.result.backToHistory")}</Link>
            </Button>
          </div>
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}
