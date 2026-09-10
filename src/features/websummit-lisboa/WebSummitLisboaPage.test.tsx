import axe from "axe-core";
import { render } from "@testing-library/react";
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
});
