import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AIInterpretationPanel from "@/components/dashboard-decision/AIInterpretationPanel";

describe("AIInterpretationPanel", () => {
  it("renders rich interpretation content and metadata when available", () => {
    render(
      <AIInterpretationPanel
        model={{
          summary: "Overall status: attention. The current run shows concentrated instability.",
          businessImpact: "Waste and handoff pressure can rise if billing remains unstable.",
          riskProjection: "Instability can spread into adjacent intents if left unresolved.",
        }}
        interpretation={{
          executive_diagnosis:
            "Overall status: attention. Template collapse and waste are concentrated in billing behavior. Operators should correct this before scaling traffic.",
          risk_level: "high",
          systemic_pattern: "The same unstable response pattern is repeating inside one high-volume intent.",
          main_risks: [
            {
              title: "Template collapse in billing",
              severity: "high",
              evidence: "Responses are collapsing into the same template despite different billing scenarios.",
              impact: "Increases waste, handoffs, and operator distrust.",
            },
          ],
          priority_actions: [
            {
              priority: 1,
              action: "Separate billing and refund templates",
              reason: "The current template is merging distinct intents into one unstable behavior.",
              expected_effect: "Reduce waste and stabilize response quality.",
            },
          ],
          strategic_recommendation: "Stabilize billing behavior before expanding traffic.",
          key_findings: ["Waste cost is concentrated in billing."],
          business_implications: ["Containment cost will continue to rise if this pattern persists."],
          confidence_notes: "The conclusion is well supported by explicit issue and economics signals.",
        }}
        loading={false}
        error=""
        generatedAt="2026-03-25T12:00:00Z"
        status="completed"
        canGenerate={false}
        isLocked={true}
        onGenerate={vi.fn()}
        llmModel="gemini-test-model"
        provider="google"
        promptVersion="v4-decision-cockpit-interpretation"
      />,
    );

    expect(screen.getByText("AI Interpretation")).toBeInTheDocument();
    expect(screen.getByText("gemini-test-model")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("v4-decision-cockpit-interpretation")).toBeInTheDocument();
    expect(screen.getByText("Template collapse in billing")).toBeInTheDocument();
    expect(screen.getByText("Separate billing and refund templates")).toBeInTheDocument();
    expect(screen.getByText("Stabilize billing behavior before expanding traffic.")).toBeInTheDocument();
  });

  it("shows a richer loading state while generation is in progress", () => {
    render(
      <AIInterpretationPanel
        model={{
          summary: null,
          businessImpact: null,
          riskProjection: null,
        }}
        interpretation={null}
        loading={true}
        error=""
        status="running"
        canGenerate={false}
        isLocked={false}
        onGenerate={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Reading scores, issues, economics, and business pressure to produce a deeper operator brief.",
      ),
    ).toBeInTheDocument();
  });
});
