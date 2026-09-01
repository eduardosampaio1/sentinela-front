import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  workspaceKeys,
  type CanonicalScope,
  type ContextDraftInput,
  type ReviewActionStatus,
} from "@/lib/v1";
import { useV1Client } from "./client";

const IDLE_KEY = ["canonical-analysis", "review", "idle"] as const;

export function useAnalysisContext(
  scope: CanonicalScope | null,
  analysisId: string | null,
) {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && analysisId
        ? workspaceKeys.context(scope.workspaceId, analysisId)
        : IDLE_KEY,
    enabled: Boolean(scope && analysisId),
    queryFn: ({ signal }) =>
      client.getAnalysisContext(analysisId as string, scope as CanonicalScope, {
        signal,
      }),
  });
}

export function useSaveAnalysisContext(
  scope: CanonicalScope | null,
  analysisId: string | null,
) {
  const client = useV1Client();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ContextDraftInput) =>
      client.putAnalysisContext(
        analysisId as string,
        scope as CanonicalScope,
        input,
      ),
    onSuccess: (context) => {
      if (scope && analysisId)
        queryClient.setQueryData(
          workspaceKeys.context(scope.workspaceId, analysisId),
          context,
        );
    },
  });
}

export function useSuggestAnalysisContext(
  scope: CanonicalScope | null,
  analysisId: string | null,
) {
  const client = useV1Client();
  return useMutation({
    mutationFn: () =>
      client.suggestAnalysisContext(
        analysisId as string,
        scope as CanonicalScope,
      ),
  });
}

export function useSealAnalysisContext(
  scope: CanonicalScope | null,
  analysisId: string | null,
) {
  const client = useV1Client();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      client.sealAnalysisContext(analysisId as string, scope as CanonicalScope),
    onSuccess: (context) => {
      if (context && scope && analysisId)
        queryClient.setQueryData(
          workspaceKeys.context(scope.workspaceId, analysisId),
          context,
        );
    },
  });
}

export function useAnalysisReview(
  scope: CanonicalScope | null,
  analysisId: string | null,
) {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && analysisId
        ? workspaceKeys.review(scope.workspaceId, analysisId)
        : IDLE_KEY,
    enabled: Boolean(scope && analysisId),
    queryFn: ({ signal }) =>
      client.getReview(analysisId as string, scope as CanonicalScope, {
        signal,
      }),
    refetchInterval: (query) =>
      ["queued", "investigating"].includes(query.state.data?.status ?? "")
        ? 2500
        : false,
  });
}

export function useRequestReview(
  scope: CanonicalScope | null,
  analysisId: string | null,
) {
  const client = useV1Client();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (language: "pt" | "en") =>
      client.requestReview(
        analysisId as string,
        scope as CanonicalScope,
        language,
      ),
    onSuccess: () => {
      if (scope && analysisId)
        void queryClient.invalidateQueries({
          queryKey: workspaceKeys.review(scope.workspaceId, analysisId),
        });
    },
  });
}

export function useReviewActions(
  scope: CanonicalScope | null,
  analysisId: string | null,
) {
  const client = useV1Client();
  return useQuery({
    queryKey:
      scope && analysisId
        ? workspaceKeys.reviewActions(scope.workspaceId, analysisId)
        : IDLE_KEY,
    enabled: Boolean(scope && analysisId),
    queryFn: ({ signal }) =>
      client.getReviewActions(analysisId as string, scope as CanonicalScope, { signal }),
  });
}

export function useAcceptReviewAction(
  scope: CanonicalScope | null,
  analysisId: string | null,
) {
  const client = useV1Client();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reviewId: string; actionId: string; assignee: string }) =>
      client.acceptReviewAction(analysisId as string, scope as CanonicalScope, {
        command_id: crypto.randomUUID(),
        source_review_id: input.reviewId,
        source_action_id: input.actionId,
        assignee: input.assignee,
      }),
    onSuccess: () => {
      if (scope && analysisId)
        void queryClient.invalidateQueries({
          queryKey: workspaceKeys.reviewActions(scope.workspaceId, analysisId),
        });
    },
  });
}

export function useTransitionReviewAction(
  scope: CanonicalScope | null,
  analysisId: string | null,
) {
  const client = useV1Client();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      actionRecordId: string;
      expectedVersion: number;
      targetStatus: ReviewActionStatus;
    }) =>
      client.transitionReviewAction(
        analysisId as string,
        input.actionRecordId,
        scope as CanonicalScope,
        {
          command_id: crypto.randomUUID(),
          expected_version: input.expectedVersion,
          target_status: input.targetStatus,
        },
      ),
    onSuccess: () => {
      if (scope && analysisId)
        void queryClient.invalidateQueries({
          queryKey: workspaceKeys.reviewActions(scope.workspaceId, analysisId),
        });
    },
  });
}
