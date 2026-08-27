// Acompanhamento por analysis_id (Onda 6 E2/E3). Identidade durável: retomável por deep link/refresh.
// Renderiza por ESTADO PÚBLICO — upload (preparing) → submit (receiving) → banner (fila/execução/
// recuperação) → terminal (completed/failed). Sem indicador analítico, sem % inventado.

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AvisoDeIntake } from "./AvisoDeIntake";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { workspaceKeys, type AnalysisStatusView } from "@/lib/v1";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/shared/states/LoadingState";
import {
  useAnalysisAnalytics,
  useAnalysisProgress,
  useAnalysisMapping,
  useConfirmMapping,
  useAnalysisStatus,
  useRetryAnalysis,
  useSubmitAnalysis,
  type UploadProgress,
} from "../data/analysis";
import { useIdempotencyIntent } from "../data/intent";
import { useCanonicalScope } from "./scope";
import { UploadStep } from "./UploadStep";
import { MappingStep } from "./MappingStep";
import { PainelDeEixos } from "./PainelDeEixos";
import { EtapasDaAnalise } from "./EtapasDaAnalise";
import { IdentidadeDaAnalise } from "./IdentidadeDaAnalise";
import type { EstadoPublico } from "@/design/patterns/estados";
import { useRevelacao } from "@/design/motion";
import { RegiaoDeAnalyticsAoVivo } from "./analytics/RegiaoDeAnalyticsAoVivo";
import { analyticsUtilizavel, lerEixos } from "../result/eixos";
import { ProblemFeedback, StateBanner } from "./notices";
import { DisponibilidadeDasVisoes, type DisponibilidadeDaVisao } from "./DisponibilidadeDasVisoes";
import { VISOES_DA_ANALISE } from "./visoes";

export function AnalysisPage() {
  const { t } = useLanguage();
  const params = useParams();
  const analysisId = params.analysisId ?? null;
  const scope = useCanonicalScope();
  const queryClient = useQueryClient();
  const status = useAnalysisStatus(scope, analysisId);
  // Só busca o perfil quando a análise de fato parou esperando a decisão. Perfilar LÊ o
  // arquivo; pedi-lo em toda visita gastaria leitura de dataset por navegação.
  const precisaMapear = status.data?.status === "needs_mapping";
  const mapeamento = useAnalysisMapping(scope, analysisId, precisaMapear);
  const confirmar = useConfirmMapping();
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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  useEffect(() => setUploadProgress(null), [analysisId]);
  // A chave junta status e progresso: os dois chegam por caminhos diferentes, e o painel de eixos
  // que resolver depois precisa entrar com movimento em vez de aparecer pronto no meio de uma
  // tela que já se moveu.
  const raiz = useRevelacao<HTMLDivElement>(
    `${status.dataUpdatedAt}|${progresso.dataUpdatedAt}|${status.isPending}`,
  );

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

  function disponibilidadeDasVisoes(view: AnalysisStatusView) {
    const indisponivelOuPreparando: DisponibilidadeDaVisao =
      view.status === "failed" ? "unavailable" : "preparing";
    const resultadoCompleto = view.status === "completed" && view.result_available;
    return {
      argos: view.result_available ? "available" : indisponivelOuPreparando,
      analytics: analyticsPronto || resultadoCompleto ? "available" : indisponivelOuPreparando,
    } as const;
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
        return (
          <div className="space-y-4">
            <UploadStep
              analysisId={analysisId}
              scope={scope}
              onUploaded={revalidar}
              onProgressChange={setUploadProgress}
            />
            <EtapasDaAnalise view={view} eixos={eixos} uploadProgress={uploadProgress} />
          </div>
        );
      case "receiving":
        // Os bytes ainda estão chegando. NÃO há botão aqui, e a ausência é a correção.
        //
        // O convite de submeter morava neste caso, e submeter daqui não funciona: o Orchestrator
        // só aceita a partir de `artifact_ready`, e o que voltava era `analysis_not_ready`. O
        // botão existia exatamente no estado em que não podia funcionar e sumia no estado em que
        // passava a funcionar — porque `artifact_ready` respondia `preparing`, e `preparing`
        // renderiza a tela de upload.
        //
        // `receiving` faz polling, então esta tela anda sozinha até `ready_to_submit`. Nada se
        // perde ao não oferecer ação aqui; o que se ganha é não oferecer uma que falha.
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            <EtapasDaAnalise view={view} eixos={eixos} uploadProgress={uploadProgress} />
          </div>
        );
      case "ready_to_submit":
        // O estado que faltava, e a tela que ele destrava.
        //
        // Medido em homologação: ZERO das 6 análises do workspace chegou a virar job. Não por
        // falha do motor — por nunca ter existido superfície que oferecesse ligá-lo.
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            <EtapasDaAnalise view={view} eixos={eixos} />
            <Button onClick={dispararSubmit} disabled={submitBloqueado} aria-busy={submit.isPending}>
              {t("canonicalAnalysis.upload.submit")}
            </Button>
            {/* Erro de submit pelo CÓDIGO: capacity_wait/analysis_not_ready = espera neutra;
                temporarily_unavailable/rede = re-submeter; idempotency_conflict = só mensagem. */}
            <ProblemFeedback error={submit.error} onRetry={dispararSubmit} retryDisabled={submitBloqueado} />
          </div>
        );
      case "needs_mapping": {
        // Caso PRÓPRIO, não `default`. Caindo no default, esta parada renderizaria o mesmo
        // banner de "na fila / executando" e o polling seguiria rodando: a tela travada com
        // cara de trabalho em curso.
        //
        // ## O que MUDOU aqui
        //
        // O comentário anterior registrava a saída honesta possível na época: *"o editor humano
        // de mapping ainda não existe [...] a saída honesta NÃO é um botão que finge abrir algo"*.
        // Ele estava certo, e a frase que a tela mostrava — *a operação que resolve isto ainda
        // não está exposta no contrato público* — era verdade.
        //
        // As duas operações foram expostas (`GET`/`POST /v1/analyses/{id}/mapping`), e o editor
        // existe. A frase saiu junto com o motivo dela.
        //
        // ## Três estados, e nenhum colapsa no outro
        //
        // Carregar o perfil LÊ o arquivo e leva tempo; falhar ao lê-lo não é o mesmo que a
        // análise ter falhado; e o editor só faz sentido com o perfil em mãos. Colapsá-los faria
        // uma leitura lenta parecer a análise travada — que é exatamente o defeito que esta
        // superfície existe para não repetir.
        if (mapeamento.isPending) {
          return (
            <div className="space-y-4">
              <StateBanner view={view} />
              <EtapasDaAnalise view={view} eixos={eixos} />
              {/* Rotulo PROPRIO, e nao o titulo do editor: dizer *Diga qual coluna e qual* enquanto
                  ainda se le o arquivo pede uma decisao que nao esta disponivel -- e faz o
                  carregando ser indistinguivel do editor para quem mede a tela. */}
              <LoadingState message={t("canonicalAnalysis.mapping.loading")} size="md" />
            </div>
          );
        }
        if (mapeamento.isError || !mapeamento.data) {
          return (
            <div className="space-y-4">
              <StateBanner view={view} />
              <EtapasDaAnalise view={view} eixos={eixos} />
              <p className="text-sm text-muted-foreground">
                {t("canonicalAnalysis.needsMapping.loadFailed")}
              </p>
              <Button
                variant="outline"
                onClick={() => void mapeamento.refetch()}
                disabled={mapeamento.isFetching}
              >
                {t("canonicalAnalysis.action.checkAgain")}
              </Button>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            <EtapasDaAnalise view={view} eixos={eixos} />
            <MappingStep
              mapa={mapeamento.data}
              aoConfirmar={async (regras, agrupamento, minimoDeValidos) => {
                await confirmar.mutateAsync({
                  analysisId,
                  scope,
                  rules: regras,
                  groupBy: agrupamento,
                  minValidRatio: minimoDeValidos,
                });
                // Revalida o ESTADO, não o mapeamento: a partir daqui a ingestão anda sozinha,
                // e o que a tela precisa saber é para onde a análise foi.
                await status.refetch();
              }}
            />
          </div>
        );
      }
      case "completed":
        return (
          <div className="space-y-4">
            <StateBanner view={view} />
            <EtapasDaAnalise view={view} eixos={eixos} />
            {/* OS EIXOS ENTRAM AQUI TAMBÉM, pela mesma simetria que a M35 usou em `failed`.
                Lá o argumento foi: apagar os eixos transformaria "um componente falhou" em "tudo
                falhou", que é afirmação que o produtor não fez. O reverso vale igual — sem eles,
                `completed` afirma "tudo pronto", e uma análise concluída com `export: failed` ou
                `analytics: withheld` diria o contrário se alguém perguntasse.
                O estado da ANÁLISE e o estado de cada COMPONENTE são vocabulários diferentes, e é
                justamente no estado terminal que a diferença fica cara: é dali que a pessoa sai
                para ler o resultado. */}
            <PainelDeEixos eixos={eixos} leitura={progresso.error} carregando={progresso.isPending} />
            <DisponibilidadeDasVisoes
              analysisId={analysisId}
              estados={disponibilidadeDasVisoes(view)}
              visoes={VISOES_DA_ANALISE}
            />
          </div>
        );
      case "failed":
        return (
          <div className="space-y-6">
            <StateBanner view={view} />
            <EtapasDaAnalise view={view} eixos={eixos} />
            {/* O QUE ACONTECEU COM O ARQUIVO, em numeros.

                Medido em homologacao (2026-08-24) com base real: 100 de 61.423 registros
                recusados derrubaram o dataset inteiro, e esta tela dizia apenas "Couldn't
                complete". O numero existia no Ingestion, atravessava o Gateway, e morria aqui.

                Fica ANTES dos eixos de proposito: quando a analise falhou por causa do dado, a
                pergunta de quem olha e "o que houve com meu arquivo?", e nao "qual componente
                interno falhou?". */}
            <AvisoDeIntake intake={view.intake} />
            {/* M35 — falha é GRANULAR enquanto o contrato permitir granularidade.
                Antes, o ramo terminal mostrava só o banner: uma análise que falhou não dizia QUAL
                componente falhou nem qual continuava pronto. Os scenarios 13 e 14 existem
                exatamente para isso — `engine: failed` com `analytics: ready`, e o inverso. Apagar
                os eixos transformaria "um componente falhou" em "tudo falhou", que é uma
                afirmação que o produtor não fez.
                O eixo `failed` também NÃO autoriza retry: quem autoriza é `retry_allowed`, e são
                dimensões diferentes. */}
            <PainelDeEixos eixos={eixos} leitura={progresso.error} carregando={progresso.isPending} />
            <DisponibilidadeDasVisoes
              analysisId={analysisId}
              estados={disponibilidadeDasVisoes(view)}
              visoes={VISOES_DA_ANALISE}
            />
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
            <EtapasDaAnalise view={view} eixos={eixos} />
            <DisponibilidadeDasVisoes
              analysisId={analysisId}
              estados={disponibilidadeDasVisoes(view)}
              visoes={VISOES_DA_ANALISE}
            />
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
        <div ref={raiz} className="space-y-6" data-testid="canonical-analysis-page">
          {/* A identidade fica FORA do `switch`, e é essa a mudança de composição.
              Os oito ramos decidem o que se pode FAZER com a análise; nenhum deles precisava
              decidir de novo qual análise é. Antes, nenhum decidia — e a tela abria dizendo "Em
              execução" sem nunca dizer de quê. */}
          {analysisId && (
            <IdentidadeDaAnalise
              analysisId={analysisId}
              estado={status.data?.status as EstadoPublico | undefined}
              instanceId={status.data?.instance_id ?? null}
              atualizadaEm={status.data?.updated_at ?? null}
            />
          )}
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}
