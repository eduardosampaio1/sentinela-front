import { describe, expect, it, vi } from "vitest";
import { createV1Client, type LongitudinalComparisonView } from "@/lib/v1";

const RESPONSE: LongitudinalComparisonView = {
  comparison_contract_version: "argos-longitudinal-comparison-v1",
  baseline: {
    analysis_id: "analysis-a",
    analyzed_at: null,
    record_count: 100,
    complete: true,
    versions: {},
  },
  current: {
    analysis_id: "analysis-b",
    analyzed_at: null,
    record_count: 100,
    complete: true,
    versions: {},
  },
  verdict: "comparable_with_caveats",
  blockers: [],
  caveats: ["dataset_composition_not_provable", "model_identity_not_available"],
  change_attribution: {
    sentinela_method: "stable",
    dataset_composition: "unknown",
    model_route: "unknown",
    temporal_order: "declared_by_caller",
  },
  pairs: [],
};

describe("ARGOS-LONG-01 · transporte da comparação longitudinal", () => {
  it("declara A como referência e B como resultado comparado na rota pública", async () => {
    let requestedUrl = "";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify(RESPONSE), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = createV1Client({
      baseUrl: "https://gateway.test",
      getAccessToken: async () => "token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      newCorrelationId: () => "corr-1",
    });

    const result = await client.getLongitudinalComparison(
      "analysis-b",
      "analysis-a",
      { workspaceId: "workspace-1" },
    );

    const url = new URL(requestedUrl);
    expect(url.pathname).toBe("/v1/analyses/analysis-b/longitudinal-comparison");
    expect(url.searchParams.get("baseline_analysis_id")).toBe("analysis-a");
    expect(url.searchParams.get("workspace_id")).toBe("workspace-1");
    expect(result).toEqual(RESPONSE);
  });
});
