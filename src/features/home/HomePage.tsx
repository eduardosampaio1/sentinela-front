// M32 — HOME-01, a Home operacional do Workspace.
//
// ## O que esta missão SUBSTITUIU
//
// Aqui vivia o `LaunchpadPage`: vitrine de *"behavior score, risk classification, economic
// impact"*, `AnalysisLauncher` inline, bloco "Dataset format", botão "View last results" apontando
// para `/dashboard`, `#F1F5F9`/`#0D1525`/`rgba(...)` cravados e todo o texto em inglês no código.
//
// Nada disso pertence a HOME-01. Os três primeiros números **não existem no contrato canônico** —
// `behavior_score` não aparece em nenhum `.py` de `sentinela-facts` —, e o DoD desta missão são os
// 18 critérios nesta superfície: com hex literal (15), copy hardcoded (6) e vocabulário que a
// origem não publica (14), passar era impossível. Não foi preservação por compatibilidade visual:
// foi remoção, decidida por owner em 2026-08-10.
//
// ## A pergunta que a Home responde
//
// D9: quatro regiões, *"não é dashboard de KPIs"*. O DoD: *"o que precisa de mim"*, não *"quantos
// temos"*. Por isso não há contador, score, saúde, percentual, sparkline nem ranking nesta tela —
// nem como resumo para preencher espaço.
//
// ## Uma fonte, quatro leituras
//
// Tudo vem de `GET /v1/analyses`. A classificação nas regiões é um módulo PURO (`regioes.ts`), e a
// tela não decide estado: ela compõe o que a semântica já resolveu. `GET /progress` **não** é
// chamado aqui — o detalhe por eixo é de AN-03, e somar eixos numa barra agregada seria o
// percentual inventado que o Blueprint proíbe.

import { Link } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { EmptyState, ErrorState, LoadingState } from "@/design/patterns";
import { useAnalysesList } from "@/features/canonical-analysis/data/list";
import { useCanonicalScope } from "@/features/canonical-analysis/ui/scope";
import { classificarRegioes, homeVazia } from "./regioes";
import {
  RegiaoDeAcoes,
  RegiaoDeInstancias,
  RegiaoDeResultados,
  RegiaoEmAndamento,
} from "./RegioesDaHome";

/** CTA principal de §4.3. Rota canônica — nada de caminho inline nesta superfície. */
function NovaAnalise() {
  const { t } = useLanguage();
  return (
    <Button asChild>
      <Link to="/analyses/new">{t("canonicalAnalysis.action.newAnalysis")}</Link>
    </Button>
  );
}

export function HomePage() {
  const { t } = useLanguage();
  const scope = useCanonicalScope();
  const lista = useAnalysesList(scope);

  function corpo() {
    // Os três estados são DISTINTOS, e cada um diz coisa diferente: carregando é "ainda não sei",
    // vazio é "sei, e não há nada", erro é "não consegui saber". Colapsar dois deles é a mentira
    // clássica desta tela.
    if (lista.isPending) {
      return <LoadingState rotulo={t("home.loading")} linhas={4} />;
    }
    if (lista.isError) {
      return (
        <ErrorState
          titulo={t("home.error.title")}
          explicacao={t("home.error.explain")}
          acao="tentar"
          botao={
            <Button variant="outline" onClick={() => lista.refetch()}>
              {t("canonicalAnalysis.action.retry")}
            </Button>
          }
        />
      );
    }

    const itens = lista.data?.items ?? [];
    if (homeVazia(itens)) {
      return (
        <EmptyState
          titulo={t("home.empty.title")}
          explicacao={t("home.empty.explain")}
          acao={<NovaAnalise />}
        />
      );
    }

    const r = classificarRegioes(itens);
    return (
      <div className="space-y-8">
        {/* A ordem É a hierarquia: primeiro quem espera por alguém, depois o que está em curso,
            depois o que já pode ser lido. Instâncias fica por último porque não é alcançável. */}
        <RegiaoDeAcoes itens={r.acoesNecessarias} />
        <RegiaoEmAndamento itens={r.emAndamento} />
        <RegiaoDeResultados itens={r.resultadosRecentes} semResultado={r.concluidasSemResultado} />
        <RegiaoDeInstancias />
        {/* Estado que a fronteira deveria ter recusado. Visível, com o valor bruto, porque um
            estado novo engolido em silêncio é a tela mentindo sobre o que existe. */}
        {r.estadoNaoReconhecido.length > 0 && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("home.unknownState")}:{" "}
            {r.estadoNaoReconhecido.map((i) => `${i.analysis_id} (${i.status})`).join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <AppShell topBarTitle={t("shell.nav.home")}>
      <PageFrame maxWidth="lg">
        <div className="space-y-6" data-testid="home-page">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">{t("shell.nav.home")}</h1>
              {/* A subida de subtítulo diz o que a tela É, não o que o produto promete. */}
              <p className="mt-1 text-muted-foreground">{t("home.subtitle")}</p>
            </div>
            <NovaAnalise />
          </div>
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}
