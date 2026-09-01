import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExperienceResult } from "../experience/types";
import { DecisionReveal } from "./DecisionReveal";

const riskyResult: ExperienceResult = {
  answer: "A safe boundary is the correct response.",
  decision: {
    llmRequired: false,
    route: "controlled-response",
    risk: "high",
    rationale: "The request removes a required safeguard.",
    contextStrategy: "Retain minimum context",
  },
  trace: [
    { stage: "understand", label: "Understand", detail: "Read intent and risk.", status: "completed" },
    { stage: "decide", label: "Decide", detail: "Restrict the route.", status: "completed" },
    { stage: "control", label: "Control", detail: "Preserve the boundary.", status: "completed" },
    { stage: "respond", label: "Respond", detail: "Return a controlled answer.", status: "completed" },
  ],
  mode: "fallback",
  illustrative: true,
};

describe("DecisionReveal", () => {
  it("turns the actual decision into a post-answer visual explanation", () => {
    const { container } = render(<DecisionReveal result={riskyResult} />);

    expect(screen.getByRole("heading", { name: "One request. Four checks. One controlled route." })).toBeInTheDocument();
    expect(screen.getByText("RISK HIGH")).toBeInTheDocument();
    expect(screen.getByText("ROUTE CONTROLLED RESPONSE")).toBeInTheDocument();
    expect(container.querySelector(".ws-decision-field")).toHaveAttribute("data-risk", "high");
    expect(screen.getByLabelText("Decision replay: understand")).toBeInTheDocument();
  });
});
