import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { V1Client } from "@/lib/v1";
import { CanonicalClientProvider } from "../../data/client";
import { AskSentinela } from "./AskSentinela";

vi.mock("../scope", () => ({
  useCanonicalScope: () => ({ workspaceId: "workspace-1" }),
}));

function client(overrides: Record<string, unknown> = {}) {
  return {
    getReview: vi.fn(async () => ({
      analysis_id: "analysis-1",
      review_id: "review-1",
      version: 3,
      status: "completed",
      language: "pt",
    })),
    getAskConversation: vi.fn(async () => ({ analysis_id: "analysis-1", items: [] })),
    askAnalysis: vi.fn(async (_analysisId, _scope, input) => ({
      turn_id: "turn-1",
      analysis_id: "analysis-1",
      actor_id: "actor-1",
      source_review_id: "review-1",
      source_review_version: 3,
      question: input.question,
      created_at: "2026-09-02T12:00:00Z",
      answer: {
        ask_contract_version: "sentinela-ask-v1",
        answer_id: "answer-1",
        category: "explain_metric",
        status: "completed",
        fact: "O Behavior Score medido é 41.25.",
        evidence_summary: ["behavior_score: 41.25"],
        interpretation: "O sinal merece investigação.",
        limitation: "A causa não foi medida.",
        next_action: "Investigue os intents relacionados.",
        evidence: [],
        partial_reasons: [],
      },
    })),
    ...overrides,
  } as unknown as V1Client;
}

function renderAsk(api: V1Client) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <CanonicalClientProvider client={api}>
          <AskSentinela analysisId="analysis-1" />
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

describe("Ask Sentinela", () => {
  beforeEach(() => window.localStorage.setItem("sentinela:language", "pt"));

  it("abre como chat e envia pergunta presa à versão do Review", async () => {
    const api = client();
    renderAsk(api);
    await userEvent.click(screen.getByRole("button", { name: "Pergunte sobre esta análise" }));
    const composer = await screen.findByRole("textbox", { name: "Pergunte sobre esta análise..." });
    await userEvent.type(composer, "Explique o Behavior Score");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));

    await screen.findByText("O Behavior Score medido é 41.25.");
    expect(api.askAnalysis).toHaveBeenCalledWith(
      "analysis-1",
      { workspaceId: "workspace-1" },
      expect.objectContaining({
        source_review_id: "review-1",
        source_review_version: 3,
        question: "Explique o Behavior Score",
        language: "pt",
      }),
    );
  });

  it("preserva a pergunta quando a API falha", async () => {
    const api = client({ askAnalysis: vi.fn(async () => Promise.reject(new Error("offline"))) });
    renderAsk(api);
    await userEvent.click(screen.getByRole("button", { name: "Pergunte sobre esta análise" }));
    const composer = await screen.findByRole("textbox", { name: "Pergunte sobre esta análise..." });
    await userEvent.type(composer, "Onde está o problema?");
    await userEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));

    await waitFor(() => expect(composer).toHaveValue("Onde está o problema?"));
    expect(screen.getByRole("alert")).toHaveTextContent("Sua pergunta foi preservada");
  });

  it("mantém o chat navegável e semanticamente acessível", async () => {
    renderAsk(client());
    await userEvent.click(screen.getByRole("button", { name: "Pergunte sobre esta análise" }));
    await screen.findByRole("textbox", { name: "Pergunte sobre esta análise..." });

    const result = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
