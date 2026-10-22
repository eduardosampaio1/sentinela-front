import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { PublicExperiencePage } from "../public-experience/PublicExperiencePage";

describe("home lead capture", () => {
  beforeEach(() => {
    localStorage.setItem("sentinela.public.locale", "en");
    vi.stubEnv("VITE_WEBSUMMIT_API_URL", "https://api.test");
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    localStorage.clear();
  });
  const open = () => {
    render(<PublicExperiencePage />);
    fireEvent.click(
      screen.getByRole("button", { name: /Talk about AI Assessment/ }),
    );
  };
  it("validates required fields, saves all products and shows confirmation only after acceptance", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, confirmation: "queued" }),
      });
    vi.stubGlobal("fetch", fetch);
    open();
    fireEvent.click(
      screen.getByRole("button", { name: /Request a conversation/ }),
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen.getByText("Choose at least one product, or select all."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /^Work email/ }), {
      target: { value: " Ada@Company.com " },
    });
    fireEvent.click(screen.getByLabelText("All products"));
    fireEvent.click(
      screen.getByRole("button", { name: /Request a conversation/ }),
    );
    await screen.findByText("Your request is registered.");
    const data = JSON.parse(fetch.mock.calls[0][1].body);
    expect(data.email).toBe("ada@company.com");
    expect(data.products).toEqual([
      "ai_control",
      "ai_observability",
      "brand_radar",
    ]);
    expect(data.consent).toBe(true);
    expect(data.request_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(data.role).toBeUndefined();
  });
  it("preserves details and reuses the request id after an uncertain network failure", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, confirmation: "queued" }),
      });
    vi.stubGlobal("fetch", fetch);
    open();
    fireEvent.change(screen.getByRole("textbox", { name: /^Work email/ }), {
      target: { value: "person@company.com" },
    });
    fireEvent.click(screen.getByLabelText("AI Control"));
    fireEvent.click(
      screen.getByRole("button", { name: /Request a conversation/ }),
    );
    await screen.findByText(/We couldn't save your request/);
    expect(
      screen.queryByText("Your request is registered."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Work email/ })).toHaveValue(
      "person@company.com",
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Request a conversation/ }),
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetch.mock.calls[0][1].body).request_id).toBe(
      JSON.parse(fetch.mock.calls[1][1].body).request_id,
    );
    await screen.findByText("Your request is registered.");
  });
  it("preselects the product for a product-specific CTA", () => {
    render(<PublicExperiencePage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Talk about Brand Radar" }),
    );
    expect(screen.getByLabelText("Brand Radar")).toBeChecked();
    expect(screen.getByLabelText("AI Control")).not.toBeChecked();
  });
});

