// As seções do lado da ENGINE — resumo, indicadores e recomendações.
//
// Saíram de dentro do `ResultPage` na MF6.4b. A auditoria da fatia propunha deixá-las lá (mover
// seria refactor sem pedido), e a proposta caiu quando o v2 entrou: as duas árvores precisam
// EXATAMENTE das mesmas seções, e mantê-las locais significaria duas cópias — que divergiriam no
// primeiro ajuste, dando duas telas do mesmo indicador.
//
// Elas recebem view model pronto. Não sabem qual contrato o produziu, não buscam nada, não
// calculam nada. O `record_count` chega como TEXTO e com rótulo próprio, porque no v1 ele é a
// janela da Engine sob o nome `record_count` e no v2 é `engine_window_record_count` — o mesmo
// fato com dois nomes, e a decisão de qual ler é da fronteira, não daqui.

import { useLanguage } from "@/contexts/LanguageContext";
import { ProvenanceMargin, type ItemDeProcedencia } from "@/design/patterns/ProvenanceMargin";
import { rotuloDoIndicador } from "../../result/indicadores";
import type { IndicatorView, RecommendationView } from "../../result/indicadores";

/**
 * A procedência de UM indicador — M26.
 *
 * **Só o que é DAQUELE número.** A 1ª versão trazia também o registro de indicadores e a versão
 * do contrato — que são do DOCUMENTO. O resultado foi `analysis-result-v1` repetido uma vez por
 * cartão, e outra por breakpoint; a suíte da MF6.4b reprovou com "Found multiple elements", e
 * estava certa. Procedência de documento tem uma casa só: o rodapé da página.
 *
 * Por indicador o `analysis-result-v1/v2` publica `denominator` e `coverage`, e mais nada. **Não
 * existe `source` nem `calculation_version` por indicador** — inventá-los seria escrever sob o
 * número uma origem que ninguém declarou.
 *
 * `null` desce como `null`: o `ProvenanceMargin` o transforma na palavra do produto, nunca em
 * `0`, nunca num traço decorativo. Com os dois ausentes a margem diz "não informado" — porque
 * não saber a procedência não é uma procedência ruim.
 */
function procedenciaDoIndicador(
  item: IndicatorView,
  t: (chave: string) => string,
): ItemDeProcedencia[] {
  return [
    {
      rotulo: t("canonicalAnalysis.result.provDenominator"),
      // O denominador é o "sobre o quê" do número. Ausente, some — não vira 1, não vira total.
      valor: item.denominator ? String(item.denominator.value) : null,
    },
    {
      rotulo: t("canonicalAnalysis.result.provCoverage"),
      // Já formatado pelo adapter: multiplicar por 100 é formatação, e formatação mora num lugar.
      valor: item.coverageDisplay,
    },
  ];
}

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

export function CartaoIndicador({ item }: { item: IndicatorView }) {
  const { t } = useLanguage();
  const rotulo = rotuloDoIndicador(item, t);
  // M31 — a margem só aparece quando há procedência PUBLICADA para este número.
  //
  // Com `denominator` e `coverage` ambos nulos ela imprimia "Procedência / não informado", e a
  // captura da tela inteira mostrou isso catorze vezes: o Ataque 3 do DESIGN-05 §4 se realizando
  // — *"se todo número carrega procedência, procedência vira papel de parede e ninguém lê"*.
  //
  // Isto NÃO é esconder procedência para reduzir densidade: não há procedência publicada para
  // suprimir. Onde o contrato publica denominador ou cobertura, a margem continua ali, e a
  // ausência de UM dos dois continua virando a palavra do produto dentro dela.
  const temProcedencia = item.denominator !== null || item.coverageDisplay !== null;
  const valor = <ValorIndicador item={item} />;
  // M31 — o cartão perdeu a própria borda e virou CÉLULA de um painel.
  //
  // A borda ficava em catorze retângulos idênticos, e a pergunta do owner — *"qual agrupamento
  // semântico esta borda representa?"* — não tinha resposta: representava "um indicador", catorze
  // vezes. Linear (DESIGN-05 §3, linha 1) separa por **rampa de borda e alinhamento**, não por
  // caixa. Quem desenha a moldura agora é `SecaoDeIndicadores`, uma vez, e os fios internos saem
  // do `gap-px` da grade — o mesmo fio para todos, sem soma de bordas adjacentes.
  return (
    <li className="bg-card p-4">
      {/* A margem ENVOLVE o valor: é ela que prende a procedência ao dado, em vez de mandar o
          leitor procurar um rodapé de página. No mobile ela colapsa num gatilho com nome; no
          desktop fica ao lado. A informação é a mesma nos dois — muda a forma. */}
      {temProcedencia ? (
        <ProvenanceMargin
          rotuloDoIndicador={rotulo}
          procedencia={procedenciaDoIndicador(item, t)}
          rotuloDaMargem={t("canonicalAnalysis.result.provenanceLabel")}
          textoQuandoAusente={t("canonicalAnalysis.result.provenanceAbsent")}
        >
        {/* SÓ o valor. O rótulo é responsabilidade da margem — ela o usa como `aria-label` do
            grupo E o imprime. Repeti-lo aqui na 1ª versão fez o nome aparecer duas vezes no
            cartão, e a suíte da MF6.4b pegou na hora ("Found multiple elements"). */}
          {valor}
        </ProvenanceMargin>
      ) : (
        <>
          <p className="text-sm font-medium text-muted-foreground">{rotulo}</p>
          <p className="mt-1">{valor}</p>
        </>
      )}
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
      {/* O denominador SAIU do corpo do cartão na M26: ele É procedência do número, e passou a
          viver na margem, ancorado ao valor. Mantê-lo nos dois lugares daria duas leituras do
          mesmo dado no mesmo cartão. */}
      {item.outOfRange && (
        <p role="note" className="mt-2 text-xs text-destructive">
          {t("canonicalAnalysis.result.outOfRange")}
        </p>
      )}
    </li>
  );
}

export function ResumoDaAnalise({
  recordCountDisplay,
  analyzedAtDisplay,
  acao,
}: {
  recordCountDisplay: string;
  /** `null` quando o backend não mandou data. NUNCA `new Date()` local. */
  analyzedAtDisplay: string | null;
  /**
   * Ação sobre ESTE resultado, alinhada ao título da seção — M31.
   *
   * A ação de export ocupava uma faixa própria de largura inteira acima do resumo, encostada à
   * direita: uma linha inteira de espaço morto, e a exportação com o mesmo peso visual da
   * navegação global. Ela é uma ação sobre o resultado, e passa a morar ao lado do nome dele.
   */
  acao?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="res-resumo" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="res-resumo" className="text-lg font-semibold text-foreground">
          {t("canonicalAnalysis.result.summaryTitle")}
        </h2>
        {acao}
      </div>
      {/* Duas colunas, nao tres: `useful_outcomes` saiu do resumo porque no contrato canonico
          ele e um INDICADOR (`useful_outcome_count`), com estado e denominador proprios.
          Duplica-lo aqui criaria dois lugares para o mesmo numero — e eles divergiriam
          justamente quando um estivesse ausente e o outro nao. */}
      <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        <div className="bg-card p-4">
          <dt className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.totalRecords")}</dt>
          <dd className="mt-1 text-xl font-semibold text-foreground">{recordCountDisplay}</dd>
        </div>
        <div className="bg-card p-4">
          <dt className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.analyzedAt")}</dt>
          <dd className="mt-1 text-xl font-semibold text-foreground">
            {analyzedAtDisplay ?? t("canonicalAnalysis.result.notMeasured")}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function SecaoDeIndicadores({
  indicators,
  partial,
  partialityReasons,
  unsupportedIndicatorIds,
}: {
  indicators: readonly IndicatorView[];
  partial: boolean;
  partialityReasons: readonly string[];
  unsupportedIndicatorIds: readonly string[];
}) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="res-indicadores" className="space-y-3">
      <h2 id="res-indicadores" className="text-lg font-semibold text-foreground">
        {t("canonicalAnalysis.result.indicatorsTitle")}
      </h2>
      {indicators.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.noIndicators")}</p>
      ) : (
        // DUAS colunas no desktop, não três. Enquanto o cartão era só rótulo + valor, três
        // cabiam. Com a procedência ancorada ao lado do número (M26), a terceira coluna espremia
        // a margem a ponto de "não informado" quebrar em duas linhas — a evidência ficava mais
        // difícil de ler que o dado que ela explica. Medido em 1440×900, no navegador.
        //
        // M31 — UM painel, com fios internos. O `gap-px` sobre fundo `bg-border` desenha um fio
        // de 1px entre células sem que duas bordas adjacentes somem 2px, e `overflow-hidden`
        // recorta os cantos das células na curva da moldura. É a rampa do Linear: a estrutura
        // vem do alinhamento e de um fio, não de catorze retângulos.
        //
        // A segunda coluna começa em `lg` e não antes: a margem de procedência se põe ao lado do
        // valor a partir de `md` (768px), e em duas colunas abaixo de 1024px a coluna útil cai
        // para ~330px — a evidência voltaria a quebrar em duas linhas, que é exatamente o que a
        // M26 mediu e recusou. O tablet ganha compactação pela rampa, não pela segunda coluna.
        <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-2">
          {indicators.map((item) => (
            <CartaoIndicador key={item.id} item={item} />
          ))}
        </ul>
      )}
      {/* Parcialidade DECLARADA pela origem, com os motivos dela. A E5 inferia isto contando
          indicadores que sobreviveram a filtragem do frontend — o que media a cobertura do
          PROPRIO frontend, nao a da analise. */}
      {partial && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.result.partialNotice")}
          {partialityReasons.length > 0 && ` (${partialityReasons.join(", ")})`}
        </p>
      )}
      {/* Indicador que o backend mandou e a UI nao sabe nomear: visivel, nunca silencioso.
          Sumir com ele daria a impressao de que a analise nao o produziu. */}
      {unsupportedIndicatorIds.length > 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.result.unsupportedIndicators")}: {unsupportedIndicatorIds.join(", ")}
        </p>
      )}
    </section>
  );
}

/** Seção só existe se a origem trouxe recomendações — ordem preservada, sem priorizar. */
export function SecaoDeRecomendacoes({
  recommendations,
}: {
  recommendations: readonly RecommendationView[];
}) {
  const { t } = useLanguage();
  if (recommendations.length === 0) return null;
  return (
    <section aria-labelledby="res-recs" className="space-y-3">
      <h2 id="res-recs" className="text-lg font-semibold text-foreground">
        {t("canonicalAnalysis.result.recommendationsTitle")}
      </h2>
      {/* M31 — mesma rampa dos indicadores: a borda passa a representar a REGIÃO, e não cada
          item dentro dela. Duas linguagens visuais para duas listas vizinhas era a inconsistência
          que a captura da tela inteira mostrou. */}
      <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border">
        {recommendations.map((rec) => (
          <li key={rec.id} className="bg-card p-4">
            <p className="font-medium text-foreground">{rec.title}</p>
            {/* Prioridade vem da ORIGEM. A UI preserva a ordem recebida e nao reordena.
                M31 — `P1` sozinho na tela nao dizia de que ele era P1. O campo do contrato passa a
                ser NOMEADO, do mesmo jeito que o painel de Trust nomeia a origem de cada linha; o
                valor continua o que a origem mandou, sem traducao nem reordenacao. */}
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="text-xs uppercase tracking-wide">
                {t("canonicalAnalysis.result.recommendationPriority")}
              </span>{" "}
              {rec.priority}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
