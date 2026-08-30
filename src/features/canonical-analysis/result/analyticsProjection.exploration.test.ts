import { describe, expect, it } from "vitest";
import { lerSnapshot } from "./analyticsProjection";

const CATALOGO = {
  catalog_contract_version: "analytics-exploration-catalog-v1",
  query_contract_version: "analytics-query-v1",
  metric_families: [
    {
      family_id: "volume",
      availability: "available",
      reason_code: null,
      metric_ids: ["dataset.record_count"],
    },
  ],
  metrics: [
    {
      metric_id: "dataset.record_count",
      family_id: "volume",
      value_kind: "count",
      availability: "available",
      reason_code: null,
      compatible_dimension_ids: [],
      compatible_time_dimension_ids: [],
      not_materialized_dimension_ids: [],
      not_materialized_time_dimension_ids: [],
      incompatible_dimension_ids: [],
      incompatible_time_dimension_ids: [],
    },
  ],
  dimensions: [],
};

describe("catálogo de exploração no snapshot", () => {
  it("lê a v11 sem recalcular capacidade", () => {
    const snapshot = lerSnapshot({
      snapshot_contract_version: "analytics-snapshot-v11",
      record_count: 42,
      exploration_catalog: CATALOGO,
    });

    expect(snapshot?.catalogoDeExploracao?.metrics[0]?.metric_id).toBe("dataset.record_count");
    expect(snapshot?.record_count).toBe(42);
  });

  it("recusa v11 sem catálogo em vez de fingir indisponibilidade", () => {
    expect(
      lerSnapshot({ snapshot_contract_version: "analytics-snapshot-v11", record_count: 42 }),
    ).toBeNull();
  });

  it("não reclassifica versão futura sem catálogo como análise histórica", () => {
    expect(
      lerSnapshot({ snapshot_contract_version: "analytics-snapshot-v12", record_count: 42 }),
    ).toBeNull();
  });

  it("preserva snapshot histórico com fallback explícito", () => {
    const snapshot = lerSnapshot({
      snapshot_contract_version: "analytics-snapshot-v10",
      record_count: 42,
    });

    expect(snapshot?.catalogoDeExploracao).toBeNull();
  });
});
