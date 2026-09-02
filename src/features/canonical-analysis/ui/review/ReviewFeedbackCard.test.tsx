import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ReviewFeedbackCard } from "./ReviewFeedbackCard";

function renderCard(
  onSubmit = vi.fn(),
  feedback?: Parameters<typeof ReviewFeedbackCard>[0]["feedback"],
) {
  render(
    <LanguageProvider>
      <ReviewFeedbackCard
        feedback={feedback}
        pending={false}
        failed={false}
        onSubmit={onSubmit}
      />
    </LanguageProvider>,
  );
  return onSubmit;
}

describe("ReviewFeedbackCard", () => {
  it("registra utilidade sem pedir texto adicional", async () => {
    const onSubmit = renderCard();
    await userEvent.click(screen.getByRole("button", { name: /Yes, it was useful/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      rating: "helpful",
      reason: "well_supported",
    });
  });

  it("pede um motivo antes de enviar crítica e mantém comentário opcional", async () => {
    const onSubmit = renderCard();
    await userEvent.click(screen.getByRole("button", { name: /needs improvement/i }));
    const send = screen.getByRole("button", { name: /Send feedback/i });
    expect(send).toBeDisabled();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /What should improve/i }),
      "missing_evidence",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: /Add context/i }),
      "Show the source more clearly.",
    );
    await userEvent.click(send);

    expect(onSubmit).toHaveBeenCalledWith({
      rating: "not_helpful",
      reason: "missing_evidence",
      comment: "Show the source more clearly.",
    });
  });

  it("explica que feedback não altera Review, evidência ou métricas", () => {
    renderCard(vi.fn(), {
      analysis_id: "analysis-1",
      rating: "helpful",
    });
    expect(screen.getByRole("status")).toHaveTextContent(/Feedback saved/i);
    expect(screen.getByText(/never changes this Review/i)).toBeVisible();
  });
});
