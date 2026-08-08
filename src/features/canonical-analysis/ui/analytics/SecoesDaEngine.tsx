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
import type { IndicatorView, RecommendationView } from "../../result/indicadores";

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

export function ResumoDaAnalise({
  recordCountDisplay,
  analyzedAtDisplay,
}: {
  recordCountDisplay: string;
  /** `null` quando o backend não mandou data. NUNCA `new Date()` local. */
  analyzedAtDisplay: string | null;
}) {
  const { t } = useLanguage();
  return (
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
          <dd className="mt-1 text-xl font-semibold text-foreground">{recordCountDisplay}</dd>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <ol className="space-y-3">
        {recommendations.map((rec) => (
          <li key={rec.id} className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium text-foreground">{rec.title}</p>
            {/* Prioridade vem da ORIGEM. A UI preserva a ordem recebida e nao reordena. */}
            <p className="mt-1 text-sm text-muted-foreground">{rec.priority}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
