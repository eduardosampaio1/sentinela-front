/** Leitura contratual das famílias combinatórias do Analytics. Não calcula projeções. */
import { ehObjeto, listaEstrita, numeroOuNulo, textoOuNulo } from "./leitores";

export interface LinhaDeCruzamentoComFlag {
  label: string;
  true_count: number;
  false_count: number;
  null_count: number;
  true_rate: number | null;
}
export interface LinhaDeCruzamentoNumerico {
  label: string;
  count: number;
  null_count: number;
  invalid_count: number;
  minimum: number;
  maximum: number;
  total: number;
  mean: number;
}
interface CruzamentoBase {
  dimension_id: string;
  measure_id: string;
  groups_observed: number;
  groups_suppressed: number;
  suppression_applied: boolean;
  high_cardinality_suppressed: boolean;
  min_group_size: number;
  privacy_policy_version: string;
  top_k: number;
  max_tracked_categories: number;
  method_id: string;
  method_version: number;
  method_parameters: Record<string, string>;
  method_definition_digest: string;
}
export interface CruzamentoComFlag extends CruzamentoBase {
  rows: LinhaDeCruzamentoComFlag[];
}
export interface CruzamentoNumerico extends CruzamentoBase {
  unit: string;
  semantic_role: string;
  rows: LinhaDeCruzamentoNumerico[];
}
export interface JanelaComFlag {
  window_start: string;
  true_count: number;
  false_count: number;
  null_count: number;
  true_rate: number | null;
  status: string;
}
export interface JanelaNumerica {
  window_start: string;
  count: number;
  null_count: number;
  invalid_count: number;
  minimum: number | null;
  maximum: number | null;
  total: number | null;
  mean: number | null;
  status: string;
}
interface SerieBase {
  dimension_id: string;
  measure_id: string;
  effective_granularity: string;
  timezone: string;
  coarsening_applied: boolean;
  value_count: number;
  null_count: number;
  invalid_count: number;
  undated_count: number;
  temporal_series_suppressed: boolean;
  suppression_applied: boolean;
  method_id: string;
  method_version: number;
  method_parameters: Record<string, string>;
  method_definition_digest: string;
  privacy_policy_version: string;
  min_group_size: number;
  max_time_buckets: number;
  series_contract_version: string;
}
export interface SerieComFlag extends SerieBase {
  windows: JanelaComFlag[];
}
export interface SerieNumerica extends SerieBase {
  unit: string;
  semantic_role: string;
  windows: JanelaNumerica[];
}

function contagem(v: unknown): number | null {
  const n = numeroOuNulo(v);
  return n !== null && n >= 0 && Number.isInteger(n) ? n : null;
}
function booleano(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}
function parametros(v: unknown): Record<string, string> | null {
  return ehObjeto(v)
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]))
    : null;
}

function linhaFlag(v: unknown): LinhaDeCruzamentoComFlag | null {
  if (!ehObjeto(v)) return null;
  const label = textoOuNulo(v.label),
    t = contagem(v.true_count),
    f = contagem(v.false_count),
    n = contagem(v.null_count);
  return label && t !== null && f !== null && n !== null
    ? {
        label,
        true_count: t,
        false_count: f,
        null_count: n,
        true_rate: numeroOuNulo(v.true_rate),
      }
    : null;
}
function linhaNumerica(v: unknown): LinhaDeCruzamentoNumerico | null {
  if (!ehObjeto(v)) return null;
  const label = textoOuNulo(v.label),
    count = contagem(v.count),
    null_count = contagem(v.null_count),
    invalid_count = contagem(v.invalid_count),
    minimum = numeroOuNulo(v.minimum),
    maximum = numeroOuNulo(v.maximum),
    total = numeroOuNulo(v.total),
    mean = numeroOuNulo(v.mean);
  return label &&
    count !== null &&
    null_count !== null &&
    invalid_count !== null &&
    minimum !== null &&
    maximum !== null &&
    total !== null &&
    mean !== null
    ? { label, count, null_count, invalid_count, minimum, maximum, total, mean }
    : null;
}
function baseCruzamento(v: Record<string, unknown>) {
  const dimension_id = textoOuNulo(v.dimension_id),
    measure_id = textoOuNulo(v.measure_id),
    groups_observed = contagem(v.groups_observed),
    groups_suppressed = contagem(v.groups_suppressed),
    min_group_size = contagem(v.min_group_size),
    privacy_policy_version = textoOuNulo(v.privacy_policy_version),
    top_k = contagem(v.top_k),
    max_tracked_categories = contagem(v.max_tracked_categories),
    method_id = textoOuNulo(v.method_id),
    method_version = contagem(v.method_version),
    method_parameters = parametros(v.method_parameters),
    method_definition_digest = textoOuNulo(v.method_definition_digest),
    suppression_applied = booleano(v.suppression_applied),
    high_cardinality_suppressed = booleano(v.high_cardinality_suppressed);
  if (
    !dimension_id ||
    !measure_id ||
    groups_observed === null ||
    groups_suppressed === null ||
    min_group_size === null ||
    !privacy_policy_version ||
    top_k === null ||
    max_tracked_categories === null ||
    !method_id ||
    method_version === null ||
    !method_parameters ||
    !method_definition_digest ||
    suppression_applied === null ||
    high_cardinality_suppressed === null
  )
    return null;
  return {
    dimension_id,
    measure_id,
    groups_observed,
    groups_suppressed,
    min_group_size,
    privacy_policy_version,
    top_k,
    max_tracked_categories,
    method_id,
    method_version,
    method_parameters,
    method_definition_digest,
    suppression_applied,
    high_cardinality_suppressed,
  };
}
export function lerCruzamentoComFlag(v: unknown): CruzamentoComFlag | null {
  if (!ehObjeto(v)) return null;
  const base = baseCruzamento(v),
    rows = listaEstrita(v.rows, linhaFlag);
  return base && rows ? { ...base, rows } : null;
}
export function lerCruzamentoNumerico(v: unknown): CruzamentoNumerico | null {
  if (!ehObjeto(v)) return null;
  const base = baseCruzamento(v),
    unit = textoOuNulo(v.unit),
    semantic_role = textoOuNulo(v.semantic_role),
    rows = listaEstrita(v.rows, linhaNumerica);
  return base && unit && semantic_role && rows
    ? { ...base, unit, semantic_role, rows }
    : null;
}

function janelaFlag(v: unknown): JanelaComFlag | null {
  if (!ehObjeto(v)) return null;
  const window_start = textoOuNulo(v.window_start),
    true_count = contagem(v.true_count),
    false_count = contagem(v.false_count),
    null_count = contagem(v.null_count),
    status = textoOuNulo(v.status);
  return window_start &&
    true_count !== null &&
    false_count !== null &&
    null_count !== null &&
    status
    ? {
        window_start,
        true_count,
        false_count,
        null_count,
        true_rate: numeroOuNulo(v.true_rate),
        status,
      }
    : null;
}
function janelaNumerica(v: unknown): JanelaNumerica | null {
  if (!ehObjeto(v)) return null;
  const window_start = textoOuNulo(v.window_start),
    count = contagem(v.count),
    null_count = contagem(v.null_count),
    invalid_count = contagem(v.invalid_count),
    status = textoOuNulo(v.status);
  return window_start &&
    count !== null &&
    null_count !== null &&
    invalid_count !== null &&
    status
    ? {
        window_start,
        count,
        null_count,
        invalid_count,
        minimum: numeroOuNulo(v.minimum),
        maximum: numeroOuNulo(v.maximum),
        total: numeroOuNulo(v.total),
        mean: numeroOuNulo(v.mean),
        status,
      }
    : null;
}
function baseSerie(v: Record<string, unknown>) {
  const dimension_id = textoOuNulo(v.dimension_id),
    measure_id = textoOuNulo(v.measure_id),
    effective_granularity = textoOuNulo(v.effective_granularity),
    timezone = textoOuNulo(v.timezone),
    value_count = contagem(v.value_count),
    null_count = contagem(v.null_count),
    invalid_count = contagem(v.invalid_count),
    undated_count = contagem(v.undated_count),
    method_id = textoOuNulo(v.method_id),
    method_version = contagem(v.method_version),
    method_parameters = parametros(v.method_parameters),
    method_definition_digest = textoOuNulo(v.method_definition_digest),
    privacy_policy_version = textoOuNulo(v.privacy_policy_version),
    min_group_size = contagem(v.min_group_size),
    max_time_buckets = contagem(v.max_time_buckets),
    series_contract_version = textoOuNulo(v.series_contract_version),
    coarsening_applied = booleano(v.coarsening_applied),
    temporal_series_suppressed = booleano(v.temporal_series_suppressed),
    suppression_applied = booleano(v.suppression_applied);
  if (
    !dimension_id ||
    !measure_id ||
    !effective_granularity ||
    !timezone ||
    value_count === null ||
    null_count === null ||
    invalid_count === null ||
    undated_count === null ||
    !method_id ||
    method_version === null ||
    !method_parameters ||
    !method_definition_digest ||
    !privacy_policy_version ||
    min_group_size === null ||
    max_time_buckets === null ||
    !series_contract_version ||
    coarsening_applied === null ||
    temporal_series_suppressed === null ||
    suppression_applied === null
  )
    return null;
  return {
    dimension_id,
    measure_id,
    effective_granularity,
    timezone,
    value_count,
    null_count,
    invalid_count,
    undated_count,
    method_id,
    method_version,
    method_parameters,
    method_definition_digest,
    privacy_policy_version,
    min_group_size,
    max_time_buckets,
    series_contract_version,
    coarsening_applied,
    temporal_series_suppressed,
    suppression_applied,
  };
}
export function lerSerieComFlag(v: unknown): SerieComFlag | null {
  if (!ehObjeto(v)) return null;
  const base = baseSerie(v),
    windows = listaEstrita(v.windows, janelaFlag);
  return base && windows ? { ...base, windows } : null;
}
export function lerSerieNumerica(v: unknown): SerieNumerica | null {
  if (!ehObjeto(v)) return null;
  const base = baseSerie(v),
    unit = textoOuNulo(v.unit),
    semantic_role = textoOuNulo(v.semantic_role),
    windows = listaEstrita(v.windows, janelaNumerica);
  return base && unit && semantic_role && windows
    ? { ...base, unit, semantic_role, windows }
    : null;
}
