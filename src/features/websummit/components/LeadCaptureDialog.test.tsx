import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadCaptureDialog } from "./LeadCaptureDialog";

describe("LeadCaptureDialog", () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
  });

  it("preserves entered values after an API failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<LeadCaptureDialog open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Work email *"), { target: { value: "person@company.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Request a meeting" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong"));
    expect(screen.getByLabelText("Work email *")).toHaveValue("person@company.com");
  });
});
