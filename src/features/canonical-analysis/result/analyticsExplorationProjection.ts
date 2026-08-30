import { ehObjeto, listaEstrita, textoOuNulo } from "./leitores";

export type EstadoDeDisponibilidadeAnalitica =
  | "available"
  | "partial"
  | "not_measured"
  | "not_materialized"
  | "privacy_suppressed"
  | "unauthorized"
  | "unsupported"
  | "incompatible";

export type FamiliaAnalitica =
  | "volume"
  | "structure"
  | "outcomes"
  | "containment"
  | "intent_coverage"
  | "response_quality"
  | "safety_privacy"
  | "groundedness"
  | "operations"
  | "cost_resources"
  | "custom";

export interface EstadoDeFamilia {
  family_id: FamiliaAnalitica;
  availability: EstadoDeDisponibilidadeAnalitica;
  reason_code: string | null;
  metric_ids: string[];
}

export interface CapacidadeDeMetrica {
  metric_id: string;
  family_id: FamiliaAnalitica;
  value_kind: "count" | "numeric" | "boolean" | "categorical" | "unknown";
  availability: EstadoDeDisponibilidadeAnalitica;
  reason_code: string | null;
  compatible_dimension_ids: string[];
  compatible_time_dimension_ids: string[];
  not_materialized_dimension_ids: string[];
  not_materialized_time_dimension_ids: string[];
  incompatible_dimension_ids: string[];
  incompatible_time_dimension_ids: string[];
}

export interface CapacidadeDeDimensao {
  dimension_id: string;
  dimension_kind: "categorical" | "temporal";
  availability: EstadoDeDisponibilidadeAnalitica;
  reason_code: string | null;
}

export interface CatalogoDeExploracao {
  catalog_contract_version: "analytics-exploration-catalog-v1";
  query_contract_version: "analytics-query-v1";
  metric_families: EstadoDeFamilia[];
  metrics: CapacidadeDeMetrica[];
  dimensions: CapacidadeDeDimensao[];
}

const ESTADOS_DE_DISPONIBILIDADE = [
  "available",
  "partial",
  "not_measured",
  "not_materialized",
  "privacy_suppressed",
  "unauthorized",
  "unsupported",
  "incompatible",
] as const satisfies readonly EstadoDeDisponibilidadeAnalitica[];

const FAMILIAS_ANALITICAS = [
  "volume",
  "structure",
  "outcomes",
  "containment",
  "intent_coverage",
  "response_quality",
  "safety_privacy",
  "groundedness",
  "operations",
  "cost_resources",
  "custom",
] as const satisfies readonly FamiliaAnalitica[];

function estaNaLista<T extends string>(valor: unknown, opcoes: readonly T[]): valor is T {
  return typeof valor === "string" && opcoes.some((opcao) => opcao === valor);
}

function listaDeTextosEstrita(bruto: unknown): string[] | null {
  if (!Array.isArray(bruto) || bruto.some((item) => typeof item !== "string")) return null;
  return bruto as string[];
}

function lerEstadoDeFamilia(bruto: unknown): EstadoDeFamilia | null {
  if (!ehObjeto(bruto)) return null;
  const metricIds = listaDeTextosEstrita(bruto.metric_ids);
  if (
    !estaNaLista(bruto.family_id, FAMILIAS_ANALITICAS) ||
    !estaNaLista(bruto.availability, ESTADOS_DE_DISPONIBILIDADE) ||
    metricIds === null
  ) return null;
  return {
    family_id: bruto.family_id,
    availability: bruto.availability,
    reason_code: textoOuNulo(bruto.reason_code),
    metric_ids: metricIds,
  };
}

function lerCapacidadeDeMetrica(bruto: unknown): CapacidadeDeMetrica | null {
  if (!ehObjeto(bruto)) return null;
  const metricId = textoOuNulo(bruto.metric_id);
  const dimensoes = listaDeTextosEstrita(bruto.compatible_dimension_ids);
  const tempos = listaDeTextosEstrita(bruto.compatible_time_dimension_ids);
  const dimensoesNaoMaterializadas = listaDeTextosEstrita(bruto.not_materialized_dimension_ids);
  const temposNaoMaterializados = listaDeTextosEstrita(bruto.not_materialized_time_dimension_ids);
  const dimensoesIncompativeis = listaDeTextosEstrita(bruto.incompatible_dimension_ids);
  const temposIncompativeis = listaDeTextosEstrita(bruto.incompatible_time_dimension_ids);
  const tipos = ["count", "numeric", "boolean", "categorical", "unknown"] as const;
  if (
    !metricId ||
    !estaNaLista(bruto.family_id, FAMILIAS_ANALITICAS) ||
    !estaNaLista(bruto.value_kind, tipos) ||
    !estaNaLista(bruto.availability, ESTADOS_DE_DISPONIBILIDADE) ||
    dimensoes === null ||
    tempos === null ||
    dimensoesNaoMaterializadas === null ||
    temposNaoMaterializados === null ||
    dimensoesIncompativeis === null ||
    temposIncompativeis === null
  ) return null;
  return {
    metric_id: metricId,
    family_id: bruto.family_id,
    value_kind: bruto.value_kind,
    availability: bruto.availability,
    reason_code: textoOuNulo(bruto.reason_code),
    compatible_dimension_ids: dimensoes,
    compatible_time_dimension_ids: tempos,
    not_materialized_dimension_ids: dimensoesNaoMaterializadas,
    not_materialized_time_dimension_ids: temposNaoMaterializados,
    incompatible_dimension_ids: dimensoesIncompativeis,
    incompatible_time_dimension_ids: temposIncompativeis,
  };
}

function lerCapacidadeDeDimensao(bruto: unknown): CapacidadeDeDimensao | null {
  if (!ehObjeto(bruto)) return null;
  const dimensionId = textoOuNulo(bruto.dimension_id);
  const tipos = ["categorical", "temporal"] as const;
  if (
    !dimensionId ||
    !estaNaLista(bruto.dimension_kind, tipos) ||
    !estaNaLista(bruto.availability, ESTADOS_DE_DISPONIBILIDADE)
  ) return null;
  return {
    dimension_id: dimensionId,
    dimension_kind: bruto.dimension_kind,
    availability: bruto.availability,
    reason_code: textoOuNulo(bruto.reason_code),
  };
}

/** Lê capacidades publicadas; não infere combinações a partir dos blocos numéricos. */
export function lerCatalogoDeExploracao(bruto: unknown): CatalogoDeExploracao | null {
  if (
    !ehObjeto(bruto) ||
    bruto.catalog_contract_version !== "analytics-exploration-catalog-v1" ||
    bruto.query_contract_version !== "analytics-query-v1"
  ) return null;
  const familias = listaEstrita(bruto.metric_families, lerEstadoDeFamilia);
  const metricas = listaEstrita(bruto.metrics, lerCapacidadeDeMetrica);
  const dimensoes = listaEstrita(bruto.dimensions, lerCapacidadeDeDimensao);
  if (familias === null || metricas === null || dimensoes === null) return null;
  return {
    catalog_contract_version: "analytics-exploration-catalog-v1",
    query_contract_version: "analytics-query-v1",
    metric_families: familias,
    metrics: metricas,
    dimensions: dimensoes,
  };
}
