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
import { useRevelacao } from "@/design/motion";
import { useAnalysesList } from "@/features/canonical-analysis/data/list";
import { useInstancesList } from "@/features/instances/data/instance";
import { useCanonicalScope } from "@/features/canonical-analysis/ui/scope";
import { classificarRegioes, homeVazia } from "./regioes";
import {
  RegiaoDeAcoes,
  RegiaoDeFalhas,
  RegiaoDeInstancias,
  RegiaoDeResultados,
  RegiaoEmAndamento,
} from "./RegioesDaHome";

/** CTA principal de §4.3. Rota canônica — nada de caminho inline nesta superfície. */
function NovaAnalise({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <Button asChild className={className}>
      <Link to="/analyses/new">{t("canonicalAnalysis.action.newAnalysis")}</Link>
    </Button>
  );
}

export function HomePage() {
  const { t } = useLanguage();
  const scope = useCanonicalScope();
  const lista = useAnalysesList(scope);
  /**
   * O que esta tela recebeu do sistema único, e o que ela deliberadamente NÃO recebeu.
   *
   * Recebeu o ritmo: as regiões entram na ordem de leitura, que aqui é a ordem da hierarquia —
   * primeiro quem espera por alguém, depois o que está em curso, depois o que já pode ser lido.
   * O escalonamento diz isso sem precisar numerar as seções.
   *
   * Não recebeu o "número que decide" da linha de COLEÇÃO, e não é omissão: D9 e a decisão de
   * owner de 2026-08-10 dizem com todas as letras que esta tela não é dashboard de KPIs, e que
   * não há contador, score, saúde, percentual, sparkline nem ranking nela — *nem como resumo
   * para preencher espaço*. Um arquétipo que se impõe sobre uma decisão registrada não é sistema
   * de design; é gosto com autoridade emprestada.
   */
  const raiz = useRevelacao<HTMLDivElement>(
    lista.isPending ? "carregando" : `${lista.dataUpdatedAt}|${lista.isError}`,
  );
  // BD02 — a região 3 de D9 pergunta "possui Instância?" (Discovery §9.1), então ela LÊ. É a
  // segunda origem desta tela, e não muda a primeira: a classificação nas outras três regiões
  // continua vindo inteira de `GET /v1/analyses`.
  const instancias = useInstancesList(scope);

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
    if (homeVazia(itens, instancias.data?.items ?? [])) {
      return (
        <EmptyState
          titulo={t("home.empty.title")}
          explicacao={t("home.empty.explain")}
          acao={<NovaAnalise />}
        />
      );
    }

    const r = classificarRegioes(itens);
    // A Home lê a PRIMEIRA página e nada além dela. Enquanto houver cursor, dizer isso é
    // obrigatório: uma fila que mostra parte e se cala afirma completude que não tem, e um item
    // em "Ações necessárias" na página seguinte simplesmente não existiria para quem olha. Não é
    // paginação aqui — navegar o histórico é da superfície de análises; é a Home declarando o
    // próprio recorte.
    const truncada = lista.data?.next_cursor !== null && lista.data?.next_cursor !== undefined;
    // Sem `data-revelar` no contêiner: cada região carrega o seu. Marcar o pai faria o bloco
    // inteiro entrar de uma vez POR CIMA do escalonamento das quatro — perdendo justamente a
    // ordem que o comentário abaixo diz ser a hierarquia.
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.8fr)]">
        {/* A ordem agora acompanha a intenção do usuário: continuar o que está pronto para uma
            decisão, observar o que o sistema já assumiu, ler resultado e só então revisar falhas.
            Falha continua visível, mas sem sequestrar a primeira dobra quando não há retry seguro
            publicado na listagem. */}
        <div className="space-y-6">
          <RegiaoDeAcoes itens={r.continuar} />
          <RegiaoEmAndamento itens={r.emAndamento} />
        </div>
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <RegiaoDeResultados itens={r.resultadosRecentes} semResultado={r.concluidasSemResultado} />
          <RegiaoDeFalhas itens={r.falhas} />
          <RegiaoDeInstancias itens={instancias.data?.items ?? []} />
        </aside>
        {truncada && (
          <p className="text-sm text-muted-foreground xl:col-span-2">
            {t("home.truncated")}{" "}
            <Link to="/analyses" className="inline-block py-1 text-foreground underline-offset-4 hover:underline">
              {t("home.seeAll")}
            </Link>
          </p>
        )}
        {/* Estado que a fronteira deveria ter recusado. Visível, com o valor bruto, porque um
            estado novo engolido em silêncio é a tela mentindo sobre o que existe. */}
        {r.estadoNaoReconhecido.length > 0 && (
          <p role="status" className="text-sm text-muted-foreground xl:col-span-2">
            {t("home.unknownState")}:{" "}
            {r.estadoNaoReconhecido.map((i) => `${i.analysis_id} (${i.status})`).join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <AppShell topBarTitle={t("shell.nav.home")}>
      <PageFrame maxWidth="xl" className="px-4 py-5 sm:px-6 sm:py-8">
        {/* `v4-superficie` da a esta rota a MOLDURA da V4 — nao um layout dela. Ver a nota
            do escopo no `globals.css`: o Molde desenhou apenas a analise. */}
        <div ref={raiz} className="v4-superficie space-y-6" data-testid="home-page">
          <div
            data-revelar
            className="rounded-[var(--ds-radius-panel)] border border-border bg-card/80 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {t("home.eyebrow")}
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                  {t("home.title")}
                </h1>
              {/* A subida de subtítulo diz o que a tela É, não o que o produto promete. */}
                <p className="mt-2 max-w-2xl text-muted-foreground">{t("home.subtitle")}</p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto md:min-w-72">
                <NovaAnalise className="min-h-11 w-full" />
                <Button asChild variant="outline" className="min-h-11 w-full">
                  <Link to="/analyses">{t("home.seeAll")}</Link>
                </Button>
              </div>
            </div>
          </div>
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}
