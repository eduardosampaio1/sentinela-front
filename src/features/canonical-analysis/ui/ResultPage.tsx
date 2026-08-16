// ══ LEGACY COMPATIBILITY ═══════════════════════════════════════════════════════════════
//
// Esta pagina serve o documento HISTORICO (`analysis-result-v1`/`v2`) e continua servindo.
// A experiencia canonica sao duas visoes irmas — `/analyses/:id/argos` (ARGOS, sobre o
// `analysis-result-v3`) e `/analyses/:id/analytics` (Analytics, sobre `GET /analytics`).
//
// **Nao acrescente feature aqui.** Toda capacidade nova pertence a visao correspondente. O
// que esta rota faz e honrar deep link antigo, e ela nao pode mudar de significado por baixo
// de quem o salvou: nada de virar ARGOS-only, nada de redirect silencioso.
//
// Autoridade: Product Freeze §10.1 (T7) · Blueprint §4.6.
// ═══════════════════════════════════════════════════════════════════════════════════════
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
import { VISOES_DA_ANALISE } from "./visoes";
import { ComparacaoComAnterior } from "./analytics/ComparacaoComAnterior";
import { AcaoDeExport } from "./analytics/AcaoDeExport";
import { IndiceDeRegioes, type RegiaoIndexada } from "./analytics/IndiceDeRegioes";
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
    // As regiões do índice saem das MESMAS condições que as renderizam logo abaixo. Duas listas
    // independentes divergiriam no primeiro ajuste, e o índice passaria a apontar para o vazio.
    const regioes: RegiaoIndexada[] = [
      { ancora: "res-resumo", rotulo: t("canonicalAnalysis.result.summaryTitle") },
      { ancora: "res-atencao", rotulo: t("canonicalAnalysis.result.attentionTitle") },
      { ancora: "res-indicadores", rotulo: t("canonicalAnalysis.result.indicatorsTitle") },
      ...(v.recommendations.length > 0
        ? [{ ancora: "res-recs", rotulo: t("canonicalAnalysis.result.recommendationsTitle") }]
        : []),
      ...(resolvido.contrato === "v2"
        ? [{ ancora: "res-analytics", rotulo: t("canonicalAnalysis.result.analytics.title") }]
        : []),
      { ancora: "res-trust", rotulo: t("canonicalAnalysis.result.trustTitle") },
      ...(timeline.data
        ? [{ ancora: "res-timeline", rotulo: t("canonicalAnalysis.result.timelineTitle") }]
        : []),
      { ancora: "res-comparacao", rotulo: t("canonicalAnalysis.result.compareTitle") },
    ];
    return (
      <div className="space-y-8">
        <IndiceDeRegioes regioes={regioes} />

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
      // `aguardando` sai do ESTADO da análise — decisão de owner, 2026-08-15.
      //
      // `result_not_available` é espera neutra, e com a análise em curso isso é verdade: o
      // documento ainda vem. Com ela concluída e o documento levado pela retenção, nada vem — e o
      // spinner prometia progresso que não existe, com `aria-busy` dizendo a um leitor de tela que
      // a região está atualizando.
      //
      // Quem sabe responder é esta página, que já leu o status. O padrão do componente continua
      // sendo `true`, para toda superfície que não sabe.
      return (
        <ProblemFeedback
          error={resultado.error}
          onRetry={() => void resultado.refetch()}
          retryDisabled={resultado.isFetching}
          // SEMPRE `false` aqui, e não uma conta sobre o status: esta página só busca o
          // documento quando `pronto` (concluída E com resultado anunciado). O aviso nunca
          // significa "ainda vem" nesta rota — significa que o documento foi levado pela
          // retenção. Uma conta daria a impressão de que existe caso em curso, e não existe:
          // eu escrevi essa conta primeiro, e a contraprova a reprovou por ser inalcançável.
          aguardando={false}
        />
      );
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

          {/* A PONTE PARA AS DUAS LEITURAS ATUAIS — decisão de owner, 2026-08-15.
              ATRAVESSA O T7 DO PRODUCT FREEZE, e isso está registrado lá também.
              T7 diz duas coisas: *"não recebe feature nova"* e *"nenhuma navegação canônica nova
              aponta PARA ele"*. A segunda não é tocada — esta navegação sai daqui, não chega aqui.
              A primeira é: um bloco de navegação é capacidade que a página não tinha.
              O owner decidiu isto sabendo do congelamento, e o motivo do próprio T7 sustenta a
              decisão: ele existe porque *"deep link antigo não pode quebrar"*. A ponte não quebra
              o link — faz o link levar a algum lugar.
              Esta é a superfície CONGELADA. Quem chega aqui veio de um link salvo, e a tela
              mostrava tudo direito com uma saída só: voltar ao histórico. Nada dizia que existem
              duas leituras mais novas da MESMA análise, então o link antigo servia para sempre
              alguém que nunca conheceria a substituta. O owner decidiu manter o deep link e
              fazê-lo funcionar "da melhor forma" — é isto.
              A lista vem de `VISOES_DA_ANALISE`, a mesma que o shell e a jornada usam: uma segunda
              lista divergiria no primeiro ajuste e esta tela passaria a oferecer visão que o
              router não conhece. */}
          {analysisId && (
            <nav
              aria-label={t("canonicalAnalysis.shell.viewsNavLabel")}
              className="rounded-lg border border-border bg-card p-4"
            >
              <p className="text-sm text-muted-foreground">
                {t("canonicalAnalysis.result.newerViews")}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {VISOES_DA_ANALISE.map((visao) => (
                  <li key={visao.caminho}>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/analyses/${encodeURIComponent(analysisId)}/${visao.caminho}`}>
                        {t(`canonicalAnalysis.shell.view.${visao.caminho}`)}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}
