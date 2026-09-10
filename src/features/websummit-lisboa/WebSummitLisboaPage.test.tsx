import axe from "axe-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { WebSummitLisboaPage } from "./WebSummitLisboaPage";

describe("Web Summit Lisboa experience", () => {
  beforeAll(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterAll(() => vi.unstubAllGlobals());

  it("has no structural accessibility violations in its initial state", async () => {
    const { container } = render(<WebSummitLisboaPage />);
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it("renders the Convergence experience with production navigation", () => {
    render(<WebSummitLisboaPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "AI shouldn't answer everything",
    );
    expect(screen.getByRole("link", { name: "SIGN IN" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("button", { name: /Meet Sentinela in Lisbon/i })).toBeInTheDocument();
  });

  it("allows the reality comparison to reach both complete states", () => {
    render(<WebSummitLisboaPage />);
    const slider = screen.getByRole("slider", {
      name: "Compare AI execution with and without Sentinela",
    });
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
    fireEvent.change(slider, { target: { value: "0" } });
    expect(slider).toHaveValue("0");
    fireEvent.change(slider, { target: { value: "100" } });
    expect(slider).toHaveValue("100");
    expect(slider).toHaveAttribute("aria-valuetext", "100% with Sentinela");
  });
});
