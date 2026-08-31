import { useQuery } from "@tanstack/react-query";
import type { CanonicalScope } from "@/lib/v1";
import { useV1Client } from "./client";

export interface CostScenario {
  route_id: string;
  provider?: string;
  model_id?: string;
  status: string;
  currency?: string;
  total_cost: number;
  route_kind?: "inference" | "embedding";
}

export interface EconomicsView {
  availability: string;
  current_model?: { status?: string; provider?: string | null; model_id?: string | null };
  inference_comparisons: CostScenario[];
  embedding_comparisons: CostScenario[];
  disclaimer?: string;
}

function economicsFromEnvelope(envelope: { result_schema_version: string; result: unknown }): EconomicsView | null {
  if (envelope.result_schema_version !== "analysis-result-v4" || !envelope.result || typeof envelope.result !== "object") return null;
  const economics = (envelope.result as Record<string, unknown>).economics_assessment;
  if (!economics || typeof economics !== "object") return null;
  const value = economics as Record<string, unknown>;
  return {
    availability: String(value.availability ?? "unavailable"),
    current_model: value.current_model as EconomicsView["current_model"],
    inference_comparisons: Array.isArray(value.inference_comparisons) ? value.inference_comparisons as CostScenario[] : [],
    embedding_comparisons: Array.isArray(value.embedding_comparisons) ? value.embedding_comparisons as CostScenario[] : [],
    disclaimer: typeof value.disclaimer === "string" ? value.disclaimer : undefined,
  };
}

export function useAnalysisEconomics(scope: CanonicalScope | null, analysisId: string | null) {
  const client = useV1Client();
  return useQuery({
    queryKey: ["economics", scope?.workspaceId, analysisId, "v4"],
    enabled: Boolean(scope && analysisId),
    retry: false,
    queryFn: async ({ signal }) => economicsFromEnvelope(await client.getResult(
      analysisId as string, scope as CanonicalScope, { signal }, "4",
    )),
  });
}
