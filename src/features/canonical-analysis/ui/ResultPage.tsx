// Página canônica de RESULTADO (Onda 6 E5). Consome SÓ `GET /v1/analyses/{id}/result` via o
// cliente canônico; o payload opaco passa pelo ADAPTER ÚNICO antes de virar UI.
//
// Este componente NÃO conhece o shape do payload, não calcula nada e não lê campos crus: recebe
// um view model já formatado (valor, unidade, disponibilidade). Sem gráfico decorativo, sem
// veredito, sem severidade, sem priorização local.

import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/shared/states/LoadingState";
import { useAnalysisResult, useAnalysisStatus } from "../data/analysis";
import { adaptAnalysisResult, type IndicatorView } from "../result/adapter";
import { useCanonicalScope } from "./scope";
import { ProblemFeedback } from "./notices";

function ValorIndicador({ item }: { item: IndicatorView }) {
  const { t } = useLanguage();
  if (item.display === null) {
    // Ausência NUNCA vira zero: texto explícito, distinto de "0" e distinto ENTRE SI. Um cálculo
    // que FALHOU não é a mesma coisa que um que não se aplica — o primeiro é problema a
    // investigar, o segundo é resposta legítima. Colapsar os dois esconde incidente.
    const chave: Record<typeof item.state, string> = {
      measured: "canonicalAnalysis.result.notMeasured",
      partially_measured: "canonicalAnalysis.result.notMeasured",
      not_measured: "canonicalAnalysis.result.notMeasured",
      not_applicable: "canonicalAnalysis.result.notApplicable",
      calculation_failed: "canonicalAnalysis.result.calculationFailed",
    };
    return (
      <span className="text-base font-medium text-muted-foreground">{t(chave[item.state])}</span>
    );
  }
  return (
    <span className="text-2xl font-semibold text-foreground">
      {item.display}
      {item.unitSuffix && <span className="ml-0.5 text-lg text-muted-foreground">{item.unitSuffix}</span>}
    </span>
  );
}

function CartaoIndicador({ item }: { item: IndicatorView }) {
  const { t } = useLanguage();
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground">{t(item.descriptor.labelKey)}</p>
      <p className="mt-1">
        <ValorIndicador item={item} />
      </p>
      {/* o "porquê" do número, sempre legível — nunca só a cor/valor */}
      <p className="mt-2 text-xs text-muted-foreground">{t(item.descriptor.descriptionKey)}</p>
      {/* Medido em PARTE da amostra: o numero e real, a cobertura nao e total. Dizer isso e a
          diferenca entre informar e enganar. */}
      {item.state === "partially_measured" && (
        <p role="note" className="mt-2 text-xs text-muted-foreground">
          {t("canonicalAnalysis.result.partiallyMeasured")}
          {item.coverageDisplay && ` (${item.coverageDisplay})`}
        </p>
      )}
      {/* Sobre o que a razao foi calculada — auditabilidade do numero, vinda da origem. */}
      {item.denominator && (
        <p className="mt-1 text-xs text-muted-foreground">
          {t("canonicalAnalysis.result.denominator")}: {item.denominator.value}
        </p>
      )}
      {item.outOfRange && (
        <p role="note" className="mt-2 text-xs text-destructive">
          {t("canonicalAnalysis.result.outOfRange")}
        </p>
      )}
    </li>
  );
}

export function ResultPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const analysisId = params.analysisId ?? null;
  const scope = useCanonicalScope();
  const status = useAnalysisStatus(scope, analysisId);
  const pronto = status.data?.status === "completed" && status.data.result_available === true;
  const resultado = useAnalysisResult(scope, analysisId, pronto);

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
    if (status.data && !pronto) {
      return (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.action.resultPreparing")}
        </p>
      );
    }
    if (resultado.isError) {
      return <ProblemFeedback error={resultado.error} onRetry={() => void resultado.refetch()} retryDisabled={resultado.isFetching} />;
    }
    if (!resultado.data) return null;

    const adaptado = adaptAnalysisResult(resultado.data, language);
    if (adaptado.status === "unsupported") {
      // Schema desconhecido/ausente: estado seguro. Nada de JSON cru, nada de adivinhação.
      return (
        <div role="alert" className="space-y-3 rounded-lg border border-border bg-card p-6">
          <p className="text-foreground">{t("canonicalAnalysis.result.unsupported")}</p>
          <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.unsupportedHint")}</p>
          <Button variant="outline" asChild>
            <Link to="/canonical/analyses">{t("canonicalAnalysis.result.backToHistory")}</Link>
          </Button>
        </div>
      );
    }

    const v = adaptado.view;
    const dataAnalise = v.summary.analyzedAt ? new Date(v.summary.analyzedAt) : null;
    return (
      <div className="space-y-8">
        <section aria-labelledby="res-resumo" className="space-y-3">
          <h2 id="res-resumo" className="text-lg font-semibold text-foreground">
            {t("canonicalAnalysis.result.summaryTitle")}
          </h2>
          {/* Duas colunas, nao tres: `useful_outcomes` saiu do resumo porque no contrato canonico
              ele e um INDICADOR (`useful_outcome_count`), com estado e denominador proprios.
              Duplica-lo aqui criaria dois lugares para o mesmo numero — e eles divergiriam
              justamente quando um estivesse ausente e o outro nao. */}
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <dt className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.totalRecords")}</dt>
              <dd className="mt-1 text-xl font-semibold text-foreground">{v.summary.recordCount}</dd>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <dt className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.analyzedAt")}</dt>
              <dd className="mt-1 text-xl font-semibold text-foreground">
                {/* data VEM DO BACKEND; se não veio, é ausência — jamais `new Date()` local */}
                {dataAnalise && !Number.isNaN(dataAnalise.getTime())
                  ? dataAnalise.toLocaleString(language)
                  : t("canonicalAnalysis.result.notMeasured")}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="res-indicadores" className="space-y-3">
          <h2 id="res-indicadores" className="text-lg font-semibold text-foreground">
            {t("canonicalAnalysis.result.indicatorsTitle")}
          </h2>
          {v.indicators.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.noIndicators")}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {v.indicators.map((item) => (
                <CartaoIndicador key={item.id} item={item} />
              ))}
            </ul>
          )}
          {/* Parcialidade DECLARADA pela origem, com os motivos dela. A E5 inferia isto contando
              indicadores que sobreviveram a filtragem do frontend — o que media a cobertura do
              PROPRIO frontend, nao a da analise. */}
          {v.partial && (
            <p role="status" className="text-sm text-muted-foreground">
              {t("canonicalAnalysis.result.partialNotice")}
              {v.partialityReasons.length > 0 && ` (${v.partialityReasons.join(", ")})`}
            </p>
          )}
          {/* Indicador que o backend mandou e a UI nao sabe nomear: visivel, nunca silencioso.
              Sumir com ele daria a impressao de que a analise nao o produziu. */}
          {v.unsupportedIndicatorIds.length > 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              {t("canonicalAnalysis.result.unsupportedIndicators")}:{" "}
              {v.unsupportedIndicatorIds.join(", ")}
            </p>
          )}
        </section>

        {/* Seção só existe se a origem trouxe recomendações — ordem preservada, sem priorizar. */}
        {v.recommendations.length > 0 && (
          <section aria-labelledby="res-recs" className="space-y-3">
            <h2 id="res-recs" className="text-lg font-semibold text-foreground">
              {t("canonicalAnalysis.result.recommendationsTitle")}
            </h2>
            <ol className="space-y-3">
              {v.recommendations.map((rec) => (
                <li key={rec.id} className="rounded-lg border border-border bg-card p-4">
                  <p className="font-medium text-foreground">{rec.title}</p>
                  {/* Prioridade vem da ORIGEM. A UI preserva a ordem recebida e nao reordena. */}
                  <p className="mt-1 text-sm text-muted-foreground">{rec.priority}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Procedencia legivel: QUAL contrato e QUAL registro de indicadores produziram isto.
            E o registro, nao o schema, que explica um indicador que apareceu ou sumiu. */}
        <p className="text-xs text-muted-foreground">
          {v.schemaVersion}
          {v.indicatorRegistryVersion && ` \u00b7 ${v.indicatorRegistryVersion}`}
        </p>
      </div>
    );
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
              <Link to="/canonical/analyses">{t("canonicalAnalysis.result.backToHistory")}</Link>
            </Button>
          </div>
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}
