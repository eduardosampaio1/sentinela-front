import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { AnalyticsQueryInput, AnalyticsQueryResultView } from "@/lib/v1";
import { SavedAnalyticsViews } from "./SavedAnalyticsViews";

const save = vi.fn();
const refetch = vi.fn();
const frozenResult = {
  result_contract_version: "analytics-query-result-v1",
  query_contract_version: "analytics-query-v1",
  analysis_id: "analysis-1",
  projection_digest: "a".repeat(64),
  results: [],
} as AnalyticsQueryResultView;

vi.mock("../../data/analysis", () => ({
  useSavedAnalyticsViews: () => ({
    data: {
      view_contract_version: "analytics-saved-view-list-v1",
      views: [
        {
          view_contract_version: "analytics-saved-view-v1",
          view_id: "view-1",
          analysis_id: "analysis-1",
          name: "Volume diário",
          created_by: "user-1",
          projection_digest: "a".repeat(64),
          query: {},
          result: frozenResult,
          created_at: "2026-09-02T00:00:00Z",
        },
      ],
    },
    isLoading: false,
    refetch,
  }),
  useSaveAnalyticsView: () => ({ mutateAsync: save, isPending: false, isError: false }),
  useExportAnalyticsView: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const query = {
  query_contract_version: "analytics-query-v1",
  projection_digest: "a".repeat(64),
  metric_ids: ["dataset.record_count"],
  granularity: "auto",
  filters: [],
  order: [],
  limit: 100,
} as AnalyticsQueryInput;

it("saves the canonical query and opens the frozen result", async () => {
  save.mockResolvedValue({});
  refetch.mockResolvedValue({});
  const onOpen = vi.fn();
  render(
    <LanguageProvider>
      <SavedAnalyticsViews
        analysisId="analysis-1"
        scope={{ workspaceId: "workspace-1" }}
        currentQuery={query}
        onOpen={onOpen}
      />
    </LanguageProvider>,
  );

  fireEvent.change(screen.getByLabelText("View name"), {
    target: { value: "Minha visão" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save current view" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ name: "Minha visão", query }));
  expect(refetch).toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Open saved view" }));
  expect(onOpen).toHaveBeenCalledWith(frozenResult);
});
