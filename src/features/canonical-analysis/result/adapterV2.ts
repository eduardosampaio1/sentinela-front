// Adapter do documento INTEGRADO: `analysis-result-v2` → view model. PURO (sem rede, sem React).
//
// Mesma autorização do v1, e ela não afrouxa por haver mais dados: ler o campo, formatar número,
// aplicar unidade e a precisão QUE A ORIGEM DECLAROU, converter em percentual o que a origem
// declarou ser fração, localizar data, mapear código de vocabulário fechado → texto.
//
// O que continua proibido, agora com nome analítico: somar contagens, dividir por denominador,
// reconstruir percentual que não veio pronto, recalcular Pareto, decidir supressão, inferir
// `withheld`, ordenar por relevância inventada.
//
// ## A cobertura que NÃO é calculada aqui
//
// Seria uma linha: `valid_count / record_count`. E seria a violação inteira — um percentual que o
// backend não publicou, com a mesma aparência dos que ele publicou. As quatro contagens
// (`valid`/`null`/`invalid`/`absent`) são exibidas como o que são: contagens. Quem quiser a razão
// entre elas pede ao Analytics, que é quem tem autoridade para declará-la.
//
// ## O digest não vira tela
//
// `projection_digest` é campo público do documento — o consumidor PODE conferi-lo. Mas o
// frontend não tem contra o que conferir (os metadados duráveis vivem no Orchestrator, e foi lá
// que a conferência aconteceu), então exibi-lo não seria auditoria: seria um hash decorativo.
// Ele fica fora do view model. A procedência que a tela mostra são as VERSÕES, que dizem sob qual
// contrato cada lado foi produzido.

import type { AnalysisResultView } from "@/lib/v1";
import {
  apresentarIndicadores,
  apresentarRecomendacoes,
  type IndicatorView,
  type RecommendationView,
} from "./indicadores";
import { validateCanonicalResultV2, type ValidationOutcomeV2 } from "./validatorV2";
import type {
  EstatisticaDeConcentracao,
  ResumoDeConcentracao,
  ResumoDeDistribuicao,
  ResumoNumerico,
  SerieTemporal,
  SnapshotAnalitico,
} from "./analyticsProjection";
import {
  formatarInstante,
  formatarJanela,
  formatarNumero,
  formatarPercentual,
} from "./formatacao";

// ── procedência ──────────────────────────────────────────────────────────────────────────

/** Sob qual contrato cada lado foi produzido. Duas versões porque são dois produtores. */
export interface LineageView {
  /** Da Engine. */
  measurementContractVersion: string;
  /** Do Analytics. Nunca a mesma coisa que a de cima. */
  snapshotContractVersion: string;
  /** Registro de indicadores que produziu o lado da Engine. */
  indicatorRegistryVersion: string;
}

// ── medidas numéricas ────────────────────────────────────────────────────────────────────

/** Uma estatística e por que ela pode não ter número. */
export interface StatView {
  label: string;
  /** `null` ⇒ não há número. `absenceReason` diz qual das duas ausências é. */
  display: string | null;
}

export interface MeasureView {
  id: string;
  /** O id humanizado. Formatação de rótulo, não tradução de domínio. */
  label: string;
  unit: string;
  semanticRole: string;
  counts: { label: string; display: string }[];
  stats: StatView[];
  /**
   * `true` ⇒ as estatísticas nulas são o PISO DE PRIVACIDADE, não dado faltando.
   *
   * A distinção é a razão de o campo existir no contrato: `minimum: null` sozinho seria
   * indistinguível de "ninguém mediu", e as duas pedem ações opostas.
   */
  suppressed: boolean;
}

// ── distribuições ────────────────────────────────────────────────────────────────────────

export interface GroupView {
  label: string;
  count: number;
  countDisplay: string;
  /**
   * Largura da barra, já como valor CSS (`"63%"`), **relativa ao maior item desta mesma lista**.
   *
   * É escala VISUAL, não estatística publicada: nenhum número é derivado dela, ela não aparece
   * como rótulo, e trocá-la por outra escala não mudaria fato nenhum da tela. A proporção real
   * de cada grupo sobre a população só existiria dividindo por um denominador — que é
   * exatamente o cálculo que este adapter não faz.
   *
   * Sai daqui já como TEXTO porque a alternativa era o componente multiplicar por 100 — e
   * aritmética em componente é o primeiro passo do cálculo migrando para a UI, exatamente o que
   * o cadeado `backend-first-result` pega.
   */
  barWidth: string;
}

export interface DistributionView {
  id: string;
  label: string;
  valueType: string;
  counts: { label: string; display: string }[];
  distinctObservedDisplay: string;
  groups: GroupView[];
  /** `null` quando nem a soma dos suprimidos alcançou o piso — não é zero. */
  otherCountDisplay: string | null;
  suppressed: boolean;
  /** `true` ⇒ `groups` vazio por DECISÃO (cardinalidade), não por falta de dado. */
  highCardinalitySuppressed: boolean;
  minGroupSize: number;
}

// ── concentração (Pareto) ────────────────────────────────────────────────────────────────

export interface ConcentrationStatView {
  id: string;
  label: string;
  /** Texto pronto: valor exato, faixa `a – b`, ou `null` quando não publicada. */
  display: string | null;
  /** `exact` | `bounded` — a exatidão DECLARADA. `null` quando não há número. */
  precision: string | null;
  /** Por que não saiu, em texto derivado de vocabulário FECHADO. `null` quando saiu. */
  withheldLabel: string | null;
}

export interface BandView {
  label: string;
  entityCount: number;
  entityCountDisplay: string;
  barWidth: string;
}

export interface ConcentrationView {
  id: string;
  label: string;
  unit: string;
  counts: { label: string; display: string }[];
  totalVolumeDisplay: string | null;
  statistics: ConcentrationStatView[];
  bands: BandView[];
  coarsened: boolean;
  suppressed: boolean;
  highCardinalitySuppressed: boolean;
}

// ── série temporal ───────────────────────────────────────────────────────────────────────

export interface WindowView {
  label: string;
  /** `null` só quando a janela foi suprimida. Zero é um valor. */
  count: number | null;
  countDisplay: string | null;
  status: string;
  barWidth: string;
}

export interface SeriesView {
  id: string;
  label: string;
  granularity: string;
  timezone: string;
  counts: { label: string; display: string }[];
  windows: WindowView[];
  /** `true` ⇒ a granularidade foi engrossada para caber no piso. */
  coarsened: boolean;
  suppressed: boolean;
  /** `true` ⇒ a série inteira foi suprimida. `windows` vazio é consequência, não ausência. */
  seriesSuppressed: boolean;
}

// ── o que a tela não mostra, dito em voz alta ────────────────────────────────────────────

/**
 * Contagens do que o documento trouxe e a tela não apresenta.
 *
 * Existem para que "não recebemos" e "não mostramos" nunca virem a mesma coisa. São CONTAGENS,
 * nunca identificadores: nomear uma medida não apresentada devolveria a chave de saída que a
 * fronteira pública existe para reter.
 */
export interface AnalyticsNotes {
  blocksNotPresented: number;
  measuresNotSummarized: number;
  measuresNotAuthorized: number;
  unreadableBlocks: number;
}

export interface AnalyticsContentView {
  recordCount: number;
  recordCountDisplay: string;
  measures: MeasureView[];
  distributions: DistributionView[];
  dimensions: DistributionView[];
  concentrations: ConcentrationView[];
  series: SeriesView[];
  notes: AnalyticsNotes;
}

/**
 * O bloco analítico, nos três estados que a origem declara.
 *
 * União discriminada, e não um `content` opcional: `withheld` **não tem** conteúdo, e um campo
 * anulável convidaria cada componente a decidir por conta própria o que fazer com o `null` —
 * que é como um estado explícito vira um `if` esquecido.
 */
export type AnalyticsView =
  | { status: "withheld"; lineage: LineageView }
  | { status: "ready" | "partial"; lineage: LineageView; content: AnalyticsContentView };

export interface ResultV2ViewModel {
  analysisId: string;
  schemaVersion: string;
  indicatorRegistryVersion: string;
  /** A contagem **A**: a janela da Engine. Nome próprio, para não ser lida como denominador. */
  summary: { engineWindowRecordCount: number; engineWindowRecordCountDisplay: string; analyzedAt: string; analyzedAtDisplay: string };
  indicators: IndicatorView[];
  recommendations: RecommendationView[];
  partial: boolean;
  partialityReasons: string[];
  unsupportedIndicatorIds: string[];
  analytics: AnalyticsView;
}

export type ResultV2Adaptation =
  | { status: "supported"; view: ResultV2ViewModel }
  | {
      status: "unsupported";
      schemaVersion: string;
      reason: Extract<ValidationOutcomeV2, { status: "unsupported" }>["reason"];
    };

// ── rótulos ──────────────────────────────────────────────────────────────────────────────

/**
 * `first_response_seconds` → `First response seconds`.
 *
 * Formatação de rótulo, não tradução de domínio: o id continua disponível para tooltip e export.
 * Um dicionário de nomes bonitos aqui inventaria vocabulário que o backend não declarou — e o
 * dia em que uma medida nova aparecesse, ela sairia sem nome nenhum.
 */
function humanizar(id: string): string {
  const limpo = id.replace(/[_.]+/g, " ").trim();
  if (!limpo) return id;
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

/**
 * Por que uma estatística de concentração não foi publicada. **Vocabulário fechado do contrato.**
 *
 * Estes códigos são públicos por decisão do Analytics — ele publica CÓDIGO justamente para não
 * publicar o texto interno, que nomearia a população. Traduzi-los é apresentação.
 *
 * Código desconhecido NÃO é ecoado: um valor que esta tela não conhece pode carregar qualquer
 * coisa que uma versão futura do backend decida pôr ali, e imprimi-lo cru seria publicar o
 * desconhecido. A tela diz que não foi publicada, sem inventar o motivo.
 */
const MOTIVOS_DE_RETENCAO: Record<string, string> = {
  no_eligible_population: "No records with a readable value",
  no_volume: "Total volume is zero",
  unsupported_value_domain: "Value domain does not support a share",
  cohort_below_min_group_size: "The described cohort is below the privacy floor",
  bands_unavailable: "No published bands to derive it from",
};

const ROTULOS_DE_ESTATISTICA: Record<string, string> = {
  top_20_percent_volume_share: "Volume held by the top 20%",
  population_share_required_for_80_percent_volume: "Population needed for 80% of volume",
};

// ── conversões ───────────────────────────────────────────────────────────────────────────

function contagens(
  entradas: { label: string; valor: number }[],
  locale: string,
): { label: string; display: string }[] {
  return entradas.map(({ label, valor }) => ({
    label,
    display: formatarNumero(valor, locale, 0),
  }));
}

/**
 * Escala visual 0..1 relativa ao maior valor da lista. Ver `GroupView.scale`.
 *
 * Máximo zero ⇒ escala zero para todos: uma lista de zeros não tem barra maior, e dividir por
 * zero produziria `NaN` que o navegador desenharia como largura vazia sem ninguém saber por quê.
 *
 * O resultado já sai LIMITADO a 0..1. O limite mora aqui e não no componente porque limitar é
 * aritmética, e a regra da plataforma é que aritmética não acontece em componente — nem a
 * inofensiva, porque é assim que a primeira conta entra na árvore de UI.
 */
function escalar(valores: number[]): (v: number) => string {
  const maximo = valores.reduce((a, b) => (b > a ? b : a), 0);
  return (v: number) => {
    if (maximo <= 0) return "0%";
    const fracao = v / maximo;
    const limitada = fracao < 0 ? 0 : fracao > 1 ? 1 : fracao;
    // Uma casa decimal basta para a barra, e evita um valor CSS de dezessete dígitos.
    return `${(limitada * 100).toFixed(1)}%`;
  };
}

function apresentarMedida(m: ResumoNumerico, locale: string): MeasureView {
  const numero = (v: number | null): string | null =>
    v === null ? null : formatarNumero(v, locale, 2);
  return {
    id: m.measure_id,
    label: humanizar(m.measure_id),
    unit: m.unit,
    semanticRole: m.semantic_role,
    counts: contagens(
      [
        { label: "With value", valor: m.valid_count },
        { label: "Empty", valor: m.null_count },
        { label: "Unreadable", valor: m.invalid_count },
        { label: "Field absent", valor: m.absent_count },
      ],
      locale,
    ),
    stats: [
      { label: "Minimum", display: numero(m.minimum) },
      { label: "Maximum", display: numero(m.maximum) },
      { label: "Total", display: numero(m.total) },
      { label: "Mean", display: numero(m.mean) },
    ],
    suppressed: m.suppression_applied,
  };
}

function apresentarDistribuicao(d: ResumoDeDistribuicao, locale: string): DistributionView {
  const escala = escalar(d.groups.map((g) => g.count));
  return {
    id: d.measure_id,
    label: humanizar(d.measure_id),
    valueType: d.value_type,
    counts: contagens(
      [
        { label: "With value", valor: d.value_count },
        { label: "Empty", valor: d.null_count },
        { label: "Unreadable", valor: d.invalid_count },
        { label: "Field absent", valor: d.absent_count },
      ],
      locale,
    ),
    distinctObservedDisplay: formatarNumero(d.distinct_observed, locale, 0),
    groups: d.groups.map((g) => ({
      label: g.label,
      count: g.count,
      countDisplay: formatarNumero(g.count, locale, 0),
      barWidth: escala(g.count),
    })),
    otherCountDisplay:
      d.other_count === null ? null : formatarNumero(d.other_count, locale, 0),
    suppressed: d.suppression_applied,
    highCardinalitySuppressed: d.high_cardinality_suppressed,
    minGroupSize: d.min_group_size,
  };
}

/**
 * Uma estatística de Pareto. As três formas do contrato viram três apresentações, e nenhuma
 * delas inventa número: exata mostra o valor, limitada mostra os DOIS limites, retida não mostra
 * número nenhum.
 */
function apresentarEstatistica(
  e: EstatisticaDeConcentracao,
  locale: string,
): ConcentrationStatView {
  const label = ROTULOS_DE_ESTATISTICA[e.statistic_id] ?? humanizar(e.statistic_id);
  if (e.state !== "published") {
    return {
      id: e.statistic_id,
      label,
      display: null,
      precision: null,
      withheldLabel:
        (e.reason_code && MOTIVOS_DE_RETENCAO[e.reason_code]) ?? "Not published",
    };
  }
  // As duas estatísticas do vocabulário são PARTICIPAÇÕES declaradas — o percentual é a escala
  // natural delas, não uma conversão escolhida aqui.
  if (e.value !== null) {
    return {
      id: e.statistic_id,
      label,
      display: formatarPercentual(e.value, locale),
      precision: e.calculation_precision,
      withheldLabel: null,
    };
  }
  if (e.lower_bound !== null && e.upper_bound !== null) {
    return {
      id: e.statistic_id,
      label,
      display: `${formatarPercentual(e.lower_bound, locale)} – ${formatarPercentual(e.upper_bound, locale)}`,
      precision: e.calculation_precision,
      withheldLabel: null,
    };
  }
  // Publicada e sem número é contradição da origem. A tela não inventa um: diz que não há.
  return {
    id: e.statistic_id,
    label,
    display: null,
    precision: null,
    withheldLabel: "Not published",
  };
}

function apresentarConcentracao(c: ResumoDeConcentracao, locale: string): ConcentrationView {
  const escala = escalar(c.bands.map((b) => b.entity_count));
  return {
    id: c.measure_id,
    label: humanizar(c.measure_id),
    unit: c.unit,
    counts: contagens(
      [
        { label: "With value", valor: c.value_count },
        { label: "Empty", valor: c.null_count },
        { label: "Unreadable", valor: c.invalid_count },
        { label: "Field absent", valor: c.absent_count },
      ],
      locale,
    ),
    totalVolumeDisplay:
      c.total_volume === null ? null : formatarNumero(c.total_volume, locale, 2),
    statistics: c.statistics.map((e) => apresentarEstatistica(e, locale)),
    bands: c.bands.map((b) => ({
      // Faixa de largura 1 é um valor só; escrevê-la como `3 – 3` faria a partição mais fina
      // parecer um intervalo.
      label:
        b.lower_value === b.upper_value
          ? formatarNumero(b.lower_value, locale, 0)
          : `${formatarNumero(b.lower_value, locale, 0)} – ${formatarNumero(b.upper_value, locale, 0)}`,
      entityCount: b.entity_count,
      entityCountDisplay: formatarNumero(b.entity_count, locale, 0),
      barWidth: escala(b.entity_count),
    })),
    coarsened: c.coarsening_applied,
    suppressed: c.suppression_applied,
    highCardinalitySuppressed: c.high_cardinality_suppressed,
  };
}

function apresentarSerie(s: SerieTemporal, locale: string): SeriesView {
  // Janela suprimida FICA DE FORA da escala, em vez de entrar como zero. As duas dariam o mesmo
  // máximo hoje, e não é por isso que a diferença importa: `?? 0` afirma que a janela vale zero,
  // e o que se sabe dela é que o número não foi liberado. A expressão precisa dizer a segunda
  // coisa, senão a primeira acaba copiada para um lugar onde o resultado muda.
  const escala = escalar(
    s.windows.filter((j): j is typeof j & { count: number } => j.count !== null).map((j) => j.count),
  );
  return {
    id: s.dimension_id,
    label: humanizar(s.dimension_id),
    granularity: s.effective_granularity,
    timezone: s.timezone,
    counts: contagens(
      [
        { label: "With value", valor: s.value_count },
        { label: "Empty", valor: s.null_count },
        { label: "Unreadable", valor: s.invalid_count },
      ],
      locale,
    ),
    windows: s.windows.map((j) => ({
      label: formatarJanela(j.window_start, s.effective_granularity, locale),
      count: j.count,
      countDisplay: j.count === null ? null : formatarNumero(j.count, locale, 0),
      status: j.status,
      // Janela suprimida não tem barra: desenhá-la com largura zero diria "nada aconteceu
      // aqui" sobre exatamente a janela cujo número foi retido.
      barWidth: j.count === null ? "0%" : escala(j.count),
    })),
    coarsened: s.coarsening_applied,
    suppressed: s.suppression_applied,
    seriesSuppressed: s.temporal_series_suppressed,
  };
}

function apresentarConteudo(snapshot: SnapshotAnalitico, locale: string): AnalyticsContentView {
  return {
    recordCount: snapshot.record_count,
    recordCountDisplay: formatarNumero(snapshot.record_count, locale, 0),
    measures: snapshot.numeric.map((m) => apresentarMedida(m, locale)),
    distributions: snapshot.distributions.map((d) => apresentarDistribuicao(d, locale)),
    dimensions: snapshot.dimensions.map((d) => apresentarDistribuicao(d, locale)),
    concentrations: snapshot.concentrations.map((c) => apresentarConcentracao(c, locale)),
    series: snapshot.time_series.map((s) => apresentarSerie(s, locale)),
    notes: {
      blocksNotPresented: snapshot.blocosNaoApresentados,
      measuresNotSummarized: snapshot.medidasNaoResumidas,
      measuresNotAuthorized: snapshot.medidasNaoAutorizadas,
      unreadableBlocks: snapshot.blocosIlegiveis,
    },
  };
}

/**
 * Fronteira única: `AnalysisResultView` (contrato público, versão v2) → view model.
 *
 * Nenhum componente chama o validador diretamente, e nenhum componente vê `analytics.data`.
 */
export function adaptAnalysisResultV2(
  publico: AnalysisResultView,
  locale = "en",
): ResultV2Adaptation {
  const outcome = validateCanonicalResultV2(publico.result_schema_version, publico.result);
  if (outcome.status === "unsupported") {
    return {
      status: "unsupported",
      schemaVersion: publico.result_schema_version,
      reason: outcome.reason,
    };
  }

  const doc = outcome.value;
  const { views, naoSuportados } = apresentarIndicadores(doc.indicators, locale);
  const lineage: LineageView = {
    measurementContractVersion: doc.measurement_contract_version,
    snapshotContractVersion: doc.analytics.snapshot_contract_version,
    indicatorRegistryVersion: publico.indicator_registry_version,
  };

  // Sem `if` sobre conteúdo ausente: o validador já garantiu, pelo TIPO, que `ready`/`partial`
  // trazem snapshot e `withheld` não traz. Um teste extra aqui seria um ramo inalcançável cujo
  // corpo — necessariamente inventado — viraria o fallback silencioso que esta fatia proíbe.
  const analytics: AnalyticsView =
    outcome.analytics.status === "withheld"
      ? { status: "withheld", lineage }
      : {
          status: outcome.analytics.status,
          lineage,
          content: apresentarConteudo(outcome.analytics.snapshot, locale),
        };

  return {
    status: "supported",
    view: {
      analysisId: publico.analysis_id,
      schemaVersion: publico.result_schema_version,
      indicatorRegistryVersion: publico.indicator_registry_version,
      summary: {
        engineWindowRecordCount: doc.summary.engine_window_record_count,
        engineWindowRecordCountDisplay: formatarNumero(
          doc.summary.engine_window_record_count,
          locale,
          0,
        ),
        analyzedAt: doc.summary.analyzed_at, // vem do backend; nunca gerado aqui
        analyzedAtDisplay: formatarInstante(doc.summary.analyzed_at, locale),
      },
      indicators: views,
      recommendations: apresentarRecomendacoes(doc.recommendations),
      partial: !doc.partiality.complete,
      partialityReasons: doc.partiality.reasons,
      unsupportedIndicatorIds: naoSuportados,
      analytics,
    },
  };
}
