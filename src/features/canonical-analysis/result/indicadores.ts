// Apresentação de UM indicador da Engine — a parte que v1 e v2 têm em comum.
//
// Os dois contratos descrevem indicador com a MESMA forma e a MESMA semântica: `kind` decide a
// formatação permitida, `state` decide se existe número, `display_precision` decide as casas. O
// que muda entre v1 e v2 é o documento em volta, não o indicador.
//
// Por isso mora aqui, e não duplicado nos dois adapters: a regra "`ratio` vira percentual, `count`
// NUNCA vira percentual" precisa ter uma casa só. Duas cópias dela dariam duas telas do mesmo
// número — e a que estivesse errada seria descoberta por um usuário, não por um teste.
//
// Os adapters continuam distintos: cada um decide a versão, lê o próprio cabeçalho e monta o
// próprio view model. Eles COMPARTILHAM a apresentação do indicador; não compartilham a decisão.

import { descriptorDe, type IndicatorDescriptor } from "./descriptors";
import { formatarNumero, formatarMoeda } from "./formatacao";
import {
  STATES_COM_VALOR,
  type CanonicalDenominator,
  type CanonicalIndicator,
  type CanonicalRecommendation,
  type IndicatorState,
} from "./canonicalSchema";

/** Como a UI deve exibir um indicador — já decidido aqui, nunca no componente. */
export interface IndicatorView {
  id: string;
  descriptor: IndicatorDescriptor;
  /** Estado declarado pela origem — governa zero REAL × parcial × ausente × falhou. */
  state: IndicatorState;
  /** Texto pronto do valor (`null` quando não há valor — a UI mostra o rótulo do estado). */
  display: string | null;
  /** Unidade a exibir junto do valor (ex.: "%"), ou `null`. */
  unitSuffix: string | null;
  /** Valor bruto (para testes/aria), sem transformação além da declarada. */
  rawValue: number | null;
  /** Sobre o que a razão foi calculada — o "porquê" auditável do número. */
  denominator: CanonicalDenominator | null;
  /** Fração da amostra coberta, quando a origem declarou. */
  coverage: number | null;
  /** Cobertura já formatada para exibição (`null` quando a origem não declarou).
   *  Fica AQUI e não no componente: multiplicar por 100 é formatação, e formatação mora num
   *  lugar só — no componente, ela vira o primeiro passo para o cálculo migrar para a UI. */
  coverageDisplay: string | null;
  /** true quando o valor está fora da faixa declarada para a unidade (ex.: ratio > 1). */
  outOfRange: boolean;
}

/**
 * O rótulo humano de um indicador. **Um lugar só, e é de propósito.**
 *
 * `t(item.descriptor.labelKey)` é uma chamada OPACA: o gate da M14 não consegue decidir orfandade
 * a partir dela, e por isso congela a contagem dessas chamadas. Quando a M26 precisou do mesmo
 * rótulo na região de atenção, copiar a expressão teria elevado a contagem — e a dívida — por uma
 * duplicação. Concentrando aqui, dois consumidores custam uma chamada.
 */
export function rotuloDoIndicador(
  item: Pick<IndicatorView, "descriptor">,
  t: (chave: string) => string,
): string {
  return t(item.descriptor.labelKey);
}

/** Apresentação de UM indicador. `ratio` → percentual SOMENTE porque a origem declarou razão. */
export function apresentar(
  ind: CanonicalIndicator,
  descriptor: IndicatorDescriptor,
  locale: string,
): IndicatorView {
  const base: IndicatorView = {
    id: ind.id,
    descriptor,
    state: ind.state,
    display: null,
    unitSuffix: null,
    rawValue: ind.value,
    denominator: ind.denominator,
    coverage: ind.coverage,
    coverageDisplay:
      ind.coverage === null ? null : `${formatarNumero(ind.coverage * 100, locale, 0)}%`,
    outOfRange: false,
  };
  if (!STATES_COM_VALOR.includes(ind.state) || ind.value === null) return base;

  switch (ind.kind) {
    case "ratio": {
      // Fora da faixa declarada NÃO é limitado silenciosamente: é sinalizado.
      const fora = ind.value < 0 || ind.value > 1;
      // Percentual usa 2 casas a menos que a razão: 0,8123 (4 casas) → 81,23% (2 casas). É a
      // MESMA precisão declarada, expressa na outra escala — não uma escolha nova.
      const casas = Math.max(0, ind.display_precision - 2);
      return {
        ...base,
        display: formatarNumero(ind.value * 100, locale, casas),
        unitSuffix: "%",
        outOfRange: fora,
      };
    }
    case "count":
      // Contagem NUNCA vira percentual.
      return { ...base, display: formatarNumero(ind.value, locale, 0) };
    case "currency":
      return {
        ...base,
        display: formatarMoeda(ind.value, ind.currency, locale, ind.display_precision),
      };
    case "scalar":
      return { ...base, display: formatarNumero(ind.value, locale, ind.display_precision) };
  }
}

/**
 * Os indicadores do documento, separados entre os que a UI sabe nomear e os que não.
 *
 * Sem descriptor ⇒ não renderiza (cadeado): indicador desconhecido não vira UI adivinhada. Mas
 * ele também não some em silêncio — o id fica registrado para a UI poder dizer que recebeu algo
 * que não sabe nomear.
 */
export function apresentarIndicadores(
  indicadores: readonly CanonicalIndicator[],
  locale: string,
): { views: IndicatorView[]; naoSuportados: string[] } {
  const views: IndicatorView[] = [];
  const naoSuportados: string[] = [];
  for (const ind of indicadores) {
    const d = descriptorDe(ind.id);
    if (d) views.push(apresentar(ind, d, locale));
    else naoSuportados.push(ind.id);
  }
  return { views, naoSuportados };
}

/**
 * Uma recomendação como a TELA a recebe.
 *
 * Estruturalmente igual à do documento, e mesmo assim um tipo próprio — porque o view model
 * precisa prometer os campos por conta dele. Enquanto ele reexportava `CanonicalRecommendation`,
 * qualquer componente que tipasse a prop passava a importar o contrato do documento, e o cadeado
 * `backend-first-result` pegou exatamente isso. Não é duplicação decorativa: é a diferença entre
 * "a tela mostra o que o documento tem" e "a tela promete estes campos, venham de onde vierem".
 */
export interface RecommendationView {
  id: string;
  title: string;
  /** DA ORIGEM. O frontend nunca a fabrica nem reordena por ela. */
  priority: string;
  category: string | null;
  evidence_refs: string[];
}

/** Transporte 1:1, preservando a ORDEM recebida. Nenhuma priorização acontece aqui. */
export function apresentarRecomendacoes(
  recomendacoes: readonly CanonicalRecommendation[],
): RecommendationView[] {
  return recomendacoes.map((r) => ({
    id: r.id,
    title: r.title,
    priority: r.priority,
    category: r.category,
    evidence_refs: r.evidence_refs,
  }));
}
