import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/pages/HomePage";

const listAnalysisRunsMock = vi.fn();
const getAnalysisRunByIdMock = vi.fn();
const hasUserAnalysisRunsMock = vi.fn();
const listWorkspaceProjectsMock = vi.fn();
const listProjectEnvironmentsMock = vi.fn();

let authState: Record<string, unknown> = {};
let analysisState: Record<string, unknown> = {};

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/analysisRuns", () => ({
  listAnalysisRuns: (...args: unknown[]) => listAnalysisRunsMock(...args),
  getAnalysisRunById: (...args: unknown[]) => getAnalysisRunByIdMock(...args),
  hasUserAnalysisRuns: (...args: unknown[]) => hasUserAnalysisRunsMock(...args),
}));

vi.mock("@/lib/systemRegistry", () => ({
  listWorkspaceProjects: (...args: unknown[]) => listWorkspaceProjectsMock(...args),
  listProjectEnvironments: (...args: unknown[]) => listProjectEnvironmentsMock(...args),
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
        <Route path="/home/deep" element={<div>Deep Analysis Setup</div>} />
        <Route path="/:projectsSlug/:workspaceSlug" element={<HomePage />} />
        <Route path="/dashboard" element={<div>Dashboard View</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("home page onboarding flow", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    listAnalysisRunsMock.mockReset().mockResolvedValue([]);
    getAnalysisRunByIdMock.mockReset();
    hasUserAnalysisRunsMock.mockReset().mockResolvedValue(true);
    listWorkspaceProjectsMock.mockReset().mockResolvedValue([{ id: "prj-1", name: "System 1" }]);
    listProjectEnvironmentsMock.mockReset().mockResolvedValue([{ id: "env-1", name: "Production" }]);

    authState = {
      workspace: { id: "ws-1", name: "Workspace 1", slug: "stl-ws-1" },
      workspaces: [{ id: "ws-1", name: "Workspace 1", slug: "stl-ws-1" }],
      project: { id: "prj-1", name: "System 1" },
      projects: [{ id: "prj-1", name: "System 1" }],
      environment: { id: "env-1", name: "Production" },
      environments: [{ id: "env-1", name: "Production" }],
      workspaceLoading: false,
      contextLoading: false,
      createWorkspace: vi.fn(),
      refreshContext: vi.fn(),
      createProject: vi.fn(),
      createEnvironment: vi.fn(),
      signOut: vi.fn(),
      switchWorkspace: vi.fn(),
      switchProject: vi.fn(),
      switchEnvironment: vi.fn(),
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

    expect(screen.getByText("Context Entry")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Quick Scan" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "New Analysis" }).length).toBeGreaterThan(0);

    const openDashboard = screen.getByRole("button", { name: "Open Dashboard" });
    expect(openDashboard).toBeDisabled();
    expect(
      screen.getByText("Complete your first analysis in this context to unlock dashboard and history insights."),
    ).toBeInTheDocument();
  });

  it("opens dataset ingestion flow when create new analysis is clicked", async () => {
    renderHome("/home");
    await waitFor(() => expect(listAnalysisRunsMock).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("button", { name: "New Analysis" })[0]);

    await waitFor(() => {
      expect(screen.getByText("Upload or paste your dataset")).toBeInTheDocument();
    });
  });

  it("shows operational home mode for returning users with history", async () => {
    analysisState = {
      ...analysisState,
      analysisCompleted: true,
      historyResolved: true,
    };
    listAnalysisRunsMock.mockResolvedValue([
      {
        id: "run-1",
        workspace_id: "ws-1",
        project_id: "prj-1",
        environment_id: "env-1",
        created_at: "2026-03-17T10:00:00Z",
        risk_level: "MEDIUM",
        n_conversations: 42,
        n_intents: 7,
        raw_result: { executive_summary: "Instability increased on billing flows." },
      },
    ]);

    renderHome("/home");
    await waitFor(() => expect(screen.getByText("Operational Entry")).toBeInTheDocument());
    expect(screen.getByText("Context Snapshot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Dashboard" })).toBeEnabled();
  });

  it("reloads recent runs after a fresh analysis result arrives", async () => {
    const view = renderHome("/home");
    await waitFor(() => expect(listAnalysisRunsMock).toHaveBeenCalledTimes(1));

    analysisState = {
      ...analysisState,
      analysisCompleted: true,
      result: {
        analysis_id: "analysis-new-001",
        analysis_run_id: "run-new-001",
      },
    };

    view.rerender(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/home/deep" element={<div>Deep Analysis Setup</div>} />
          <Route path="/:projectsSlug/:workspaceSlug" element={<HomePage />} />
          <Route path="/dashboard" element={<div>Dashboard View</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(listAnalysisRunsMock).toHaveBeenCalledTimes(2));
  });

  it("redirects to dashboard after a new pasted analysis completes", async () => {
    const handlePasteAnalysisMock = vi.fn();
    analysisState = {
      ...analysisState,
      handlePasteAnalysis: handlePasteAnalysisMock,
    };

    const view = renderHome("/home");
    await waitFor(() => expect(listAnalysisRunsMock).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("button", { name: "New Analysis" })[0]);

    await waitFor(() => {
      expect(screen.getByText("Paste JSON / JSONL / NDJSON")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value:
          '[{"conversation_id":"1","intent":"billing","user":"Need invoice","assistant":"Sure"},{"conversation_id":"2","intent":"billing","user":"Need invoice copy","assistant":"Sure"}]',
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Analyze pasted dataset" }));
    expect(handlePasteAnalysisMock).toHaveBeenCalledTimes(1);

    analysisState = {
      ...analysisState,
      loading: true,
    };

    view.rerender(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/home/deep" element={<div>Deep Analysis Setup</div>} />
          <Route path="/:projectsSlug/:workspaceSlug" element={<HomePage />} />
          <Route path="/dashboard" element={<div>Dashboard View</div>} />
        </Routes>
      </MemoryRouter>,
    );

    analysisState = {
      ...analysisState,
      result: {
        analysis_id: "analysis-fresh-002",
        analysis_run_id: "run-fresh-002",
      },
      analysisCompleted: true,
      loading: false,
    };

    view.rerender(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/home/deep" element={<div>Deep Analysis Setup</div>} />
          <Route path="/:projectsSlug/:workspaceSlug" element={<HomePage />} />
          <Route path="/dashboard" element={<div>Dashboard View</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard View")).toBeInTheDocument();
    });
  });
});
