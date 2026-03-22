import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SentinelaDashboard from "@/components/SentinelaDashboard";

const getInterpretationMock = vi.fn();
const interpretAnalysisMock = vi.fn();
const listAnalysisRunsMock = vi.fn();

let authState: Record<string, unknown> = {};
let analysisState: Record<string, unknown> = {};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/contexts/AnalysisContext", () => ({
  useAnalysis: () => analysisState,
}));

vi.mock("@/lib/api", () => ({
  getInterpretation: (...args: unknown[]) => getInterpretationMock(...args),
  interpretAnalysis: (...args: unknown[]) => interpretAnalysisMock(...args),
}));

vi.mock("@/lib/analysisRuns", () => ({
  listAnalysisRuns: (...args: unknown[]) => listAnalysisRunsMock(...args),
}));

vi.mock("@/lib/analysisReportPdf", () => ({
  downloadAnalysisReportPdf: vi.fn(),
}));

vi.mock("@/lib/dashboardModel", () => ({
  detectedProblems: () => [],
  healthHeaderModel: () => ({
    aiHealthScore: 72,
    riskLevel: "Moderate Risk",
    confidence: 81,
    status: "High",
    summary: "System summary",
  }),
  interactionPanelModel: () => ({ title: "Interaction Panel" }),
  recommendedActions: () => [],
  riskOverviewModel: () => ({
    riskLevel: "Moderate Risk",
    aiHealthScore: 72,
    confidence: 81,
    trend: "Stable",
    topRisks: [],
  }),
  stabilityTrendModel: () => ({
    trend: "Stable",
    regressionDetected: false,
    baselineAvailable: false,
    summary: "Trend summary",
    metrics: [],
  }),
}));

vi.mock("@/lib/decisionLayerModel", () => ({
  buildDecisionLayerModel: () => ({
    verdict: { label: "Verdict" },
    hero: { headline: "Decision headline" },
    coreMetrics: [],
  }),
  buildInterpretationPanelModel: (interpretation: Record<string, unknown> | null) => ({
    summary: typeof interpretation?.summary === "string" ? interpretation.summary : null,
    businessImpact:
      Array.isArray(interpretation?.business_implications) &&
      typeof interpretation.business_implications[0] === "string"
        ? interpretation.business_implications[0]
        : null,
    riskProjection:
      Array.isArray(interpretation?.operational_risks) &&
      typeof interpretation.operational_risks[0] === "string"
        ? interpretation.operational_risks[0]
        : null,
  }),
  buildRecurrenceSummary: () => ({ items: [] }),
  buildSystemStatePanelModel: () => ({ enrichmentSuggestions: [] }),
  rankHotspotsByImpact: (items: unknown[]) => items,
}));

vi.mock("@/lib/economicsModel", () => ({
  buildEconomicsPanelModel: () => ({ hero: [], details: [] }),
}));

vi.mock("@/components/dashboard/AnalysisLoadingOverlay", () => ({
  default: () => null,
}));

vi.mock("@/components/dashboard-v2/ProblemsPanel", () => ({
  default: () => <div>Problems Panel</div>,
}));

vi.mock("@/components/dashboard-v2/RecommendationsPanel", () => ({
  default: () => <div>Recommendations Panel</div>,
}));

vi.mock("@/components/dashboard-v2/InteractionAnalysisPanel", () => ({
  default: () => <div>Interaction Panel</div>,
}));

vi.mock("@/components/dashboard-v2/RiskOverviewPanel", () => ({
  default: () => <div>Risk Overview Panel</div>,
}));

vi.mock("@/components/dashboard-v2/StabilityTrendPanel", () => ({
  default: () => <div>Stability Trend Panel</div>,
}));

vi.mock("@/components/dashboard-v2/SystemOverviewBlock", () => ({
  default: () => <div>System Overview Block</div>,
}));

vi.mock("@/components/dashboard-decision/VerdictStrip", () => ({
  default: () => <div>Verdict Strip</div>,
}));

vi.mock("@/components/dashboard-decision/TopRecommendationHero", () => ({
  default: () => <div>Top Recommendation Hero</div>,
}));

vi.mock("@/components/dashboard-decision/CoreMetricsRow", () => ({
  default: () => <div>Core Metrics Row</div>,
}));

vi.mock("@/components/dashboard-decision/WhySystemStatePanel", () => ({
  default: () => <div>System State Panel</div>,
}));

vi.mock("@/components/dashboard-decision/TechnicalDetailsPanel", () => ({
  default: () => <div>Technical Details Panel</div>,
}));

vi.mock("@/components/dashboard-decision/ImproveAnalysisPanel", () => ({
  default: () => <div>Improve Analysis Panel</div>,
}));

vi.mock("@/components/dashboard-decision/EconomicsPanel", () => ({
  default: () => <div>Economics Panel</div>,
}));

describe("SentinelaDashboard interpretation flow", () => {
  beforeEach(() => {
    getInterpretationMock.mockReset();
    interpretAnalysisMock.mockReset();
    listAnalysisRunsMock.mockReset().mockResolvedValue([]);

    authState = {
      workspace: { id: "ws-1", name: "Workspace 1" },
      project: { id: "prj-1", name: "Project 1" },
      environment: { id: "env-1", name: "Production" },
    };

    analysisState = {
      result: {
        analysis_id: "analysis-001",
        analysis_run_id: "run-001",
      },
      loading: false,
      loadingMessage: "",
      loadingProgress: 0,
      handleRerun: vi.fn(),
    };
  });

  it("shows the interpretation immediately after generation and keeps economics mounted", async () => {
    getInterpretationMock
      .mockResolvedValueOnce({
        found: false,
        status: "not_requested",
      })
      .mockResolvedValue({
        found: true,
        status: "completed",
        analysis_run_id: "run-001",
        updated_at: "2026-03-21T12:00:00Z",
        report: {
          summary: "Interpretation summary",
          business_implications: ["Immediate business impact."],
          operational_risks: ["Projected operational risk."],
        },
      });

    interpretAnalysisMock.mockResolvedValue({
      cached: false,
      analysis_run_id: "run-001",
      model: "gemini-test-model",
      prompt_version: "v3-stabilized-interpretation",
      report: {
        summary: "Interpretation summary",
        business_implications: ["Immediate business impact."],
        operational_risks: ["Projected operational risk."],
      },
    });

    render(<SentinelaDashboard />);

    await waitFor(() => expect(getInterpretationMock).toHaveBeenCalled());
    expect(screen.getByText("Economics Panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate Interpretation" }));

    await waitFor(() => {
      expect(screen.getByText("Interpretation summary")).toBeInTheDocument();
    });

    expect(screen.getByText("Immediate business impact.")).toBeInTheDocument();
    expect(screen.getByText("Projected operational risk.")).toBeInTheDocument();
    expect(screen.getByText("Economics Panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Interpretation Locked" })).toBeDisabled();
  });
});
