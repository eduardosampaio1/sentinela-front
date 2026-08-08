// O que vai DENTRO de `analytics.data`: o snapshot analítico (`analytics-snapshot-v*`).
//
// ## Opaco para o Assembler, legível aqui — e isso não é contradição
//
// O Assembler transporta `data` sem interpretar, de propósito: interpretar lá o faria conhecer a
// forma da projeção, que é o acoplamento que mantê-lo puro existe para evitar. A TELA não tem
// essa escolha — ela precisa mostrar concentração, série temporal e distribuição, e não há como
// mostrar sem ler.
//
// A linha que continua valendo é a outra: **ler não é recalcular.** Tudo aqui é leitura de campo
// publicado. Nenhuma soma, nenhuma razão, nenhuma reconstrução de percentual, nenhuma decisão de
// supressão. Quando o documento diz `suppression_applied`, a tela repete; não deduz.
//
// ## Bloco ilegível é DESCARTADO e CONTADO
//
// Um bloco que não corresponde ao contrato não vira UI adivinhada, e também não some em
// silêncio. `blocosIlegiveis` sobe até o view model para a tela poder dizer que recebeu algo que
// não soube ler — o mesmo tratamento que `unsupportedIndicatorIds` dá ao lado da Engine.
//
// ## O que NÃO é lido, e por quê
//
// `flag_crosses`, `numeric_crosses`, `flag_series` e `numeric_series` existem no contrato e não
// são apresentados nesta fatia. Eles são CONTADOS (`blocosNaoApresentados`) em vez de ignorados:
// a tela declara que o documento trouxe mais do que ela mostra, porque "não recebemos" e "não
// mostramos" são coisas diferentes para quem lê.
//
// `unsupported_measure_ids` e `unauthorized_measure_ids` são contados, nunca nomeados. Um
// `measure_id` é chave de saída, e a MF5 congelou que chave de saída não atravessa a fronteira
// pública — publicá-la justamente na lista do que foi retido faria a metadata contar a história
// que o payload decidiu esconder.

import { ehObjeto, lista, listaEstrita, numeroOuNulo, textoOuNulo } from "./leitores";

// ── medidas numéricas ────────────────────────────────────────────────────────────────────

/** Uma medida quantitativa, resumida. As quatro estatísticas são anuláveis por DUAS razões. */
export interface ResumoNumerico {
  measure_id: string;
  unit: string;
  semantic_role: string;
  valid_count: number;
  null_count: number;
  invalid_count: number;
  absent_count: number;
  minimum: number | null;
  maximum: number | null;
  total: number | null;
  mean: number | null;
  /** `true` ⇒ os nulos acima são o PISO de privacidade, não ausência de dado. */
  suppression_applied: boolean;
}

// ── distribuições de rótulo ──────────────────────────────────────────────────────────────

export interface GrupoPublicado {
  label: string;
  count: number;
}

export interface ResumoDeDistribuicao {
  measure_id: string;
  value_type: string;
  min_group_size: number;
  value_count: number;
  null_count: number;
  invalid_count: number;
  absent_count: number;
  distinct_observed: number;
  groups: GrupoPublicado[];
  /** `null` quando nem a soma dos suprimidos alcança o piso. Não é zero. */
  other_count: number | null;
  suppression_applied: boolean;
  high_cardinality_suppressed: boolean;
}

// ── concentração (Pareto) ────────────────────────────────────────────────────────────────

export interface FaixaPublicada {
  lower_value: number;
  upper_value: number;
  entity_count: number;
}

/**
 * Uma das duas perguntas de Pareto. A forma é imposta pela ORIGEM e apenas repetida aqui:
 *
 *     publicada + exata      tem `value`, e nenhum limite
 *     publicada + limitada   tem os DOIS limites, e nenhum `value`
 *     não publicada          não tem número, e tem `reason_code`
 */
export interface EstatisticaDeConcentracao {
  statistic_id: string;
  state: string;
  calculation_precision: string | null;
  value: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
  reason_code: string | null;
}

export interface ResumoDeConcentracao {
  measure_id: string;
  unit: string;
  semantic_role: string;
  value_count: number;
  null_count: number;
  invalid_count: number;
  absent_count: number;
  total_volume: number | null;
  bands: FaixaPublicada[];
  coarsening_applied: boolean;
  suppression_applied: boolean;
  high_cardinality_suppressed: boolean;
  statistics: EstatisticaDeConcentracao[];
}

// ── séries temporais ─────────────────────────────────────────────────────────────────────

export interface JanelaDaSerie {
  window_start: string;
  /** `null` APENAS quando `status === "suppressed"`. Zero é valor, não ausência. */
  count: number | null;
  status: string;
}

export interface SerieTemporal {
  dimension_id: string;
  effective_granularity: string;
  timezone: string;
  coarsening_applied: boolean;
  value_count: number;
  null_count: number;
  invalid_count: number;
  windows: JanelaDaSerie[];
  temporal_series_suppressed: boolean;
  suppression_applied: boolean;
}

// ── o snapshot ───────────────────────────────────────────────────────────────────────────

export interface SnapshotAnalitico {
  snapshot_contract_version: string;
  /** O denominador verdadeiro. Todo o resto é contado sobre ele. */
  record_count: number;
  numeric: ResumoNumerico[];
  distributions: ResumoDeDistribuicao[];
  dimensions: ResumoDeDistribuicao[];
  concentrations: ResumoDeConcentracao[];
  time_series: SerieTemporal[];
  /** Blocos que o contrato traz e esta tela não apresenta. Contados, nunca nomeados. */
  blocosNaoApresentados: number;
  /** Medidas que o cálculo não soube resumir ou não pôde publicar. Contadas, nunca nomeadas. */
  medidasNaoResumidas: number;
  medidasNaoAutorizadas: number;
  /** Blocos que não correspondiam ao contrato e foram descartados. */
  blocosIlegiveis: number;
}

// ── leitores ─────────────────────────────────────────────────────────────────────────────

/** Contagem não-negativa obrigatória, ou `null` (que o chamador trata como bloco ilegível). */
function contagem(v: unknown): number | null {
  const n = numeroOuNulo(v);
  if (n === null || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

/** Contagem opcional com default declarado — `absent_count` nasceu na v8 e tem default no contrato. */
function contagemComPadrao(v: unknown, padrao: number): number | null {
  if (v === undefined || v === null) return padrao;
  return contagem(v);
}

function booleano(v: unknown): boolean {
  return v === true;
}

function lerNumerico(bruto: unknown): ResumoNumerico | null {
  if (!ehObjeto(bruto)) return null;
  const measureId = textoOuNulo(bruto.measure_id);
  const unit = textoOuNulo(bruto.unit);
  const semanticRole = textoOuNulo(bruto.semantic_role);
  const valid = contagem(bruto.valid_count);
  const nulos = contagem(bruto.null_count);
  const invalidos = contagem(bruto.invalid_count);
  const ausentes = contagemComPadrao(bruto.absent_count, 0);
  if (
    !measureId ||
    !unit ||
    !semanticRole ||
    valid === null ||
    nulos === null ||
    invalidos === null ||
    ausentes === null
  ) {
    return null;
  }
  return {
    measure_id: measureId,
    unit,
    semantic_role: semanticRole,
    valid_count: valid,
    null_count: nulos,
    invalid_count: invalidos,
    absent_count: ausentes,
    minimum: numeroOuNulo(bruto.minimum),
    maximum: numeroOuNulo(bruto.maximum),
    total: numeroOuNulo(bruto.total),
    mean: numeroOuNulo(bruto.mean),
    suppression_applied: booleano(bruto.suppression_applied),
  };
}

function lerGrupo(bruto: unknown): GrupoPublicado | null {
  if (!ehObjeto(bruto)) return null;
  const label = textoOuNulo(bruto.label);
  const count = contagem(bruto.count);
  if (!label || count === null) return null;
  return { label, count };
}

function lerDistribuicao(bruto: unknown): ResumoDeDistribuicao | null {
  if (!ehObjeto(bruto)) return null;
  const measureId = textoOuNulo(bruto.measure_id);
  const valueType = textoOuNulo(bruto.value_type);
  const valid = contagem(bruto.value_count);
  const nulos = contagem(bruto.null_count);
  const invalidos = contagem(bruto.invalid_count);
  const ausentes = contagemComPadrao(bruto.absent_count, 0);
  const distintos = contagem(bruto.distinct_observed);
  const piso = contagem(bruto.min_group_size);
  if (
    !measureId ||
    !valueType ||
    valid === null ||
    nulos === null ||
    invalidos === null ||
    ausentes === null ||
    distintos === null ||
    piso === null
  ) {
    return null;
  }
  // `other_count` distingue três coisas: um número, "não alcançou o piso" (`null`) e um campo
  // corrompido. As duas primeiras são do contrato; a terceira derruba o bloco.
  let outros: number | null = null;
  if (bruto.other_count !== undefined && bruto.other_count !== null) {
    outros = contagem(bruto.other_count);
    if (outros === null) return null;
  }
  // Grupo ilegível derruba a distribuição inteira: uma barra a menos não se anuncia sozinha.
  const grupos = listaEstrita(bruto.groups, lerGrupo);
  if (grupos === null) return null;

  return {
    measure_id: measureId,
    value_type: valueType,
    min_group_size: piso,
    value_count: valid,
    null_count: nulos,
    invalid_count: invalidos,
    absent_count: ausentes,
    distinct_observed: distintos,
    groups: grupos,
    other_count: outros,
    suppression_applied: booleano(bruto.suppression_applied),
    high_cardinality_suppressed: booleano(bruto.high_cardinality_suppressed),
  };
}

function lerFaixa(bruto: unknown): FaixaPublicada | null {
  if (!ehObjeto(bruto)) return null;
  const inferior = numeroOuNulo(bruto.lower_value);
  const superior = numeroOuNulo(bruto.upper_value);
  const entidades = contagem(bruto.entity_count);
  if (inferior === null || superior === null || entidades === null) return null;
  if (superior < inferior) return null;
  return { lower_value: inferior, upper_value: superior, entity_count: entidades };
}

function lerEstatistica(bruto: unknown): EstatisticaDeConcentracao | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.statistic_id);
  const estado = textoOuNulo(bruto.state);
  if (!id || !estado) return null;
  return {
    statistic_id: id,
    state: estado,
    calculation_precision: textoOuNulo(bruto.calculation_precision),
    value: numeroOuNulo(bruto.value),
    lower_bound: numeroOuNulo(bruto.lower_bound),
    upper_bound: numeroOuNulo(bruto.upper_bound),
    reason_code: textoOuNulo(bruto.reason_code),
  };
}

function lerConcentracao(bruto: unknown): ResumoDeConcentracao | null {
  if (!ehObjeto(bruto)) return null;
  const measureId = textoOuNulo(bruto.measure_id);
  const unit = textoOuNulo(bruto.unit);
  const semanticRole = textoOuNulo(bruto.semantic_role);
  const valid = contagem(bruto.value_count);
  const nulos = contagem(bruto.null_count);
  const invalidos = contagem(bruto.invalid_count);
  const ausentes = contagemComPadrao(bruto.absent_count, 0);
  if (
    !measureId ||
    !unit ||
    !semanticRole ||
    valid === null ||
    nulos === null ||
    invalidos === null ||
    ausentes === null
  ) {
    return null;
  }
  // Faixa ou estatística ilegível derruba a concentração: a partição precisa fechar com
  // `value_count` para o consumidor poder recomputar o que recebeu, e uma faixa a menos quebra
  // exatamente essa propriedade.
  const faixas = listaEstrita(bruto.bands, lerFaixa);
  const estatisticas = listaEstrita(bruto.statistics, lerEstatistica);
  if (faixas === null || estatisticas === null) return null;

  return {
    measure_id: measureId,
    unit,
    semantic_role: semanticRole,
    value_count: valid,
    null_count: nulos,
    invalid_count: invalidos,
    absent_count: ausentes,
    total_volume: numeroOuNulo(bruto.total_volume),
    bands: faixas,
    coarsening_applied: booleano(bruto.coarsening_applied),
    suppression_applied: booleano(bruto.suppression_applied),
    high_cardinality_suppressed: booleano(bruto.high_cardinality_suppressed),
    statistics: estatisticas,
  };
}

function lerJanela(bruto: unknown): JanelaDaSerie | null {
  if (!ehObjeto(bruto)) return null;
  const inicio = textoOuNulo(bruto.window_start);
  const status = textoOuNulo(bruto.status);
  if (!inicio || !status) return null;
  // `count` ausente é legítimo SÓ em `suppressed`. Em `observed`/`empty` a janela sem contagem
  // não descreve nada — e um zero fabricado aqui diria "não houve registro" sobre uma janela
  // cujo número simplesmente não chegou.
  if (bruto.count === undefined || bruto.count === null) {
    if (status !== "suppressed") return null;
    return { window_start: inicio, count: null, status };
  }
  const n = contagem(bruto.count);
  if (n === null) return null;
  return { window_start: inicio, count: n, status };
}

function lerSerie(bruto: unknown): SerieTemporal | null {
  if (!ehObjeto(bruto)) return null;
  const dimensionId = textoOuNulo(bruto.dimension_id);
  const granularidade = textoOuNulo(bruto.effective_granularity);
  const fuso = textoOuNulo(bruto.timezone);
  const valid = contagem(bruto.value_count);
  const nulos = contagem(bruto.null_count);
  const invalidos = contagem(bruto.invalid_count);
  if (
    !dimensionId ||
    !granularidade ||
    !fuso ||
    valid === null ||
    nulos === null ||
    invalidos === null
  ) {
    return null;
  }
  // Janela ilegível derruba a série. Uma série é um TODO ordenado: descartar um mês do meio
  // desenharia uma tendência que o documento não afirma, e sem nada na tela dizendo isso.
  const janelas = listaEstrita(bruto.windows, lerJanela);
  if (janelas === null) return null;

  return {
    dimension_id: dimensionId,
    effective_granularity: granularidade,
    timezone: fuso,
    coarsening_applied: booleano(bruto.coarsening_applied),
    value_count: valid,
    null_count: nulos,
    invalid_count: invalidos,
    windows: janelas,
    temporal_series_suppressed: booleano(bruto.temporal_series_suppressed),
    suppression_applied: booleano(bruto.suppression_applied),
  };
}

/** Quantos elementos o array tinha, para saber quantos o leitor descartou. */
function tamanho(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

/**
 * O snapshot inteiro, ou `null` quando ele não corresponde ao contrato.
 *
 * `null` é recusa do BLOCO ANALÍTICO, não do documento: quem chama decide, e a decisão congelada
 * é que um `ready` com conteúdo ilegível é contrato inválido — publicar "há resultado analítico"
 * sobre algo que não se soube ler é a mesma mentira que publicá-lo sobre nada.
 */
export function lerSnapshot(bruto: unknown): SnapshotAnalitico | null {
  if (!ehObjeto(bruto)) return null;
  const versao = textoOuNulo(bruto.snapshot_contract_version);
  const registros = contagem(bruto.record_count);
  if (!versao || registros === null) return null;

  const numeric = lista(bruto.numeric, lerNumerico);
  const distributions = lista(bruto.distributions, lerDistribuicao);
  const dimensions = lista(bruto.dimensions, lerDistribuicao);
  const concentrations = lista(bruto.concentrations, lerConcentracao);
  const timeSeries = lista(bruto.time_series, lerSerie);

  const ilegiveis =
    tamanho(bruto.numeric) -
    numeric.length +
    (tamanho(bruto.distributions) - distributions.length) +
    (tamanho(bruto.dimensions) - dimensions.length) +
    (tamanho(bruto.concentrations) - concentrations.length) +
    (tamanho(bruto.time_series) - timeSeries.length);

  return {
    snapshot_contract_version: versao,
    record_count: registros,
    numeric,
    distributions,
    dimensions,
    concentrations,
    time_series: timeSeries,
    blocosNaoApresentados:
      tamanho(bruto.flag_crosses) +
      tamanho(bruto.numeric_crosses) +
      tamanho(bruto.flag_series) +
      tamanho(bruto.numeric_series),
    medidasNaoResumidas: tamanho(bruto.unsupported_measure_ids),
    medidasNaoAutorizadas: tamanho(bruto.unauthorized_measure_ids),
    blocosIlegiveis: ilegiveis,
  };
}
