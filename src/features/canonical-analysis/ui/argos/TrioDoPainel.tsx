// O TRIO do painel V4 — três colunas que respondem três perguntas diferentes.
//
//   Desempenho por intenção   onde está pior, e o que dá para fazer
//   Evidências principais     o que o motor observou e contou
//   Alertas do motor          o que ele escalou por conta própria
//
// ## Por que LADO A LADO e não empilhados
//
// As três se leem juntas. Um alerta de `cross_intent_reuse` que nomeia quatro intenções só quer
// dizer alguma coisa ao lado da tabela que mostra o escore dessas quatro; a evidência que conta
// «34 trechos» é a massa que sustenta o alerta. Empilhadas, cada uma vira uma seção autônoma e
// a pessoa rola entre elas comparando de memória.
//
// ## Ausência, nas três
//
// Na análise que atravessou homologação em 2026-08-23 o documento chega com `evidence: null` e
// `alerts` com um item. Duas das três colunas nascem vazias, e vazia NÃO é a mesma coisa nas
// duas: `evidence` nulo é o produtor não ter publicado a família; uma lista vazia seria ele ter
// rodado e não achado. Cada coluna diz a sua.

import { Info } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import type {
  PublicAlert,
  PublicEvidenceSummary,
  PublicIndicatorV3,
  PublicIntent,
} from "@/lib/v1/contract/public-v3.types";
import { zonaDoValor } from "@/design/primitives";
import { acaoDaIntencao, deltaAteOCorte, valorEscrito } from "../../result/medicaoV3";
import { formatarNumero } from "../../result/formatacao";

export interface TrioDoPainelProps {
  readonly intents: readonly PublicIntent[] | null;
  readonly evidence: readonly PublicEvidenceSummary[] | null;
  readonly alerts: readonly PublicAlert[] | null;
  /** `method.min_samples_per_intent` — o piso que separa «exige ação» de «sem base». */
  readonly pisoDeAmostra: number | null;
  /** Os dois indicadores que compõem o rodapé da tabela. */
  readonly detectadas: PublicIndicatorV3 | null;
  readonly cobertas: PublicIndicatorV3 | null;
  readonly locale: string;
}

export function TrioDoPainel({
  intents,
  evidence,
  alerts,
  pisoDeAmostra,
  detectadas,
  cobertas,
  locale,
}: TrioDoPainelProps) {
  return (
    <section className="trio">
      <Intencoes
        intents={intents}
        pisoDeAmostra={pisoDeAmostra}
        detectadas={detectadas}
        cobertas={cobertas}
        locale={locale}
      />
      <Evidencias evidence={evidence} locale={locale} />
      <Alertas alerts={alerts} />
    </section>
  );
}

// ── 1 · DESEMPENHO POR INTENÇÃO ────────────────────────────────────────────────────────────

function Intencoes({
  intents,
  pisoDeAmostra,
  detectadas,
  cobertas,
  locale,
}: {
  readonly intents: readonly PublicIntent[] | null;
  readonly pisoDeAmostra: number | null;
  readonly detectadas: PublicIndicatorV3 | null;
  readonly cobertas: PublicIndicatorV3 | null;
  readonly locale: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="painel">
      <header>
        <h2>{t("canonicalAnalysis.argos.intentPerformance")}</h2>
      </header>
      <div className="corpo">
        {!intents || intents.length === 0 ? (
          <p className="vazio-fam">
            {intents === null
              ? t("canonicalAnalysis.argos.familyAbsent")
              : t("canonicalAnalysis.argos.familyEmpty")}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">{t("canonicalAnalysis.argos.intentColumn")}</th>
                <th scope="col" className="num">
                  {t("canonicalAnalysis.argos.scoreColumn")}
                </th>
                {/* O corte entra no PRÓPRIO cabeçalho, e é o que impede a leitura errada: sem
                    ele, «Δ» ao lado de um escore se lê como variação desde a análise anterior.
                    Com o número ali, a coluna se explica — é a distância até o corte do método,
                    e vale já na primeira análise, quando não existe anterior nenhuma.

                    O corte vem do PRIMEIRO intent que publica limiar, e não de uma constante:
                    o produtor pode publicar cortes diferentes por intenção, e nesse dia esta
                    coluna precisa deixar de existir em vez de mentir um corte único. */}
                {corteComum(intents) === null ? null : (
                  <th scope="col" className="num">
                    {t("canonicalAnalysis.argos.deltaColumn", {
                      corte: formatarNumero(corteComum(intents) as number, locale, 0),
                    })}
                  </th>
                )}
                <th scope="col" className="num">
                  {t("canonicalAnalysis.argos.actionColumn")}
                </th>
              </tr>
            </thead>
            <tbody>
              {intents.map((i) => (
                <LinhaDaIntencao
                  key={i.intent_id}
                  intent={i}
                  temColunaDelta={corteComum(intents) !== null}
                  pisoDeAmostra={pisoDeAmostra}
                  locale={locale}
                />
              ))}
            </tbody>
          </table>
        )}

        <div className="rodape">
          <RodapeDasIntencoes
            intents={intents}
            detectadas={detectadas}
            cobertas={cobertas}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * O corte de atenção, quando ele é o MESMO em todas as intenções publicadas.
 *
 * `null` quando divergem ou quando ninguém publica limiar — e aí a coluna do delta não existe.
 * Escrever um corte no cabeçalho enquanto as linhas medem contra cortes diferentes seria a
 * tela afirmando uma régua única que o documento não tem.
 */
function corteComum(intents: readonly PublicIntent[]): number | null {
  const cortes = intents
    .map((i) => i.score.thresholds?.warn)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (cortes.length === 0) return null;
  const primeiro = cortes[0];
  return cortes.every((c) => c === primeiro) ? primeiro : null;
}

function LinhaDaIntencao({
  intent,
  temColunaDelta,
  pisoDeAmostra,
  locale,
}: {
  readonly intent: PublicIntent;
  readonly temColunaDelta: boolean;
  readonly pisoDeAmostra: number | null;
  readonly locale: string;
}) {
  const { t } = useLanguage();
  const m = intent.score;
  const escrito = valorEscrito(m, locale);
  const delta = deltaAteOCorte(m.value, m.thresholds);
  const acao = acaoDaIntencao(intent.severity, intent.support, pisoDeAmostra);

  // A ZONA do escore, e ela vem dos cortes PUBLICADOS. Sem limiar nao ha zona, e a celula fica
  // com a cor neutra da tabela — nunca com a cor de «bom», que afirmaria um veredito ausente.
  const zona =
    m.value !== null && m.value !== undefined && m.thresholds
      ? zonaDoValor(m.value, m.thresholds.warn, m.thresholds.critical)
      : null;

  return (
    <tr>
      <td>
        <span className="intencao">
          {/* O PONTO nao e cor de serie. Na V4 ele tem um tom fixo por linha, que e decoracao;
              aqui ele repete a ACAO — o unico canal a mais que a linha carrega de graca, e um
              canal que sobrevive a varredura rapida de coluna. Sem acao publicada ele nao
              aparece: um ponto neutro ao lado de uma linha sem veredito sugeriria um. */}
          {acao ? <span className={`ponto ${acao}`} /> : null}
          <span>
            <b>{intent.intent_id}</b>
            <small>n={intent.support}</small>
          </span>
        </span>
      </td>
      <td className={`num${zona ? " " + zona : ""}`}>
        {escrito ?? t("canonicalAnalysis.argos.notMeasuredShort")}
      </td>
      {temColunaDelta ? (
        <td className={`num${delta === null ? "" : delta < 0 ? " abaixo" : " acima"}`}>
          {delta === null ? (
            "—"
          ) : (
            <>
              {/* O SINAL é o que se lê primeiro, e por isso ele é explícito no positivo também:
                  `+5,0` e `5,0` não se distinguem numa varredura de coluna. */}
              {delta > 0 ? "+" : ""}
              {formatarNumero(delta, locale, 1)}
            </>
          )}
        </td>
      ) : null}
      <td className="acao">
        {acao === null ? (
          <span className="pill cinza">{t("canonicalAnalysis.argos.notMeasuredShort")}</span>
        ) : (
          <span className={`pill ${PILL[acao]}`}>
            {t(`canonicalAnalysis.argos.action.${acao}`)}
          </span>
        )}
      </td>
    </tr>
  );
}

/**
 * A variante de pilula por acao.
 *
 * `forte` para o que exige acao — e o unico tom cheio da V4, e o unico caso que pede o olho.
 * `cinza` para SEM BASE: ele nao e um estado bom nem ruim; e a ausencia de sustentacao, e
 * pintar isso de qualquer cor semantica afirmaria um veredito que o piso de amostra nega.
 */
const PILL: Record<NonNullable<ReturnType<typeof acaoDaIntencao>>, string> = {
  exige_acao: "forte",
  monitorar: "azul",
  saudavel: "ciano",
  sem_base: "cinza",
};

/**
 * Os TRÊS números do rodapé, e eles são diferentes de propósito.
 *
 *   `intents_detected_count`  quantas o motor achou
 *   `intents[].length`        quantas têm escore publicado
 *   `covered_intents_count`   quantas têm amostra suficiente
 *
 * A V4 escreve os três porque a diferença entre eles é informação: no documento de homologação
 * são 4, 4 e 4 — e num documento onde forem 7, 4 e 3, a distância entre o primeiro e o último
 * é exatamente o que a tabela não mostra.
 */
function RodapeDasIntencoes({
  intents,
  detectadas,
  cobertas,
  locale,
}: {
  readonly intents: readonly PublicIntent[] | null;
  readonly detectadas: PublicIndicatorV3 | null;
  readonly cobertas: PublicIndicatorV3 | null;
  readonly locale: string;
}) {
  const { t } = useLanguage();
  const ausente = t("canonicalAnalysis.argos.notMeasuredShort");
  const escrever = (i: PublicIndicatorV3 | null) =>
    i && typeof i.value === "number" ? formatarNumero(i.value, locale, 0) : ausente;

  return (
    <p className="contagens">
      {t("canonicalAnalysis.argos.intentCounts", {
        detectadas: escrever(detectadas),
        comEscore: intents === null ? ausente : formatarNumero(intents.length, locale, 0),
        cobertas: escrever(cobertas),
      })}
    </p>
  );
}

// ── 2 · EVIDÊNCIAS PRINCIPAIS ──────────────────────────────────────────────────────────────

function Evidencias({
  evidence,
  locale,
}: {
  readonly evidence: readonly PublicEvidenceSummary[] | null;
  readonly locale: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="painel">
      <header>
        <h2>{t("canonicalAnalysis.argos.mainEvidence")}</h2>
      </header>
      <div className="corpo">
        {!evidence || evidence.length === 0 ? (
          <p className="vazio-fam">
            {evidence === null
              ? t("canonicalAnalysis.argos.familyAbsent")
              : t("canonicalAnalysis.argos.familyEmpty")}
          </p>
        ) : (
          evidence.map((e) => (
            <div className="evid" key={e.id}>
              {/* `label` pode ser nulo por contrato, e aí o `kind` é o que resta para nomear a
                  linha. Nunca o `id`: ele é chave, não frase. */}
              <p>{e.label ?? e.kind}</p>
              <span>
                {t("canonicalAnalysis.argos.observedCount", {
                  n: formatarNumero(e.observed_count, locale, 0),
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── 3 · ALERTAS DO MOTOR ───────────────────────────────────────────────────────────────────

function Alertas({ alerts }: { readonly alerts: readonly PublicAlert[] | null }) {
  const { t } = useLanguage();

  return (
    <div className="painel">
      <header>
        <h2>{t("canonicalAnalysis.argos.engineAlerts")}</h2>
        {/* A contagem do selo é o TAMANHO DESTA LISTA, e não `critical_alert_count`. Os dois
            medem coisas diferentes — nem todo alerta é crítico —, e pôr a métrica ao lado do
            título deste painel faria o número contradizer o que está desenhado embaixo dele.
            A métrica tem casa própria, no herói. */}
        {alerts && alerts.length > 0 ? <span className="selo-n">{alerts.length}</span> : null}
      </header>
      <div className="corpo">
        {!alerts || alerts.length === 0 ? (
          <p className="vazio-fam">
            {alerts === null
              ? t("canonicalAnalysis.argos.familyAbsent")
              : t("canonicalAnalysis.argos.familyEmpty")}
          </p>
        ) : (
          alerts.map((a) => (
            /* `div` e não `button`: a V4 desenha cada alerta como um gatilho com seta, e o
               destino dele não existe neste produto — não há rota de alerta. Um botão que não
               leva a lugar nenhum é pior que um bloco de leitura: ele promete e falha ao clique.
               A seta sai junto, pela mesma razão. */
            <div className="alerta" key={a.id}>
              <span className="ic">
                <Info size={17} strokeWidth={1.9} aria-hidden />
              </span>
              <span>
                <b>{a.title}</b>
                {/* O `detail` do alerta NÃO é apresentado, e a decisão é anterior a esta fatia.

                    O cadeado da jornada canônica proíbe `.detail` na UI. Ele existe contra o
                    detalhe cru de `problem+json` e não sabe distinguir daquele campo homônimo
                    que o v3 publica como conteúdo — e afrouxar o matcher para deixar este
                    passar abriria exatamente a porta que ele fecha. A lacuna já está declarada
                    no DOC-CLOSE, e a `ArgosView` a respeita desde antes.

                    A V4 desenha uma segunda linha sob o título. Quem a ocupa é
                    `affected_intents`: campo PUBLICADO, ESTRUTURADO (uma lista de ids, não
                    prosa) e mais útil que a frase — ele diz sobre quais intenções o alerta
                    fala, que é a pergunta seguinte de quem o lê ao lado da tabela. */}
                {a.affected_intents && a.affected_intents.length > 0 ? (
                  <span>{a.affected_intents.join(", ")}</span>
                ) : null}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TrioDoPainel;
