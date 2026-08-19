// F4 — a visão Analytics. Fonte ÚNICA: `GET /v1/analyses/{id}/analytics`.
//
// ## A fonte é uma só, e isso é o ponto
//
// O `analysis-result-v2` também carrega um bloco analítico — ele é o documento que FUNDE os dois
// motores, e está congelado como legado compatível. Esta visão não o lê. Duas fontes para o
// mesmo dado divergem no primeiro prazo diferente, e elas já têm prazos diferentes: o documento
// v2 só existe depois da barreira, e `/analytics` responde antes.
//
// ## Não confundir as duas "dimensões"
//
// `dimensions` aqui são as distribuições dimensionais do Analytics. As **dimensões de saúde** do
// ARGOS (`semantic`, `behavioral`, `structural`, `economic`) são outro conceito, de outro motor,
// com outro produtor. O nome coincide; o significado não — e é por isso que o rótulo desta seção
// não é "Dimensões" seco.
//
// ## Disponibilidade progressiva (D13)
//
// Analytics `ready|partial` aparece MESMO com `final_result` pendente. Esta visão não espera o
// ARGOS, e o ARGOS não espera esta. Bloquear uma pela outra transformaria dois relógios em um.
//
// ## O que ela não faz
//
// Não pede o v3. Não calcula, não soma, não recompõe percentual. `suppression_applied` e
// `withheld` são CONCLUSÕES do produtor sobre privacidade — apresentadas, nunca interpretadas.

import { useParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { estatisticaConhecida } from "../../result/estatisticas";
import { LoadingState } from "@/shared/states/LoadingState";
import type { EstadoPublico } from "@/design/patterns/estados";
import { useRevelacao } from "@/design/motion";
import { Bar, Disclosure } from "@/design/primitives";
import {
  largurasDeConcentracao,
  largurasDeDistribuicao,
  largurasDeSerie,
} from "../../result/barrasDaProjecao";
import { MapaDeProcedencia } from "./MapaDeProcedencia";
import { useAnalysisAnalytics, useAnalysisProgress, useAnalysisStatus } from "../../data/analysis";
import { lerSnapshot, type SnapshotAnalitico } from "../../result/analyticsProjection";
import { AnalysisShell } from "../AnalysisShell";
import { ProblemFeedback } from "../notices";
import { useCanonicalScope } from "../scope";
import { AcaoDeExport } from "./AcaoDeExport";
import { AnalyticsRetido } from "./Retido";
import { IndiceDeRegioes, type RegiaoIndexada } from "./IndiceDeRegioes";

function Secao({
  id,
  titulo,
  children,
}: {
  readonly id: string;
  readonly titulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section data-revelar aria-labelledby={id} className="space-y-1">
      <h2 id={id} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Nulos, inválidos e ausentes — contados pelo produtor, nunca somados aqui. */
function Contagens({
  itens,
}: {
  readonly itens: readonly { rotulo: string; valor: number | null }[];
}) {
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
      {itens
        .filter((i) => i.valor !== null)
        .map((i) => (
          <div key={i.rotulo} className="flex gap-1">
            <dt>{i.rotulo}:</dt>
            <dd className="tabular-nums">{i.valor}</dd>
          </div>
        ))}
    </dl>
  );
}

/** "Houve supressão por privacidade" — conclusão do produtor, dita e não explicada. */
function Suprimido() {
  const { t } = useLanguage();
  return (
    <span
      className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
      data-suprimido="true"
    >
      {t("canonicalAnalysis.analyticsView.suppressed")}
    </span>
  );
}

function Numericos({ snapshot }: { readonly snapshot: SnapshotAnalitico }) {
  const { t } = useLanguage();
  return (
    <div>
      {snapshot.numeric.map((m) => (
        <div key={m.measure_id} className="border-b border-border/60 py-3 last:border-b-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm">{m.measure_id}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{m.unit}</span>
              {m.suppression_applied ? <Suprimido /> : null}
            </span>
          </div>
          <Contagens
            itens={[
              { rotulo: t("canonicalAnalysis.analyticsView.valid"), valor: m.valid_count },
              { rotulo: t("canonicalAnalysis.analyticsView.nulls"), valor: m.null_count },
              { rotulo: t("canonicalAnalysis.analyticsView.invalid"), valor: m.invalid_count },
              { rotulo: t("canonicalAnalysis.analyticsView.absent"), valor: m.absent_count },
            ]}
          />
          {/* O MÉTODO na linha, não só dentro do mapa.
              Esta visão existe para responder a origem, e o método é a origem — a contagem diz
              QUANTO, o método diz COMO. Ele estava publicado e só aparecia para quem abrisse o
              gatilho; quem lesse a lista inteira sem abrir nenhum não via de onde nada veio. */}
          {/* A linha inteira vem do dicionário, com interpolação: o `· v` entre o id e a versão é
              copy, e o gate de texto literal reprovou — com razão. Prefixo de versão muda por
              idioma tanto quanto qualquer outra palavra. */}
          <p className="mt-1 font-mono text-[0.7rem] text-muted-foreground">
            {t("canonicalAnalysis.analyticsView.methodLine", {
              id: m.method_id,
              version: String(m.method_version),
            })}
          </p>
          {/* O MAPA fica atrás de um gatilho, e essa é a decisão.
              Esta visão responde "de onde vieram esses números", e a cadeia inteira — denominador,
              massa, método, parâmetros — é a resposta completa. Mas ela é a resposta de quem
              PERGUNTOU: aberta por padrão em toda medida, a tela vira uma parede de grafos e a
              contagem, que é o fato de primeira leitura, some no meio.
              Mesma regra da procedência em RES-01: marginália, não corpo. */}
          <Disclosure
            className="mt-2"
            gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}
          >
            <MapaDeProcedencia bloco={{ tipo: "numerico", dado: m }} denominador={snapshot.record_count} />
          </Disclosure>
        </div>
      ))}
    </div>
  );
}

function Distribuicoes({
  itens,
  denominador,
}: {
  readonly itens: SnapshotAnalitico["distributions"];
  /** `record_count` — a raiz do mapa. Nao e um numero deste bloco. */
  readonly denominador: number;
}) {
  const { t } = useLanguage();
  // A conta acontece AQUI, antes da árvore, e não dentro do `map` que desenha. É a mesma regra
  // que fez a superfície congelada calcular no adaptador em vez de no componente.
  const larguras = itens.map(largurasDeDistribuicao);
  return (
    <div>
      {itens.map((d, iBloco) => (
        <div key={d.measure_id} className="border-b border-border/60 py-3 last:border-b-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm">{d.measure_id}</span>
            {d.suppression_applied || d.high_cardinality_suppressed ? <Suprimido /> : null}
          </div>
          {/* O PISO DE PRIVACIDADE é a origem da supressão, e estava publicado sem aparecer.
              Sem ele, "suprimido" é uma conclusão sem causa: com ele, a pessoa sabe que grupos
              abaixo de N não podem ser publicados, e para de procurar um erro de carga.
              `value_type` diz sobre que TIPO de valor a distribuição foi montada. */}
          <p className="mt-0.5 font-mono text-[0.7rem] text-muted-foreground">
            {t("canonicalAnalysis.analyticsView.valueType")}: {d.value_type}
            {" · "}
            {t("canonicalAnalysis.analyticsView.minGroup")}: {d.min_group_size}
          </p>
          {/* A contagem continua em texto, ao lado da barra. A barra é REDUNDÂNCIA: quem não
              distingue comprimento lê o número, e quem lê rápido vê a forma. Nenhum fato desta
              lista existe só na barra — é a regra que proíbe informação por cor ou forma sozinha. */}
          <ul className="mt-1 space-y-1">
            {d.groups.map((g, i) => (
              <Bar
                key={g.label}
                rotulo={g.label}
                valor={String(g.count)}
                largura={larguras[iBloco][i]}
                rotuloSuprimido={t("canonicalAnalysis.analyticsView.suppressed")}
              />
            ))}
          </ul>
          {/* `other_count: null` NÃO é zero: significa que nem a soma dos suprimidos alcançou o
              piso de privacidade. Escrever `0` afirmaria que não há mais nada. */}
          {d.other_count !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("canonicalAnalysis.analyticsView.other")}: {d.other_count}
            </p>
          ) : null}
          <Disclosure className="mt-2" gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}>
            <MapaDeProcedencia bloco={{ tipo: "distribuicao", dado: d }} denominador={denominador} />
          </Disclosure>
        </div>
      ))}
    </div>
  );
}

function Concentracoes({ snapshot }: { readonly snapshot: SnapshotAnalitico }) {
  const { t, language } = useLanguage();
  const larguras = snapshot.concentrations.map(largurasDeConcentracao);
  // A faixa é um INTERVALO, e o rótulo precisa dizer isso. Formatar é trabalho da tela — o
  // módulo de largura não conhece locale de propósito.
  const faixa = (inferior: number, superior: number) =>
    `${inferior.toLocaleString(language === "pt" ? "pt-BR" : "en-US")}–${superior.toLocaleString(
      language === "pt" ? "pt-BR" : "en-US",
    )}`;
  return (
    <div>
      {snapshot.concentrations.map((c, iBloco) => (
        <div key={c.measure_id} className="border-b border-border/60 py-3 last:border-b-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm">{c.measure_id}</span>
            {c.suppression_applied || c.coarsening_applied ? <Suprimido /> : null}
          </div>
          <ul className="mt-1 space-y-0.5">
            {c.statistics.map((s) => (
              <li key={s.statistic_id} className="flex justify-between gap-3 text-xs">
                {/* Decisão de owner (2026-08-15): o padrão do ARGOS, e não uma tradução geral.
                    `statistic_id` é vocabulário ABERTO no contrato; traduzir tudo obrigaria a
                    adivinhar nomes que o backend ainda pode criar. Quem o registro conhece ganha
                    rótulo; quem não conhece continua aparecendo como o id. */}
                <span>
                  {estatisticaConhecida(s.statistic_id)
                    ? t(`canonicalAnalysis.analyticsView.statistic.${s.statistic_id}`)
                    : s.statistic_id}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {/* Três formas, impostas pela ORIGEM: exata, limitada por faixa, ou não
                      publicada com motivo. Nenhuma é derivada da outra aqui. */}
                  {s.value !== null ? (
                    s.value
                  ) : s.lower_bound !== null && s.upper_bound !== null ? (
                    `${s.lower_bound}–${s.upper_bound}`
                  ) : (
                    // M45.4 — ESTAVA INVERTIDO. O `reason_code` cru era impresso justamente
                    // quando havia motivo a explicar, e a frase humana só aparecia quando não
                    // havia motivo nenhum: a tela mostrava `below_min_group` e guardava
                    // "não publicado" para o caso mudo.
                    //
                    // Agora a palavra vem sempre, e o código fica ao lado como detalhe
                    // correlacionável. Traduzir o código não é opção: `reason_code` é `string`
                    // aberta no contrato, e inventar rótulo para um código novo do backend é o
                    // que `rotuloDe` do ARGOS existe para não fazer. Feio e honesto vence.
                    <>
                      {t("canonicalAnalysis.analyticsView.notPublished")}
                      {s.reason_code ? (
                        <span className="ml-2 font-mono opacity-70">{s.reason_code}</span>
                      ) : null}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {/* AS FAIXAS ESTAVAM PUBLICADAS E INVISÍVEIS.
              Esta visão mostrava só as duas estatísticas de Pareto e mandava as faixas direto
              para o mapa — quem não abrisse o mapa nunca via a FORMA da concentração, que é a
              pergunta que a seção existe para responder: onde os valores se acumulam.
              A superfície congelada já as desenhava; a visão nova nasceu sem. */}
          {c.bands.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {c.bands.map((b, i) => (
                <Bar
                  key={`${b.lower_value}-${b.upper_value}`}
                  rotulo={faixa(b.lower_value, b.upper_value)}
                  valor={String(b.entity_count)}
                  largura={larguras[iBloco][i]}
                  rotuloSuprimido={t("canonicalAnalysis.analyticsView.suppressed")}
                />
              ))}
            </ul>
          ) : null}

          {/* A concentração desdobra em FAIXAS de valor com contagem de entidades, e carrega três
              recusas distintas — grosseirização, supressão e cardinalidade alta. Cada uma vira seu
              próprio nó no mapa: agrupá-las num "suprimido" único apagaria por que o número não
              veio, que é justamente o que alguém abre o mapa para descobrir. */}
          <Disclosure className="mt-2" gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}>
            <MapaDeProcedencia
              bloco={{ tipo: "concentracao", dado: c }}
              denominador={snapshot.record_count}
            />
          </Disclosure>
        </div>
      ))}
    </div>
  );
}

function Series({ snapshot }: { readonly snapshot: SnapshotAnalitico }) {
  const { t } = useLanguage();
  const larguras = snapshot.time_series.map(largurasDeSerie);
  return (
    <div>
      {snapshot.time_series.map((s, iBloco) => (
        <div key={s.dimension_id} className="border-b border-border/60 py-3 last:border-b-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm">{s.dimension_id}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{s.effective_granularity}</span>
              <span>{s.timezone}</span>
              {s.suppression_applied || s.temporal_series_suppressed ? <Suprimido /> : null}
            </span>
          </div>
          {/* A série também publica método e versão, e pela mesma razão eles ficam na linha. */}
          <p className="mt-0.5 font-mono text-[0.7rem] text-muted-foreground">
            {t("canonicalAnalysis.analyticsView.methodLine", {
              id: s.method_id,
              version: String(s.method_version),
            })}
          </p>
          {/* `count: null` só acontece em `suppressed`. Zero é VALOR, não ausência — trocar um
              pelo outro apagaria a diferença entre "não houve" e "não podemos dizer". O `Bar` já
              sabe disso: com `suprimida` ele não desenha barra alguma, porque barra de largura
              zero e barra de valor zero são indistinguíveis e afirmam o oposto. */}
          <ul className="mt-1 space-y-1">
            {s.windows.map((j, i) => (
              <Bar
                key={j.window_start}
                rotulo={j.window_start}
                valor={j.count !== null ? String(j.count) : null}
                largura={larguras[iBloco][i]}
                suprimida={j.count === null}
                rotuloSuprimido={t("canonicalAnalysis.analyticsView.suppressed")}
              />
            ))}
          </ul>
          {/* A série desdobra em JANELAS, e a janela suprimida entra no mapa com a hachura —
              `count: null` acontece apenas em `suppressed`, e zero é valor. */}
          <Disclosure className="mt-2" gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}>
            <MapaDeProcedencia
              bloco={{ tipo: "serie", dado: s }}
              denominador={snapshot.record_count}
            />
          </Disclosure>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsView() {
  const { t } = useLanguage();
  const params = useParams();
  const analysisId = params.analysisId ?? null;
  const scope = useCanonicalScope();
  const status = useAnalysisStatus(scope, analysisId);
  const progresso = useAnalysisProgress(scope, analysisId);
  // D13: a projeção é buscada SEM esperar o resultado final. Condicioná-la ao ARGOS faria a
  // visão que já pode responder ficar em branco esperando a outra.
  const analytics = useAnalysisAnalytics(scope, analysisId);
  // O eixo `export` de `/progress`, e ele apenas — mesma leitura que a rota legada faz. Tentar
  // o download para descobrir o estado usaria a ação como sonda.
  const eixoExport = progresso.data?.axes.find((a) => a.axis === "export")?.state ?? null;
  // A chave junta a projeção e o progresso: as duas chegam por caminhos diferentes, e a seção que
  // resolver depois precisa entrar com movimento em vez de aparecer pronta numa tela que já se
  // moveu. O movimento é deslocamento puro — entrada com opacidade derruba o contraste do texto
  // enquanto roda, e foi isso que a matriz transversal reprovou em vinte jornadas.
  const raiz = useRevelacao<HTMLDivElement>(
    `${analytics.dataUpdatedAt}|${progresso.dataUpdatedAt}|${analytics.isPending}`,
  );

  const titulo = t("canonicalAnalysis.analyticsView.title");

  function corpo() {
    if (!scope) {
      return (
        <p role="alert" className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.entry.workspaceMissing")}
        </p>
      );
    }
    if (analytics.isLoading) {
      return <LoadingState message={t("canonicalAnalysis.analyticsView.loading")} size="md" />;
    }
    if (analytics.isError) {
      return (
        <ProblemFeedback
          error={analytics.error}
          onRetry={() => void analytics.refetch()}
          retryDisabled={analytics.isFetching}
        />
      );
    }
    const vista = analytics.data;
    if (!vista) return null;

    if (vista.component_status === "withheld") {
      // Conclusão, não falha. E a razão INTERNA não é impressa: nomeá-la descreveria a
      // população que a retenção existe para não revelar.
      return <AnalyticsRetido />;
    }

    const snapshot = lerSnapshot(vista.snapshot);

    // ÍNDICE DE REGIÕES — M31, e ele chega aqui com três anos de atraso conceitual.
    //
    // O componente foi escrito para a RES-01, que tinha sete regiões e 2902px no desktop. Esta
    // visão tem as MESMAS sete e o mesmo problema, e nunca o recebeu: a correção pousou na tela
    // que estava sendo medida, e não nas que herdaram o defeito. Sem atalho, descobrir que
    // existe "Procedência e divulgação" exigia rolar até topá-la — a 4ª pergunta do trunk test
    // de Krug ("quais são minhas opções neste nível?") sem resposta.
    //
    // A lista é montada a partir das MESMAS condições que renderizam cada região, e cada rótulo
    // vem da MESMA chave do título da seção. Âncora morta é pior que ausência de índice, e um
    // índice que chama a região por outro nome é a inconsistência que ele deveria resolver.
    const regioes: RegiaoIndexada[] = [
      ...(snapshot !== null
        ? [
            { ancora: "anl-numericos", rotulo: t("canonicalAnalysis.analyticsView.numeric") },
            { ancora: "anl-distribuicoes", rotulo: t("canonicalAnalysis.analyticsView.distributions") },
            { ancora: "anl-dimensoes", rotulo: t("canonicalAnalysis.analyticsView.dimensions") },
            { ancora: "anl-concentracoes", rotulo: t("canonicalAnalysis.analyticsView.concentrations") },
            { ancora: "anl-series", rotulo: t("canonicalAnalysis.analyticsView.series") },
            { ancora: "anl-procedencia", rotulo: t("canonicalAnalysis.analyticsView.disclosure") },
          ]
        : []),
      ...(analysisId
        ? [{ ancora: "anl-export", rotulo: t("canonicalAnalysis.analyticsView.export") }]
        : []),
    ];

    return (
      <div className="space-y-8">
        <IndiceDeRegioes regioes={regioes} />
        {/* O estado do componente é TEXTO, e vem antes de tudo: é ele que explica por que o
            resto pode estar incompleto — ou ausente. */}
        <p role="status" className="text-sm text-muted-foreground">
          {t(`canonicalAnalysis.result.analytics.state.${vista.component_status}`)}
        </p>

        {snapshot === null ? (
          <p className="text-sm text-muted-foreground">
            {t("canonicalAnalysis.result.analytics.noReadable")}
          </p>
        ) : (
          <>
            <Secao id="anl-numericos" titulo={t("canonicalAnalysis.analyticsView.numeric")}>
              <Numericos snapshot={snapshot} />
            </Secao>

            <Secao
              id="anl-distribuicoes"
              titulo={t("canonicalAnalysis.analyticsView.distributions")}
            >
              <Distribuicoes itens={snapshot.distributions} denominador={snapshot.record_count} />
            </Secao>

            {/* Rótulo explícito: estas NÃO são as dimensões de saúde do ARGOS. */}
            <Secao id="anl-dimensoes" titulo={t("canonicalAnalysis.analyticsView.dimensions")}>
              <Distribuicoes itens={snapshot.dimensions} denominador={snapshot.record_count} />
            </Secao>

            <Secao
              id="anl-concentracoes"
              titulo={t("canonicalAnalysis.analyticsView.concentrations")}
            >
              <Concentracoes snapshot={snapshot} />
            </Secao>

            <Secao id="anl-series" titulo={t("canonicalAnalysis.analyticsView.series")}>
              <Series snapshot={snapshot} />
            </Secao>

            <Secao id="anl-procedencia" titulo={t("canonicalAnalysis.analyticsView.disclosure")}>
              <dl className="grid gap-x-6 gap-y-1 py-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="flex gap-1">
                  <dt>{t("canonicalAnalysis.analyticsView.records")}:</dt>
                  <dd className="tabular-nums">{snapshot.record_count}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>{t("canonicalAnalysis.analyticsView.snapshotVersion")}:</dt>
                  <dd>{snapshot.snapshot_contract_version}</dd>
                </div>
                {vista.disclosure_rule_version ? (
                  <div className="flex gap-1">
                    <dt>{t("canonicalAnalysis.analyticsView.disclosureRule")}:</dt>
                    <dd>{vista.disclosure_rule_version}</dd>
                  </div>
                ) : null}
                {/* Blocos que o contrato traz e esta tela não apresenta — CONTADOS, nunca
                    nomeados e nunca escondidos. `flag_crosses`/`numeric_crosses` estão entre
                    eles, por decisão anterior a esta visão. */}
                {snapshot.blocosNaoApresentados > 0 ? (
                  <div className="flex gap-1">
                    <dt>{t("canonicalAnalysis.analyticsView.notPresented")}:</dt>
                    <dd className="tabular-nums">{snapshot.blocosNaoApresentados}</dd>
                  </div>
                ) : null}

                {/* OS TRÊS QUE FALTAVAM, e a razão de eles doerem mais que o de cima.
                    `blocosNaoApresentados` é decisão NOSSA — esta tela escolheu não mostrar certos
                    blocos, e dizia isso. Os três abaixo são outra coisa: são medidas e blocos que
                    o PRODUTOR contou e não entregou, cada um por um motivo diferente.
                    Silenciá-los fazia a tela afirmar completude que ela não tem — quem lê via
                    catorze medidas e não sabia que existiam mais três que não puderam vir. */}
                {snapshot.medidasNaoResumidas > 0 ? (
                  <div className="flex gap-1">
                    <dt>{t("canonicalAnalysis.analyticsView.notSummarized")}:</dt>
                    <dd className="tabular-nums">{snapshot.medidasNaoResumidas}</dd>
                  </div>
                ) : null}
                {snapshot.medidasNaoAutorizadas > 0 ? (
                  <div className="flex gap-1">
                    <dt>{t("canonicalAnalysis.analyticsView.notAuthorized")}:</dt>
                    <dd className="tabular-nums">{snapshot.medidasNaoAutorizadas}</dd>
                  </div>
                ) : null}
                {snapshot.blocosIlegiveis > 0 ? (
                  <div className="flex gap-1">
                    <dt>{t("canonicalAnalysis.analyticsView.unreadable")}:</dt>
                    <dd className="tabular-nums">{snapshot.blocosIlegiveis}</dd>
                  </div>
                ) : null}
              </dl>
            </Secao>
          </>
        )}

        {/* O export é do Analytics, e é aqui que a ação canônica mora. O pacote é do backend:
            serializar a tela não é exportar a análise. */}
        {analysisId ? (
          <Secao id="anl-export" titulo={t("canonicalAnalysis.analyticsView.export")}>
            <AcaoDeExport analysisId={analysisId} estado={eixoExport} />
          </Secao>
        ) : null}
      </div>
    );
  }

  return (
    <AppShell topBarTitle={titulo}>
      <PageFrame maxWidth="lg">
        <div ref={raiz} className="space-y-6" data-testid="analytics-view">
          <AnalysisShell
            analysisId={analysisId ?? ""}
            estado={status.data?.status as EstadoPublico | undefined}
            titulo={titulo}
          />
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}

export default AnalyticsView;
