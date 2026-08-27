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
import { PaletaDeComandos } from "../PaletaDeComandos";
import { ProblemFeedback } from "../notices";
import { useCanonicalScope } from "../scope";
import { AcaoDeExport } from "./AcaoDeExport";
import { AnalyticsRetido } from "./Retido";
import { IndiceDeRegioes, type RegiaoIndexada } from "./IndiceDeRegioes";
import { ResumoDaPublicacao } from "./ResumoDaPublicacao";
import type { AnalysisIntake } from "@/lib/v1";

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
    /* `painel reg` — a regiao é um PAINEL, e não um titulo com conteudo solto embaixo.

       Antes cada regiao era um `<h2>` seguido de itens sem moldura: sete titulos numa coluna, e
       nada dizendo onde uma acaba e a outra comeca. Numa tela de sete regioes com blocos
       repetidos dentro, a moldura E a fronteira — sem ela a pessoa rola sem saber em qual
       familia esta.

       `data-revelar` fica: ele e o gancho da revelacao por rolagem, e nao tem nada a ver com o
       desenho. */
    <section data-revelar aria-labelledby={id} className="painel reg">
      <header>
        <h2 id={id}>{titulo}</h2>
      </header>
      <div className="corpo">{children}</div>
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
    <dl className="contagens">
      {itens
        .filter((i) => i.valor !== null)
        .map((i) => (
          <div key={i.rotulo}>
            <dt>{i.rotulo}</dt>
            <dd>{i.valor}</dd>
          </div>
        ))}
    </dl>
  );
}

/**
 * O denominador, em primeiro lugar — e o digest que ninguém via.
 *
 * ## Por que no topo
 *
 * Tudo nesta tela é contado SOBRE `record_count`. Ele estava no rodapé, depois de sete seções
 * que dependem dele: quem lia "whatsapp 153" na terceira seção não tinha o denominador à vista.
 *
 * O Molde V4 abre por aqui, e a razão é de leitura, não de estética.
 *
 * ## O digest
 *
 * `projection_digest` é publicado e **nunca aparecia**. Ele é o que permite a duas pessoas
 * conferirem que estão falando da mesma projeção — sem ele, "o relatório mudou" é uma discussão
 * sem árbitro.
 *
 * ## A repetição com a procedência é deliberada
 *
 * `Registros` e a versão do snapshot aparecem aqui e na seção de procedência. O hero é para
 * LER; a procedência é para AUDITAR. O molde faz igual.
 */
export function Cabeca({
  snapshot,
  vista,
}: {
  readonly snapshot: SnapshotAnalitico;
  readonly vista: {
    component_status: string;
    snapshot_contract_version: string | null;
    projection_digest: string | null;
    generated_at: string | null;
  };
}) {
  const { t, language } = useLanguage();
  const quando = vista.generated_at
    ? new Date(vista.generated_at).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  return (
    /* O DENOMINADOR, no desenho da V4.

       A ancora desta tela nao e um escore: e o numero sobre o qual todo o resto e contado. O
       contrato o chama exatamente assim — *«o denominador verdadeiro»* — e por isso ele nao e
       um cartao entre cartoes: ele e a faixa que abre a pagina.

       As classes vem da folha portada (`.painel.denom`). O que era `bg-muted/30` com borda
       generica passa a ter o gradiente e o raio de painel da V4. */
    <section className="painel denom">
      <div className="corpo">
      <div className="esq">
        <span className="rot">
          {t("canonicalAnalysis.analyticsView.records")}
        </span>
        <b className="n">{snapshot.record_count}</b>
        <p className="sub">
          <span className="font-mono">{vista.snapshot_contract_version ?? "—"}</span>
          {" · "}
          {vista.component_status}
          {quando ? ` · ${quando}` : ""}
        </p>
      </div>
      {vista.projection_digest ? (
        <div className="dir">
          <span className="rot">
            {t("canonicalAnalysis.analyticsView.projectionDigest")}
          </span>
          {/* Inteiro, e quebrando: um digest truncado não serve para conferir nada, que é a
              única coisa para a qual ele existe. */}
          <p className="digest">
            {vista.projection_digest}
          </p>
        </div>
      ) : null}
      </div>
    </section>
  );
}

/**
 * O que o documento trouxe e esta tela não mostra — quatro perguntas diferentes.
 *
 * ## O que mudou, e por quê
 *
 * Os quatro contadores apareciam como pares soltos, e **só quando maiores que zero**.
 *
 * Duas perdas nisso. Quem lia `2` ao lado de "não apresentados" não tinha como saber o que
 * aquilo significa. E escondendo os zeros, a tela não distinguia *"perguntamos e a resposta foi
 * nenhum"* de *"ninguém perguntou"* — a mesma confusão entre ausência e valor que este produto
 * vem fechando em todo lugar.
 *
 * **Nunca somados.** São quatro perguntas distintas: o que a tela escolheu não mostrar, o que o
 * cálculo não soube resumir, o que a política não autorizou, e o que não correspondia ao
 * contrato. Somá-los produziria um número que não responde a nenhuma delas.
 */
export function Retido({ snapshot }: { readonly snapshot: SnapshotAnalitico }) {
  const { t } = useLanguage();
  const linhas = [
    {
      chave: "notPresented",
      valor: snapshot.blocosNaoApresentados,
    },
    { chave: "notSummarized", valor: snapshot.medidasNaoResumidas },
    { chave: "notAuthorized", valor: snapshot.medidasNaoAutorizadas },
    { chave: "unreadable", valor: snapshot.blocosIlegiveis },
  ];
  return (
    <table className="mt-3 w-full text-xs">
      <caption className="mb-2 text-left text-xs text-muted-foreground">
        {t("canonicalAnalysis.analyticsView.retainedCaption")}
      </caption>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.chave} className="border-b border-border/40 last:border-b-0">
            <th scope="row" className="py-1.5 text-left font-normal">
              {t(`canonicalAnalysis.analyticsView.${l.chave}`)}
            </th>
            <td
              className={`py-1.5 pl-4 text-right tabular-nums ${
                l.valor > 0 ? "font-semibold" : "text-muted-foreground"
              }`}
            >
              {l.valor}
            </td>
            <td className="py-1.5 pl-6 text-muted-foreground">
              {t(`canonicalAnalysis.analyticsView.${l.chave}Meaning`)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function motivosDoIntake(intake: AnalysisIntake | null | undefined) {
  return (intake?.rejected_record_reasons ?? []).filter((m) => m.count > 0);
}

function mostrarQualidadeDaBase(intake: AnalysisIntake | null | undefined) {
  const rejeitados = intake?.rejected_record_count;
  return Boolean(
    intake &&
      ((typeof rejeitados === "number" && rejeitados > 0) || motivosDoIntake(intake).length > 0),
  );
}

function formatarContagemIntake(valor: number | null | undefined, numero: Intl.NumberFormat) {
  return typeof valor === "number" ? numero.format(valor) : "—";
}

function chaveDoMotivo(codigo: string) {
  switch (codigo) {
    case "invalid_encoding":
      return "invalidEncoding";
    case "record_not_object":
      return "recordNotObject";
    case "missing_assistant_text":
      return "missingAssistantText";
    case "assistant_text_empty":
      return "assistantTextEmpty";
    case "assistant_text_too_large":
      return "assistantTextTooLarge";
    case "missing_required_field":
      return "missingRequiredField";
    case "invalid_field_type":
      return "invalidFieldType";
    case "field_too_large":
      return "fieldTooLarge";
    case "too_many_keys":
      return "tooManyKeys";
    case "record_too_large":
      return "recordTooLarge";
    case "duplicate_conversation_id":
      return "duplicateConversationId";
    case "mapping_incomplete":
      return "mappingIncomplete";
    case "mapping_ambiguous":
      return "mappingAmbiguous";
    case "sanitized_to_empty":
      return "sanitizedToEmpty";
    case "canonical_contract_validation_failed":
      return "canonicalContractValidationFailed";
    case "internal_error":
      return "internalError";
    default:
      return "other";
  }
}

export function QualidadeDaBase({ intake }: { readonly intake: AnalysisIntake | null | undefined }) {
  const { t, language } = useLanguage();
  if (!mostrarQualidadeDaBase(intake)) return null;

  const numero = new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US");
  const motivos = motivosDoIntake(intake);
  const rejeitados = intake?.rejected_record_count;
  const linhas =
    motivos.length > 0
      ? motivos
      : typeof rejeitados === "number"
        ? [{ code: "record_not_usable", count: rejeitados }]
        : [];

  return (
    <Secao id="anl-intake" titulo={t("canonicalAnalysis.analyticsView.intakeQuality")}>
      <p className="text-sm text-muted-foreground">
        {t("canonicalAnalysis.analyticsView.intakeQualitySummary", {
          canonical: formatarContagemIntake(intake?.canonical_record_count, numero),
          rejected: formatarContagemIntake(intake?.rejected_record_count, numero),
          source: formatarContagemIntake(intake?.source_record_count, numero),
        })}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("canonicalAnalysis.analyticsView.intakeQualityEngineBoundary")}
      </p>
      <table className="mt-4 w-full text-xs" data-testid="intake-quality-measures">
        <tbody>
          {linhas.map((motivo) => (
            <tr key={motivo.code} className="border-b border-border/40 last:border-b-0">
              <th scope="row" className="py-1.5 text-left font-normal">
                {t(`canonicalAnalysis.analyticsView.intakeQualityReasons.${chaveDoMotivo(motivo.code)}.label`)}
              </th>
              <td className="py-1.5 pl-4 text-right font-semibold tabular-nums">
                {numero.format(motivo.count)}
              </td>
              <td className="py-1.5 pl-6 text-muted-foreground">
                {t(`canonicalAnalysis.analyticsView.intakeQualityReasons.${chaveDoMotivo(motivo.code)}.meaning`)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Secao>
  );
}

/**
 * As quatro estatísticas da medida — o número em si.
 *
 * ## O que faltava
 *
 * O contrato publica `minimum`, `maximum`, `total` e `mean`, e esta tela lia o objeto inteiro
 * sem renderizar nenhum. Ela mostrava a CONTABILIDADE da medida (quantos válidos, quantos
 * nulos, qual método) e escondia a medida.
 *
 * A tela legada RES-01 já os renderiza há ondas. Dois renderizadores do mesmo dado, e o mais
 * novo mostrava menos — o desenho vem do Molde V4, que lê este mesmo contrato.
 *
 * ## Cada uma sozinha, e `null` dito por extenso
 *
 * A ausência de uma não contamina a leitura das outras. `null` vira "não publicado" e nunca
 * `0`: zero é um fato sobre a massa, ausência é a falta dele. Confundir os dois foi o defeito
 * que este produto vem fechando em todo lugar.
 *
 * **Nada é calculado aqui.** A média vem publicada; ninguém a divide nesta tela.
 */
function Estatisticas({
  medida,
}: {
  readonly medida: {
    minimum: number | null;
    maximum: number | null;
    total: number | null;
    mean: number | null;
  };
}) {
  const { t } = useLanguage();
  const itens = [
    { rotulo: t("canonicalAnalysis.analyticsView.minimum"), valor: medida.minimum },
    { rotulo: t("canonicalAnalysis.analyticsView.maximum"), valor: medida.maximum },
    { rotulo: t("canonicalAnalysis.analyticsView.totalStat"), valor: medida.total },
    { rotulo: t("canonicalAnalysis.analyticsView.mean"), valor: medida.mean },
  ];
  return (
    <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      {itens.map((i) => (
        <div key={i.rotulo} className="flex flex-col gap-0.5">
          <dt className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            {i.rotulo}
          </dt>
          <dd className="text-lg tabular-nums">
            {i.valor === null ? (
              <span className="text-sm italic text-muted-foreground">
                {t("canonicalAnalysis.analyticsView.notPublished")}
              </span>
            ) : (
              i.valor
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "Houve supressão por privacidade" — conclusão do produtor, dita e não explicada. */
function Suprimido() {
  const { t } = useLanguage();
  return (
    <span className="selo-supr" data-suprimido="true">
      {t("canonicalAnalysis.analyticsView.suppressed")}
    </span>
  );
}

export function Numericos({ snapshot }: { readonly snapshot: SnapshotAnalitico }) {
  const { t } = useLanguage();
  return (
    <div>
      {snapshot.numeric.map((m) => (
        <article key={m.measure_id} className="bloco-med">
          <div className="cabeca">
            <h3>{m.measure_id}</h3>
            <span className="un">
              {/* `semantic_role` diz o que a medida É — soma, contagem, média. Sem ele, quem lê
                  "total 8,96" não sabe se somar com outro total faz sentido. Está publicado e
                  não era renderizado. */}
              <span>
                {m.unit}
                {m.semantic_role ? ` · ${m.semantic_role}` : ""}
              </span>
            </span>
            {m.suppression_applied ? <Suprimido /> : null}
          </div>
          <Estatisticas medida={m} />
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
          <p className="metodo-linha">
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
            className="desdobra"
            gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}
          >
            <MapaDeProcedencia bloco={{ tipo: "numerico", dado: m }} denominador={snapshot.record_count} />
          </Disclosure>
        </article>
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
        <article key={d.measure_id} className="bloco-med">
          <div className="cabeca">
            <h3>{d.measure_id}</h3>
            {d.suppression_applied || d.high_cardinality_suppressed ? <Suprimido /> : null}
          </div>
          {/* O PISO DE PRIVACIDADE é a origem da supressão, e estava publicado sem aparecer.
              Sem ele, "suprimido" é uma conclusão sem causa: com ele, a pessoa sabe que grupos
              abaixo de N não podem ser publicados, e para de procurar um erro de carga.
              `value_type` diz sobre que TIPO de valor a distribuição foi montada. */}
          <p className="regra-priv">
            {t("canonicalAnalysis.analyticsView.valueType")}: {d.value_type}
            {" · "}
            {t("canonicalAnalysis.analyticsView.minGroup")}: {d.min_group_size}
          </p>
          {/* A contagem continua em texto, ao lado da barra. A barra é REDUNDÂNCIA: quem não
              distingue comprimento lê o número, e quem lê rápido vê a forma. Nenhum fato desta
              lista existe só na barra — é a regra que proíbe informação por cor ou forma sozinha. */}
          <ul className="grupos">
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
          <Disclosure className="desdobra" gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}>
            <MapaDeProcedencia bloco={{ tipo: "distribuicao", dado: d }} denominador={denominador} />
          </Disclosure>
        </article>
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
        <div key={c.measure_id} className="bloco-med">
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
          <Disclosure className="desdobra" gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}>
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
        <div key={s.dimension_id} className="bloco-med">
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
          <ul className="grupos">
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
          <Disclosure className="desdobra" gatilho={t("canonicalAnalysis.analyticsView.mapTitle")}>
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
  //
  // O `?.` em `axes` NÃO é decoração. Medido em 2026-08-20, na primeira corrida contra o
  // backend real: uma resposta sem `axes` derrubava a tela INTEIRA com
  // `TypeError: Cannot read properties of undefined (reading 'find')`. A causa daquele dia era
  // divergência de contrato — já corrigida na origem —, mas a lição sobrevive à causa: uma
  // seção opcional desta página não pode ter o poder de apagar as outras oito. Sem o eixo, o
  // export fica `null`, que é o mesmo estado de "ainda não sei" que a tela já sabe mostrar.
  const eixoExport =
    progresso.data?.axes?.find((a) => a.axis === "export")?.state ?? null;
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
    const intake = status.data?.intake ?? null;
    const temSnapshot = snapshot !== null;
    const temNumericos = temSnapshot && snapshot.numeric.length > 0;
    const temDistribuicoes = temSnapshot && snapshot.distributions.length > 0;
    const temDimensoes = temSnapshot && snapshot.dimensions.length > 0;
    const temConcentracoes = temSnapshot && snapshot.concentrations.length > 0;
    const temSeries = temSnapshot && snapshot.time_series.length > 0;

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
            ...(mostrarQualidadeDaBase(intake)
              ? [
                  {
                    ancora: "anl-intake",
                    rotulo: t("canonicalAnalysis.analyticsView.intakeQuality"),
                  },
                ]
              : []),
            { ancora: "anl-resumo", rotulo: t("canonicalAnalysis.analyticsView.summaryTitle") },
            ...(temNumericos
              ? [{ ancora: "anl-numericos", rotulo: t("canonicalAnalysis.analyticsView.numeric") }]
              : []),
            ...(temDistribuicoes
              ? [
                  {
                    ancora: "anl-distribuicoes",
                    rotulo: t("canonicalAnalysis.analyticsView.distributions"),
                  },
                ]
              : []),
            ...(temDimensoes
              ? [{ ancora: "anl-dimensoes", rotulo: t("canonicalAnalysis.analyticsView.dimensions") }]
              : []),
            ...(temConcentracoes
              ? [
                  {
                    ancora: "anl-concentracoes",
                    rotulo: t("canonicalAnalysis.analyticsView.concentrations"),
                  },
                ]
              : []),
            ...(temSeries
              ? [{ ancora: "anl-series", rotulo: t("canonicalAnalysis.analyticsView.series") }]
              : []),
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
            {/* Vem antes das seções pela mesma razão da parcialidade no Diagnóstico: é ela que
                explica por que o resto pode estar vazio. Depois das seções, a pessoa já teria
                rolado seis títulos em branco antes de encontrar a explicação. */}
            {/* O denominador antes de tudo que é contado sobre ele. */}
            <QualidadeDaBase intake={intake} />
            <Cabeca snapshot={snapshot} vista={vista} />
            <ResumoDaPublicacao snapshot={snapshot} intake={intake} />
            {temNumericos ? (
              <Secao id="anl-numericos" titulo={t("canonicalAnalysis.analyticsView.numeric")}>
                <Numericos snapshot={snapshot} />
              </Secao>
            ) : null}

            {temDistribuicoes ? (
              <Secao
                id="anl-distribuicoes"
                titulo={t("canonicalAnalysis.analyticsView.distributions")}
              >
                <Distribuicoes itens={snapshot.distributions} denominador={snapshot.record_count} />
              </Secao>
            ) : null}

            {/* Rótulo explícito: estas NÃO são as dimensões de saúde do ARGOS. */}
            {temDimensoes ? (
              <Secao id="anl-dimensoes" titulo={t("canonicalAnalysis.analyticsView.dimensions")}>
                <Distribuicoes itens={snapshot.dimensions} denominador={snapshot.record_count} />
              </Secao>
            ) : null}

            {temConcentracoes ? (
              <Secao
                id="anl-concentracoes"
                titulo={t("canonicalAnalysis.analyticsView.concentrations")}
              >
                <Concentracoes snapshot={snapshot} />
              </Secao>
            ) : null}

            {temSeries ? (
              <Secao id="anl-series" titulo={t("canonicalAnalysis.analyticsView.series")}>
                <Series snapshot={snapshot} />
              </Secao>
            ) : null}

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
              </dl>
              {/* Os quatro contadores do produtor, com o que cada um SIGNIFICA.
                  Antes eram pares soltos e só apareciam quando maiores que zero. Quem lia `2`
                  ao lado de "não apresentados" não tinha como saber o que aquilo era — e o zero
                  escondido não distinguia "perguntamos e a resposta foi nenhum" de "ninguém
                  perguntou".
                  `blocosNaoApresentados` é decisão NOSSA; os outros três são medidas que o
                  PRODUTOR contou e não entregou, cada um por um motivo diferente. Silenciá-los
                  fazia a tela afirmar completude que ela não tem. */}
              <Retido snapshot={snapshot} />
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
      {/* LARGURA INTEIRA, pela mesma razao do Diagnostico: esta tela e uma GRADE — distribuicoes,
          series, concentracao, procedencia —, e nao prosa. Medida de linha importa onde se le
          texto corrido; aqui se varre. */}
      <PageFrame maxWidth="full">
        {/* `v4-medidas` e o escopo da folha portada do Molde (ver `globals.css`). Ele e IRMAO
            do `v4-painel`, nao filho: as duas visoes tem regioes com o mesmo nome (`.painel`,
            `.corpo`, `.rot`) e desenhos diferentes. */}
        <div ref={raiz} className="v4-medidas space-y-6" data-testid="analytics-view">
          <AnalysisShell
            analysisId={analysisId ?? ""}
            estado={status.data?.status as EstadoPublico | undefined}
            titulo={titulo}
          />
          {/* NAV-01 — acelerador, nunca o único caminho. Ela indexa as regiões que ESTIVEREM
              dentro de `raiz`, então vem depois do shell e antes do corpo: assim o gatilho fica
              na altura do título, e a varredura alcança tudo que o corpo renderizou. */}
          <PaletaDeComandos raiz={raiz} />
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}

export default AnalyticsView;
