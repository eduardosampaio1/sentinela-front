import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { CanonicalScope, LongitudinalComparisonView } from "@/lib/v1";
import { useV1Client } from "./client";

const IDLE_KEY = ["longitudinal-comparison", "idle"] as const;

export function useLongitudinalComparison(
  scope: CanonicalScope | null,
  baselineAnalysisId: string | null,
  currentAnalysisId: string | null,
  enabled = true,
): UseQueryResult<LongitudinalComparisonView> {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && baselineAnalysisId && currentAnalysisId
        ? [
            "longitudinal-comparison",
            scope.workspaceId,
            baselineAnalysisId,
            currentAnalysisId,
          ]
        : IDLE_KEY,
    enabled: Boolean(scope && baselineAnalysisId && currentAnalysisId) && enabled,
    queryFn: ({ signal }) =>
      client.getLongitudinalComparison(
        currentAnalysisId as string,
        baselineAnalysisId as string,
        scope as CanonicalScope,
        { signal },
      ),
  });
}
