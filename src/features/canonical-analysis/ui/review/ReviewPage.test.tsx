import axe from "axe-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ReviewPage } from "./ReviewPage";

let currentClient: Record<string, ReturnType<typeof vi.fn>>;
vi.mock("@/shell/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("../../data/client", () => ({ useV1Client: () => currentClient }));
vi.mock("../scope", () => ({
  useCanonicalScope: () => ({ workspaceId: "ws-1" }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/analyses/an-1/review"]}>
          <Routes>
            <Route
              path="/analyses/:analysisId/review"
              element={<ReviewPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

describe("Sentinela Review", () => {
  beforeEach(() => {
    window.localStorage.setItem("sentinela:language", "pt");
    currentClient = {
      getStatus: vi.fn(async () => ({
        analysis_id: "an-1",
        status: "completed",
        result_available: true,
      })),
      requestReview: vi.fn(async () => ({
        review_request_id: "request-1",
        status: "queued",
      })),
      getReview: vi.fn(async () => ({
        analysis_id: "an-1",
        review_id: "rev-1",
        version: 1,
        status: "completed",
        language: "pt",
        executive_summary:
          "A operação é estável, mas o comportamento exige correção.",
        what_matters_most: ["O problema se concentra em contestação."],
        strengths: ["A consistência foi preservada."],
        critical_findings: ["O comportamento está abaixo do esperado."],
        investigations: [
          {
            investigation_id: "i-1",
            title: "Sinais combinados",
            summary: "Drift e behavior se reforçam.",
            signal_refs: ["ev-1"],
            claim_refs: ["c-1"],
          },
        ],
        contradictions: ["Consistente, porém desalinhada."],
        business_impact: ["Risco de transferência evitável."],
        recommendations: ["Revisar contestação."],
        blind_spots: [
          "Sem Outcome Coverage não é possível afirmar impacto em conversão.",
        ],
        claims: [
          {
            claim_id: "c-1",
            kind: "fact",
            statement: "Behavior Score é 38.",
            confidence: 0.92,
            evidence_refs: ["ev-1"],
            metric_refs: ["behavior_score"],
            intent_refs: [],
            issue_refs: [],
            context_refs: [],
            verification_status: "verified",
          },
        ],
        evidence: [
          {
            evidence_id: "ev-1",
            source: "argos",
            pointer: "/indicators/behavior",
            label: "Behavior Score",
            excerpt: "38",
            digest: "a".repeat(64),
          },
        ],
      })),
    };
  });

  it("separa veredito, contradições, limites e evidência rastreável", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: /A operação é estável/ }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Contradições" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "O que está funcionando" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Onde a operação está falhando" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "O que o Sentinela não pode concluir",
      }),
    ).toBeVisible();
    await userEvent.click(screen.getByText("Ver evidências e origem"));
    expect(screen.getByText("Behavior Score")).toBeVisible();
    expect(screen.getByText(/\/indicators\/behavior/)).toBeVisible();
  });

  it("não introduz violações automáticas de acessibilidade", async () => {
    const { container } = renderPage();
    await screen.findByRole("heading", { name: /A operação é estável/ });
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it("permite reprocessar somente o Review quando o artefato é parcial", async () => {
    currentClient.getReview = vi.fn(async () => ({
      analysis_id: "an-1",
      review_id: "rev-partial",
      version: 1,
      status: "partial",
      blind_spots: ["O modelo local não concluiu a síntese."],
      evidence: [],
    }));

    renderPage();
    await userEvent.click(
      await screen.findByRole("button", { name: "Tentar de novo" }),
    );

    expect(currentClient.requestReview).toHaveBeenCalledTimes(1);
    expect(currentClient.requestReview).toHaveBeenCalledWith(
      "an-1",
      { workspaceId: "ws-1" },
      "pt",
    );
  });
});
