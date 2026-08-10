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
  useAnalysisProgress,
  useAnalysisStatus,
  useAnalysisTimeline,
} from "../data/analysis";
import { resolverResultado, type ResultadoResolvido } from "../result/adaptar";
import { ordenarPorAtencao } from "../result/atencao";
import { zonasDeProcedencia } from "../result/procedencia";
import { compararComAnterior } from "../result/comparacao";
import { formatarInstante } from "../result/formatacao";
import { useAnalysesList } from "../data/list";
import { useCanonicalScope } from "./scope";
import { ProblemFeedback } from "./notices";
import { BlocoAnalitico } from "./analytics/BlocoAnalitico";
import { SecaoDeAtencao } from "./analytics/SecaoDeAtencao";
import { RegiaoDeAnalyticsAoVivo } from "./analytics/RegiaoDeAnalyticsAoVivo";
import { PainelDeProcedencia } from "./analytics/PainelDeProcedencia";
import { LinhaDoTempo } from "./analytics/LinhaDoTempo";
import { ComparacaoComAnterior } from "./analytics/ComparacaoComAnterior";
import { AcaoDeExport } from "./analytics/AcaoDeExport";
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
  // M29 — o eixo `export` é quem decide se há o que baixar. D16: "com `export = ready`,
  // download; nos demais estados, representar o estado vindo de `/progress`".
  const progress = useAnalysisProgress(scope, analysisId);
  // M30 — "esta vs. imediatamente anterior". O par vem de DUAS leituras de `/result`, que o
  // Blueprint §4.6 declara REAL; a série da Instância é que continua APPROVED DELTA (Fase 10).
  // A anterior é SELECIONADA da listagem (ordem do produtor, cursor opaco), nunca calculada.
  const lista = useAnalysesList(scope);
  const anteriorId = (() => {
    const itens = lista.data?.items ?? [];
    const i = itens.findIndex((it) => it.analysis_id === analysisId);
    if (i < 0) return null;
    return itens.slice(i + 1).find((it) => it.result_available)?.analysis_id ?? null;
  })();
  const anterior = useAnalysisResult(scope, anteriorId, Boolean(anteriorId));
  const eixoExport =
    progress.data?.axes.find((a) => a.axis === "export")?.state ?? null;

  function documento(resolvido: Extract<ResultadoResolvido, { contrato: "v1" | "v2" }>) {
    const v = resolvido.view;
    return (
      <div className="space-y-8">
        {/* M31 — a ação de export tinha uma faixa de largura inteira só para si, encostada à
            direita: uma linha morta acima do resumo, e a exportação com o peso visual da
            navegação global. Ela desceu para o lado do título do Resumo, que é o resultado sobre
            o qual ela age. Nada mudou no que ela faz nem em quem decide se há o que baixar. */}
        <ResumoDaAnalise
          acao={<AcaoDeExport analysisId={v.analysisId} estado={eixoExport} />}
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

        {/* M31 — a linha do tempo vem ANTES da comparação. "O que aconteceu" é a narrativa deste
            resultado; "Comparado com a anterior" é uma leitura derivada dele contra outro
            documento. A ordem estava invertida, e a narrativa ficava no fim de 3400px. */}
        {timeline.data && <LinhaDoTempo vista={timeline.data} />}

        {(() => {
          // Só compara documento com documento resolvido: um payload que a fronteira recusou não
          // vira "anterior", ele vira ausência.
          const resolvidoAnterior = anterior.data ? resolverResultado(anterior.data, language) : null;
          const par =
            resolvidoAnterior && resolvidoAnterior.contrato !== "nenhum"
              ? compararComAnterior(v, resolvidoAnterior.view)
              : null;
          return <ComparacaoComAnterior comparacao={par} />;
        })()}
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
