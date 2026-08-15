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
import {
  useAnalysisAnalytics,
  useAnalysisProgress,
  useAnalysisStatus,
  useRetryAnalysis,
  useSubmitAnalysis,
} from "../data/analysis";
import { useIdempotencyIntent } from "../data/intent";
import { useCanonicalScope } from "./scope";
import { UploadStep } from "./UploadStep";
import { PainelDeEixos } from "./PainelDeEixos";
import { VISOES_DA_ANALISE } from "./visoes";
import { RegiaoDeAnalyticsAoVivo } from "./analytics/RegiaoDeAnalyticsAoVivo";
import { analyticsUtilizavel, lerEixos } from "../result/eixos";
import { ProblemFeedback, StateBanner } from "./notices";

export function AnalysisPage() {
  const { t } = useLanguage();
  const params = useParams();
  const analysisId = params.analysisId ?? null;
  const scope = useCanonicalScope();
  const queryClient = useQueryClient();
  const status = useAnalysisStatus(scope, analysisId);
  // M34 — AN-03 é a primeira superfície a consumir `/progress`. O progresso é lido SEMPRE que há
  // escopo: os eixos existem independentemente do estado da análise, e condicioná-los ao status
  // faria a tela decidir quando o backend tem algo a dizer.
  const progresso = useAnalysisProgress(scope, analysisId);
  const eixos = lerEixos(progresso.data);
  // D13: `analytics` utilizável (`ready|partial`) aparece MESMO com `final_result` pendente. A
  // consulta só é feita quando o eixo autoriza — não se busca projeção de um componente que o
  // próprio produtor diz não ter entregue.
  const analyticsPronto = analyticsUtilizavel(eixos);
  const analytics = useAnalysisAnalytics(scope, analysisId, analyticsPronto);
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
      // M45.2 — o rótulo de CARREGANDO não pode ser o nome de um ESTADO.
      //
      // Aqui estava `state.preparing.title` — "Preparando" —, que é o nome de um estado real da
      // jornada. Enquanto o status era buscado, a tela afirmava que a análise estava naquele
      // estado; e se ela estivesse mesmo, a pessoa veria a mesma palavra pelos dois motivos. É o
      // colapso carregando × estado, irmão do que esta tranche corrigiu no painel de eixos.
      return <LoadingState message={t("canonicalAnalysis.loading")} size="md" />;
    }
    if (status.isError) {
      // M34 — a espera numa parte do lifecycle NÃO apaga o que outra parte já disse.
      //
      // `capacity_wait` (scenario 29) chega como 503 na leitura de STATUS. Antes, isso derrubava a
      // tela inteira: os quatro eixos sumiam mesmo quando `/progress` havia respondido. Mas não
      // saber em que estado a análise está não desfaz o que o produtor publicou sobre cada
      // componente — e apagar o disponível por causa do indisponível é a definição de esconder
      // dado pronto atrás de um estado global.
      //
      // O aviso de espera vem primeiro, porque é ele que explica por que o resto está incompleto.
      const algumEixoPublicado = eixos.some((e) => e.entrada !== null);
      if (algumEixoPublicado) {
        return (
          <div className="space-y-6">
            <ProblemFeedback error={status.error} onRetry={() => void status.refetch()} retryDisabled={status.isFetching} />
            <PainelDeEixos eixos={eixos} leitura={progresso.error} carregando={progresso.isPending} />
          </div>
        );
      }
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
      case "needs_mapping":
        // Caso PRÓPRIO, não `default`. Caindo no default, esta parada renderizaria o mesmo
        // banner de "na fila / executando" e o polling seguiria rodando: a tela travada com
        // cara de trabalho em curso — exatamente o que a máquina de apresentação existe para
        // evitar, e que ela sozinha não consegue evitar se ninguém a consome.
        //
        // O editor humano de mapping ainda não existe. A saída honesta NÃO é um botão que
        // finge abrir algo: é dizer o que falta (o banner traz o texto) e oferecer a única
        // ação que de fato faz sentido hoje — reconsultar, já que o polling automático parou.
        // M45.2 — a página passa a dizer o que SÓ a Home dizia.
        //
        // Três superfícies falavam deste mesmo estado: a lista mostra o chip "Ação necessária"
        // (rótulo congelado no §15 do Blueprint), esta página mostrava "Confirmação necessária" e
        // um botão "Verificar novamente", e a Home era a ÚNICA que dizia a frase decisiva — *a
        // operação que resolve isto ainda não está exposta no contrato público*.
        //
        // Quem clica no chip aterrissa AQUI. Sem essa frase, a pessoa lê "aja" na lista, encontra
        // um botão que reconsulta e conclui que a confirmação depende dela — e fica insistindo num
        // botão que nunca vai resolver. É o mesmo defeito que a M45.4 corrigiu na comparação, por
        // outro caminho: o produto sabe por que não dá, e não conta na tela onde a pessoa está.
        //
        // A copy não foi reescrita nem duplicada: as duas frases saíram de `home.actions.*` para
        // `canonicalAnalysis.needsMapping.*`, porque descrevem o ESTADO e não a Home, e as duas
        // superfícies passaram a ler da mesma chave.
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            <p className="text-sm text-muted-foreground">
              {t("canonicalAnalysis.needsMapping.blocked")}
            </p>
            <Button variant="outline" onClick={() => void status.refetch()} disabled={status.isFetching}>
              {t("canonicalAnalysis.action.checkAgain")}
            </Button>
          </div>
        );
      case "completed":
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            {view.result_available ? (
              // Two-View Recovery: a jornada passa a oferecer as DUAS visões, e não mais a rota
              // legada. `/analyses/:id/result` continua funcionando para todo link já salvo —
              // o que ela deixa de ser é o destino ANUNCIADO, agora que existe a visão certa
              // para cada leitura.
              //
              // A lista vem de `VISOES_DA_ANALISE`, a mesma que o shell usa: duas listas
              // independentes divergiriam no primeiro ajuste, e a jornada passaria a oferecer
              // uma visão que o shell não conhece (ou o contrário).
              <nav aria-label={t("canonicalAnalysis.shell.viewsNavLabel")}>
                <ul className="flex flex-wrap gap-2">
                  {VISOES_DA_ANALISE.map((visao) => (
                    <li key={visao.caminho}>
                      <Button variant="outline" asChild>
                        <Link to={`/analyses/${encodeURIComponent(analysisId)}/${visao.caminho}`}>
                          {t(`canonicalAnalysis.shell.view.${visao.caminho}`)}
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </nav>
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
          <div className="space-y-6">
            <StateBanner view={view} />
            {/* M35 — falha é GRANULAR enquanto o contrato permitir granularidade.
                Antes, o ramo terminal mostrava só o banner: uma análise que falhou não dizia QUAL
                componente falhou nem qual continuava pronto. Os scenarios 13 e 14 existem
                exatamente para isso — `engine: failed` com `analytics: ready`, e o inverso. Apagar
                os eixos transformaria "um componente falhou" em "tudo falhou", que é uma
                afirmação que o produtor não fez.
                O eixo `failed` também NÃO autoriza retry: quem autoriza é `retry_allowed`, e são
                dimensões diferentes. */}
            <PainelDeEixos eixos={eixos} leitura={progresso.error} carregando={progresso.isPending} />
            {/* O que já estava disponível continua disponível. Uma falha em outro eixo não
                desfaz o que o componente analítico entregou. */}
            {analyticsPronto && analytics.data && <RegiaoDeAnalyticsAoVivo vista={analytics.data} />}
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
                  <Link to="/analyses/new">{t("canonicalAnalysis.action.newAnalysis")}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/analyses">{t("canonicalAnalysis.action.back")}</Link>
                </Button>
              </div>
            )}
            {/* Erro do retry pelo CÓDIGO (mensagem; o botão acima já permite re-tentar quando cabível). */}
            <ProblemFeedback error={retry.error} />
          </div>
        );
      default:
        // queued / running / recovering — o território de AN-03.
        return (
          <div className="space-y-6">
            {/* O status da ANÁLISE fica ao redor dos eixos, não dentro de um deles. `recovering` é
                estado da análise (§B: "`recovering` e `needs_mapping` não são estados de eixo"), e
                empurrá-lo para dentro faria "recuperando" parecer um quinto componente. O
                `StateBanner` já o distingue por palavra e forma, nunca só por cor. */}
            <StateBanner view={view} />
            <PainelDeEixos eixos={eixos} leitura={progresso.error} carregando={progresso.isPending} />
            {/* Disponibilidade progressiva: o que já está pronto NÃO espera o resultado final.
                Reusa o portador canônico da M27 — nenhuma segunda interpretação de
                `ready`/`partial`/`withheld`. E isto não é "resultado parcial": `partial` pertence
                ao componente analítico, e `final_result` não tem meio-termo no contrato. */}
            {analyticsPronto && analytics.data && <RegiaoDeAnalyticsAoVivo vista={analytics.data} />}
          </div>
        );
    }
  }

  return (
    // M33 — a barra superior identifica a superfície SOMENTE em `preparing`.
    //
    // Medido pelo trunk test: com a análise já reservada, a barra dizia "Nova análise" enquanto o
    // título da seção dizia "Adicione sua base" — a mesma tela respondendo de duas formas a "onde
    // estou?". Em `preparing` ela passa a nomear o lugar (uma análise que existe) e a tarefa; a
    // identidade `analysis_id` continua no corpo, onde já estava.
    //
    // A ramificação é a MENOR possível de propósito: esta página também atende `receiving` e os
    // estados de AN-03/AN-04, que são de M34/M35. Nenhum outro estado muda, não há tabela de
    // títulos por estado esperando uso futuro, e há teste varrendo `PUBLIC_STATES` para provar que
    // os demais seguem exatamente como antes.
    // M45.2 — E O PRINCÍPIO PASSOU A VALER PARA OS OUTROS SETE ESTADOS.
    //
    // A M33 escreveu a regra ao corrigir `preparing`: *a barra não diz "Nova análise" numa análise
    // que já existe*. Ela aplicou a regra a um estado só, de propósito, porque os demais eram de
    // M34/M35 — e deixou um guarda dizendo que quem os mexesse teria de passar por aquelas
    // missões. Esta tranche é a delas.
    //
    // O efeito visível estava nas capturas 05 e 07: uma análise que FALHOU, e uma que está
    // rodando, com "Nova análise" na barra. A pergunta "em que página estou?" respondida com o
    // nome de outra página. A rota `/analyses/:id` nunca é uma análise nova — a entrada é
    // `/analyses/new`, e lá `entry.title` continua certo.
    //
    // A ramificação segue sendo a MENOR possível: um ternário sobre `preparing`, e nada além.
    <AppShell
      topBarTitle={
        status.data?.status === "preparing"
          ? t("canonicalAnalysis.upload.topBar")
          : t("canonicalAnalysis.topBar")
      }
    >
      <PageFrame maxWidth="md">
        <div className="space-y-6" data-testid="canonical-analysis-page">
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}
