import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/pages/HomePage";

const listAnalysisRunsMock = vi.fn();
const getAnalysisRunByIdMock = vi.fn();

let authState: Record<string, unknown> = {};
let analysisState: Record<string, unknown> = {};

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/analysisRuns", () => ({
  listAnalysisRuns: (...args: unknown[]) => listAnalysisRunsMock(...args),
  getAnalysisRunById: (...args: unknown[]) => getAnalysisRunByIdMock(...args),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/contexts/AnalysisContext", () => ({
  useAnalysis: () => analysisState,
}));

function renderHome(initialPath = "/home") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/:projectsSlug/:workspaceSlug" element={<HomePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("home page onboarding flow", () => {
  beforeEach(() => {
    listAnalysisRunsMock.mockReset().mockResolvedValue([]);
    getAnalysisRunByIdMock.mockReset();

    authState = {
      workspace: { id: "ws-1", name: "Workspace 1", slug: "stl-ws-1" },
      workspaces: [{ id: "ws-1", name: "Workspace 1", slug: "stl-ws-1" }],
      workspaceLoading: false,
      createWorkspace: vi.fn(),
      signOut: vi.fn(),
      switchWorkspace: vi.fn(),
      user: { id: "u-1", email: "teste3@teste.com.br" },
    };

    analysisState = {
      analysisCompleted: false,
      historyResolved: true,
      loading: false,
      loadingMessage: "",
      loadingProgress: 0,
      result: null,
      handleFileUpload: vi.fn(),
      handlePasteAnalysis: vi.fn(),
      importAnalysisResult: vi.fn(),
      loadStoredAnalysis: vi.fn(),
    };
  });

  it("keeps dashboard disabled before first analysis", async () => {
    renderHome("/home");
    await waitFor(() => expect(listAnalysisRunsMock).toHaveBeenCalled());

    expect(screen.getByText("Sentinela Home")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quick Scan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create New Analysis" })).toBeInTheDocument();

    const openDashboard = screen.getByRole("button", { name: "Open Dashboard" });
    expect(openDashboard).toBeDisabled();
    expect(
      screen.getByText("Dashboard unlocks after your first completed analysis."),
    ).toBeInTheDocument();
  });

  it("opens dataset ingestion flow when create new analysis is clicked", async () => {
    renderHome("/home");
    await waitFor(() => expect(listAnalysisRunsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Create New Analysis" }));

    await waitFor(() => {
      expect(screen.getByText("Upload or paste your dataset")).toBeInTheDocument();
    });
  });
});
