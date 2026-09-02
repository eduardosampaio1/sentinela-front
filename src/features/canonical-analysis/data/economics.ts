import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CanonicalScope } from "@/lib/v1";
import type { EconomicsScenarioScale } from "@/lib/v1";
import { useV1Client } from "./client";

export interface CostScenario {
  route_id: string;
  provider?: string;
  model_id?: string;
  status: string;
  currency?: string;
  total_cost: number | null;
  route_kind?: "inference" | "embedding";
}

export interface EconomicsView {
  availability: string;
  current_model?: {
    status?: "detected" | "declared" | "inferred" | "unknown";
    provider?: string | null;
    model_id?: string | null;
    pricing_route?: string | null;
    coverage?: number;
    reason?: string | null;
  };
  current_model_comparison?: CostScenario | null;
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
    current_model_comparison: value.current_model_comparison as EconomicsView["current_model_comparison"],
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

const operationsKey = (scope: CanonicalScope | null, analysisId: string | null, kind: string) =>
  ["economics-operations", scope?.workspaceId, analysisId, kind] as const;

export function useSavedEconomicsScenarios(scope: CanonicalScope | null, analysisId: string | null) {
  const client = useV1Client();
  return useQuery({
    queryKey: operationsKey(scope, analysisId, "scenarios"),
    enabled: Boolean(scope && analysisId),
    retry: false,
    queryFn: ({ signal }) => client.listEconomicsScenarios(
      analysisId as string,
      scope as CanonicalScope,
      { signal },
    ),
  });
}

export function useSaveEconomicsScenario(scope: CanonicalScope | null, analysisId: string | null) {
  const client = useV1Client();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; route_id: string; scale: EconomicsScenarioScale }) =>
      client.saveEconomicsScenario(analysisId as string, scope as CanonicalScope, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: operationsKey(scope, analysisId, "scenarios") }),
  });
}

export function useEconomicsReconciliations(scope: CanonicalScope | null, analysisId: string | null) {
  const client = useV1Client();
  return useQuery({
    queryKey: operationsKey(scope, analysisId, "reconciliations"),
    enabled: Boolean(scope && analysisId),
    retry: false,
    queryFn: ({ signal }) => client.listEconomicsReconciliations(
      analysisId as string,
      scope as CanonicalScope,
      { signal },
    ),
  });
}

export function useSaveEconomicsReconciliation(scope: CanonicalScope | null, analysisId: string | null) {
  const client = useV1Client();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      source_kind: "invoice" | "billing_export" | "manual";
      currency: string;
      observed_total_cost: number;
      source_reference?: string;
    }) => client.saveEconomicsReconciliation(analysisId as string, scope as CanonicalScope, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: operationsKey(scope, analysisId, "reconciliations") }),
  });
}
