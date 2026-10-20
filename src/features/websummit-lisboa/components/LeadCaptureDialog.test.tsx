import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeadCaptureDialog } from "./LeadCaptureDialog";

describe("Lisboa lead capture", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_WEBSUMMIT_API_URL", "https://leads.example.com");
    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.removeAttribute("open");
    });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("registers the offer on submit without a role field or checkbox", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetcher);
    render(<LeadCaptureDialog open onOpenChange={vi.fn()} />);
    expect(screen.queryByLabelText(/Role/)).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/By clicking/)).toHaveTextContent("Get my free analysis");
    expect(screen.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
    fireEvent.change(screen.getByLabelText("Work email *"), { target: { value: "person@company.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Get my free analysis" }));
    await screen.findByRole("heading", { name: "You're registered for your free analysis." });
    const payload = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(payload).toMatchObject({ email: "person@company.com", consent: true, source: "websummit_lisboa_2026" });
    expect(payload).not.toHaveProperty("role");
  });

  it("preserves visitor input when the lead API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unavailable")));
    render(<LeadCaptureDialog open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Work email *"), {
      target: { value: "person@company.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Get my free analysis" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong",
      ),
    );
    expect(screen.getByLabelText("Work email *")).toHaveValue(
      "person@company.com",
    );
  });
});
